"use client";

import Link from "next/link";
import { useMemo, useState, useSyncExternalStore } from "react";
import {
  BUNDLE_EXPORT_ACTIONS,
  BundleExportAction,
  buildReportDocxBlob,
  buildReportDocxFileName,
  buildReportsCsv,
  buildReportsCsvFileName,
  buildReportFileName,
  buildReportPdfBlob,
  buildReportPdfFileName,
  buildReportText,
  createBundlePartialError,
  getBundleFailedActions,
  getBundleRetryButtonLabel,
  getReportExportErrorMessage,
  getReportExportPendingMessage,
  getReportExportSuccessMessage,
  getReportsSignature,
  ReportExportAction,
  ReportExportError,
  ReportExportStatus,
  StrategyReport,
  toReportExportError,
  readReports,
  subscribeReportsChanges,
} from "./report-store";
import StrategyReadinessBanner, { useStrategyReadinessMode } from "../_components/strategy-readiness-banner";
import { READINESS_LOCK_REASON, resolveQuickStartForReadiness } from "../_lib/readiness-lock";

type StatusFilter = "الكل" | StrategyReport["status"];
type SortOption = "الأحدث" | "الأقدم" | "الحالة";
type ExportFeedback = {
  status: ReportExportStatus;
  text: string;
  action: ReportExportAction;
  reportId?: string;
};
type ExportRetryTarget = { action: ReportExportAction; reportId?: string; bundleFailedActions?: BundleExportAction[] };
type ExportActionOptions = { silent?: boolean; skipBusy?: boolean };
type ExportActionResult = { ok: true } | { ok: false; error: unknown };
type ReportBusyActions = Record<string, ReportExportAction | undefined>;
type BundleBusyReports = Record<string, true | undefined>;

export default function ReportsPage() {
  const reportsSignature = useSyncExternalStore(
    subscribeReportsChanges,
    getReportsSignature,
    () => "server"
  );
  const reports = useMemo<StrategyReport[]>(
    () => (reportsSignature === "server" ? [] : readReports()),
    [reportsSignature]
  );
  const readiness = useStrategyReadinessMode();
  const inGapMode = readiness.mode === "gap";
  const quickStart = resolveQuickStartForReadiness(readiness.mode);
  const quickActionBlockedHint = READINESS_LOCK_REASON;
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("الكل");
  const [sortBy, setSortBy] = useState<SortOption>("الأحدث");
  const [exportFeedback, setExportFeedback] = useState<ExportFeedback | null>(null);
  const [retryTarget, setRetryTarget] = useState<ExportRetryTarget | null>(null);
  const [bundleBusyReports, setBundleBusyReports] = useState<BundleBusyReports>({});
  const [busyActionsByReport, setBusyActionsByReport] = useState<ReportBusyActions>({});
  const [isCsvExporting, setIsCsvExporting] = useState(false);

  const statusCounts = useMemo(
    () => ({
      total: reports.length,
      approved: reports.filter((item) => item.status === "معتمد").length,
      completed: reports.filter((item) => item.status === "مكتمل").length,
      draft: reports.filter((item) => item.status === "مسودة").length,
    }),
    [reports]
  );

  const filteredReports = useMemo(() => {
    const normalizedQuery = search.trim().toLowerCase();
    const byFilter = reports.filter((item) => {
      const matchesStatus = statusFilter === "الكل" || item.status === statusFilter;
      const matchesQuery =
        normalizedQuery.length === 0 ||
        item.title.toLowerCase().includes(normalizedQuery) ||
        item.executiveDecision.toLowerCase().includes(normalizedQuery) ||
        (item.reportType === "financial" ? "مالي".includes(normalizedQuery) : "استراتيجي".includes(normalizedQuery));
      return matchesStatus && matchesQuery;
    });

    return byFilter.sort((a, b) => {
      if (sortBy === "الأقدم") return a.date.localeCompare(b.date);
      if (sortBy === "الحالة") return statusRank(a.status) - statusRank(b.status);
      return b.date.localeCompare(a.date);
    });
  }, [reports, search, statusFilter, sortBy]);

  const markExportPending = (action: ReportExportAction, reportId?: string) => {
    setRetryTarget(null);
    setExportFeedback({
      status: "pending",
      text: getReportExportPendingMessage(action),
      action,
      reportId,
    });
  };

  const markExportSuccess = (action: ReportExportAction, reportId?: string, textOverride?: string) => {
    setRetryTarget(null);
    setExportFeedback({
      status: "success",
      text: textOverride ?? getReportExportSuccessMessage(action),
      action,
      reportId,
    });
    if (typeof window !== "undefined") {
      window.setTimeout(() => {
        setExportFeedback((current) =>
          current && current.status === "success" && current.action === action && current.reportId === reportId
            ? null
            : current
        );
      }, 2600);
    }
  };

  const markExportError = (action: ReportExportAction, error: unknown, reportId?: string) => {
    const bundleFailedActions = action === "bundle" ? getBundleFailedActions(error) : undefined;
    setRetryTarget({ action, reportId, bundleFailedActions });
    setExportFeedback({
      status: "error",
      text: getReportExportErrorMessage(action, error),
      action,
      reportId,
    });
  };

  const isReportActionBusy = (reportId: string, action: ReportExportAction) => busyActionsByReport[reportId] === action;
  const isReportBusy = (reportId: string) => Boolean(busyActionsByReport[reportId]);
  const isBundleBusy = (reportId: string) => Boolean(bundleBusyReports[reportId]);

  const setReportBusyAction = (reportId: string, action: ReportExportAction) => {
    setBusyActionsByReport((current) => ({ ...current, [reportId]: action }));
  };

  const clearReportBusyAction = (reportId: string, action: ReportExportAction) => {
    setBusyActionsByReport((current) => {
      if (current[reportId] !== action) return current;
      const next = { ...current };
      delete next[reportId];
      return next;
    });
  };

  const markReportBundleBusy = (reportId: string) => {
    setBundleBusyReports((current) => ({ ...current, [reportId]: true }));
  };

  const clearReportBundleBusy = (reportId: string) => {
    setBundleBusyReports((current) => {
      if (!current[reportId]) return current;
      const next = { ...current };
      delete next[reportId];
      return next;
    });
  };

  const onExportReportTxt = (
    report: StrategyReport,
    { silent = false, skipBusy = false }: ExportActionOptions = {}
  ): ExportActionResult => {
    if (!skipBusy && isReportBusy(report.id)) {
      return { ok: false, error: new ReportExportError("ACTION_BUSY", "Another export action is already in progress.") };
    }
    if (!silent) {
      markExportPending("txt", report.id);
    }
    if (!skipBusy) {
      setReportBusyAction(report.id, "txt");
    }
    try {
      triggerDownload(buildReportFileName(report), "text/plain;charset=utf-8", [buildReportText(report)]);
      if (!silent) {
        markExportSuccess("txt", report.id);
      }
      return { ok: true };
    } catch (error) {
      if (!silent) {
        markExportError("txt", error, report.id);
      }
      return { ok: false, error };
    } finally {
      if (!skipBusy) {
        window.setTimeout(() => {
          clearReportBusyAction(report.id, "txt");
        }, 240);
      }
    }
  };

  const onExportReportDoc = async (
    report: StrategyReport,
    { silent = false, skipBusy = false }: ExportActionOptions = {}
  ): Promise<ExportActionResult> => {
    if (!skipBusy && isReportBusy(report.id)) {
      return { ok: false, error: new ReportExportError("ACTION_BUSY", "Another export action is already in progress.") };
    }
    if (typeof window === "undefined") {
      return { ok: false, error: new ReportExportError("BROWSER_ONLY", "Export is available in browser only.") };
    }
    if (!silent) {
      markExportPending("docx", report.id);
    }
    if (!skipBusy) {
      setReportBusyAction(report.id, "docx");
    }
    try {
      const blob = await buildReportDocxBlob(report);
      triggerBlobDownload(buildReportDocxFileName(report), blob);
      if (!silent) {
        markExportSuccess("docx", report.id);
      }
      return { ok: true };
    } catch (error) {
      if (!silent) {
        markExportError("docx", error, report.id);
      }
      return { ok: false, error };
    } finally {
      if (!skipBusy) {
        clearReportBusyAction(report.id, "docx");
      }
    }
  };

  const onExportReportPdf = async (
    report: StrategyReport,
    { silent = false, skipBusy = false }: ExportActionOptions = {}
  ): Promise<ExportActionResult> => {
    if (!skipBusy && isReportBusy(report.id)) {
      return { ok: false, error: new ReportExportError("ACTION_BUSY", "Another export action is already in progress.") };
    }
    if (typeof window === "undefined") {
      return { ok: false, error: new ReportExportError("BROWSER_ONLY", "Export is available in browser only.") };
    }
    if (!silent) {
      markExportPending("pdf", report.id);
    }
    if (!skipBusy) {
      setReportBusyAction(report.id, "pdf");
    }
    try {
      const blob = await buildReportPdfBlob(report);
      triggerBlobDownload(buildReportPdfFileName(report), blob);
      if (!silent) {
        markExportSuccess("pdf", report.id);
      }
      return { ok: true };
    } catch (error) {
      if (!silent) {
        markExportError("pdf", error, report.id);
      }
      return { ok: false, error };
    } finally {
      if (!skipBusy) {
        clearReportBusyAction(report.id, "pdf");
      }
    }
  };

  const onCopyReport = async (
    report: StrategyReport,
    { silent = false, skipBusy = false }: ExportActionOptions = {}
  ): Promise<ExportActionResult> => {
    if (inGapMode) {
      return { ok: false, error: new ReportExportError("ACTION_BLOCKED", "Action blocked in gap mode.") };
    }
    if (typeof window === "undefined") {
      return { ok: false, error: new ReportExportError("BROWSER_ONLY", "Copy is available in browser only.") };
    }
    if (!skipBusy && isReportBusy(report.id)) {
      return { ok: false, error: new ReportExportError("ACTION_BUSY", "Another export action is already in progress.") };
    }
    if (!silent) {
      markExportPending("copy", report.id);
    }
    if (!skipBusy) {
      setReportBusyAction(report.id, "copy");
    }
    const text = buildReportText(report);
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        const textarea = document.createElement("textarea");
        textarea.value = text;
        textarea.setAttribute("readonly", "true");
        textarea.style.position = "fixed";
        textarea.style.opacity = "0";
        document.body.appendChild(textarea);
        textarea.focus();
        textarea.select();
        const didCopy = document.execCommand("copy");
        document.body.removeChild(textarea);
        if (!didCopy) {
          throw new ReportExportError("COPY_BLOCKED", "Fallback clipboard API failed.");
        }
      }
      if (!silent) {
        markExportSuccess("copy", report.id);
      }
      return { ok: true };
    } catch (error) {
      const normalizedError = toReportExportError(error, "COPY_BLOCKED");
      if (!silent) {
        markExportError("copy", normalizedError, report.id);
      }
      return { ok: false, error: normalizedError };
    } finally {
      if (!skipBusy) {
        window.setTimeout(() => {
          clearReportBusyAction(report.id, "copy");
        }, 240);
      }
    }
  };

  const onExportReportBundle = async (report: StrategyReport, retryActions?: BundleExportAction[]) => {
    if (isBundleBusy(report.id) || isReportBusy(report.id)) return;
    const targetActions =
      retryActions && retryActions.length > 0
        ? BUNDLE_EXPORT_ACTIONS.filter((action) => retryActions.includes(action))
        : [...BUNDLE_EXPORT_ACTIONS];

    if (targetActions.length === 0) {
      markExportError("bundle", new ReportExportError("BUNDLE_RETRY_EMPTY", "No failed actions available for retry."));
      return;
    }

    markExportPending("bundle", report.id);
    markReportBundleBusy(report.id);
    const failedActions: Array<ReportExportAction> = [];

    try {
      for (let index = 0; index < targetActions.length; index += 1) {
        const action = targetActions[index];
        if (action === "txt") {
          const txtResult = onExportReportTxt(report, { silent: true, skipBusy: true });
          if (!txtResult.ok) failedActions.push("txt");
        } else if (action === "docx") {
          const docResult = await onExportReportDoc(report, { silent: true, skipBusy: true });
          if (!docResult.ok) failedActions.push("docx");
        } else if (action === "pdf") {
          const pdfResult = await onExportReportPdf(report, { silent: true, skipBusy: true });
          if (!pdfResult.ok) failedActions.push("pdf");
        }
        if (index < targetActions.length - 1) {
          await wait(120);
        }
      }
    } catch (error) {
      markExportError("bundle", error, report.id);
      return;
    } finally {
      clearReportBundleBusy(report.id);
    }
    if (failedActions.length === 0) {
      const successMessage =
        targetActions.length === BUNDLE_EXPORT_ACTIONS.length
          ? undefined
          : "تمت إعادة تصدير العناصر الفاشلة من الحزمة بنجاح.";
      markExportSuccess("bundle", report.id, successMessage);
      return;
    }
    markExportError("bundle", createBundlePartialError(failedActions), report.id);
  };

  const onExportFilteredCsv = () => {
    if (isCsvExporting) return;
    if (filteredReports.length === 0) {
      markExportError("csv", new ReportExportError("CSV_EMPTY_FILTER", "No reports in current filter."));
      return;
    }
    markExportPending("csv");
    setIsCsvExporting(true);
    try {
      triggerDownload(buildReportsCsvFileName(), "text/csv;charset=utf-8", ["\ufeff", buildReportsCsv(filteredReports)]);
      markExportSuccess("csv");
    } catch (error) {
      markExportError("csv", error);
    } finally {
      setIsCsvExporting(false);
    }
  };

  const onRetryLastFailedExport = () => {
    if (!retryTarget) return;
    if (retryTarget.action === "csv") {
      onExportFilteredCsv();
      return;
    }
    const retryReport = reports.find((item) => item.id === retryTarget.reportId);
    if (!retryReport) {
      markExportError(
        retryTarget.action,
        new ReportExportError("REPORT_NOT_FOUND", "Report not found while retrying."),
        retryTarget.reportId
      );
      return;
    }

    if (retryTarget.action === "txt") {
      onExportReportTxt(retryReport);
      return;
    }
    if (retryTarget.action === "docx") {
      void onExportReportDoc(retryReport);
      return;
    }
    if (retryTarget.action === "pdf") {
      void onExportReportPdf(retryReport);
      return;
    }
    if (retryTarget.action === "bundle") {
      void onExportReportBundle(retryReport, retryTarget.bundleFailedActions);
      return;
    }
    if (retryTarget.action === "copy") {
      void onCopyReport(retryReport);
    }
  };

  const retryButtonLabel =
    retryTarget?.action === "bundle" ? getBundleRetryButtonLabel(retryTarget.bundleFailedActions ?? []) : "إعادة المحاولة";

  const isRetryActionBusy = (() => {
    if (!retryTarget) return false;
    if (retryTarget.action === "csv") return isCsvExporting;
    if (!retryTarget.reportId) return false;
    return isReportBusy(retryTarget.reportId) || isBundleBusy(retryTarget.reportId);
  })();

  const triggerDownload = (fileName: string, mimeType: string, payload: BlobPart[]) => {
    if (typeof window === "undefined") {
      throw new ReportExportError("BROWSER_ONLY", "Download is available in browser only.");
    }
    try {
      const blob = new Blob(payload, { type: mimeType });
      triggerBlobDownload(fileName, blob);
    } catch (error) {
      throw toReportExportError(error, "DOWNLOAD_FAILED");
    }
  };

  const triggerBlobDownload = (fileName: string, blob: Blob) => {
    if (typeof window === "undefined") {
      throw new ReportExportError("BROWSER_ONLY", "Download is available in browser only.");
    }
    let url: string | null = null;
    try {
      url = window.URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = fileName;
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
    } catch (error) {
      throw toReportExportError(error, "DOWNLOAD_FAILED");
    } finally {
      if (url) {
        window.URL.revokeObjectURL(url);
      }
    }
  };

  return (
    <main>
      <h1 className="oms-page-title">التقارير</h1>
      <p className="oms-page-subtitle">
        مساحة مراجعة واعتماد تقارير المشاريع مع فرز سريع حسب الحالة والوقت.
      </p>
      <StrategyReadinessBanner contextLabel="التقارير" />

      {reportsSignature === "server" ? (
        <section className="oms-panel">
          <h2 className="oms-section-title">جاري تحميل التقارير...</h2>
          <p className="oms-text">نقرأ آخر البيانات المحفوظة للمشاريع لعرض القائمة بدقة.</p>
        </section>
      ) : null}

      {reportsSignature !== "server" && reports.length === 0 ? (
        <div className="oms-panel">
          <div style={{ fontWeight: 900, fontSize: 18 }}>لا توجد تقارير حتى الآن</div>
          <p style={{ margin: "6px 0 0", color: "var(--oms-text-muted)" }}>
            ابدأ تحليل جديد وسيظهر التقرير هنا لاحقًا.
          </p>
          <Link href={quickStart.href} className="oms-btn oms-btn-primary" style={{ marginTop: 10 }}>
            {quickStart.label}
          </Link>
        </div>
      ) : reportsSignature !== "server" ? (
        <>
          <section className="oms-panel reports-toolbar">
            <div className="reports-toolbar-grid">
              <label className="reports-field">
                <span className="reports-field-label">بحث</span>
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="ابحث باسم المشروع أو القرار التنفيذي"
                  className="reports-input"
                />
              </label>

              <label className="reports-field">
                <span className="reports-field-label">الحالة</span>
                <select
                  value={statusFilter}
                  onChange={(event) => setStatusFilter(event.target.value as StatusFilter)}
                  className="reports-input"
                >
                  <option value="الكل">الكل</option>
                  <option value="معتمد">معتمد</option>
                  <option value="مكتمل">مكتمل</option>
                  <option value="مسودة">مسودة</option>
                </select>
              </label>

              <label className="reports-field">
                <span className="reports-field-label">الفرز</span>
                <select
                  value={sortBy}
                  onChange={(event) => setSortBy(event.target.value as SortOption)}
                  className="reports-input"
                >
                  <option value="الأحدث">الأحدث</option>
                  <option value="الأقدم">الأقدم</option>
                  <option value="الحالة">حسب الحالة</option>
                </select>
              </label>
            </div>

            <div className="reports-toolbar-actions">
              {inGapMode ? (
                <button
                  type="button"
                  className="oms-btn oms-btn-ghost reports-toolbar-export reports-action-disabled"
                  disabled
                  title={quickActionBlockedHint}
                >
                  تصدير CSV ({filteredReports.length})
                </button>
              ) : (
                <button
                  type="button"
                  className="oms-btn oms-btn-ghost reports-toolbar-export"
                  onClick={onExportFilteredCsv}
                  disabled={isCsvExporting}
                >
                  {isCsvExporting ? "جاري تصدير CSV..." : `تصدير CSV (${filteredReports.length})`}
                </button>
              )}
            </div>
            {exportFeedback ? (
              <div className={`reports-export-feedback state-${exportFeedback.status}`}>
                <span>{exportFeedback.text}</span>
                {exportFeedback.status === "error" && retryTarget ? (
                  <button
                    type="button"
                    className="reports-feedback-retry"
                    onClick={() => void onRetryLastFailedExport()}
                    disabled={isRetryActionBusy}
                  >
                    {retryButtonLabel}
                  </button>
                ) : null}
              </div>
            ) : null}

            <div className="reports-kpis">
              <div className="oms-kpi-card">
                <div className="oms-kpi-label">إجمالي التقارير</div>
                <div className="oms-kpi-value reports-kpi-value">{statusCounts.total}</div>
              </div>
              <div className="oms-kpi-card">
                <div className="oms-kpi-label">معتمدة</div>
                <div className="oms-kpi-value reports-kpi-value">{statusCounts.approved}</div>
              </div>
              <div className="oms-kpi-card">
                <div className="oms-kpi-label">مكتملة</div>
                <div className="oms-kpi-value reports-kpi-value">{statusCounts.completed}</div>
              </div>
              <div className="oms-kpi-card">
                <div className="oms-kpi-label">مسودات</div>
                <div className="oms-kpi-value reports-kpi-value">{statusCounts.draft}</div>
              </div>
            </div>
          </section>

          {filteredReports.length === 0 ? (
            <section className="oms-panel">
              <div style={{ fontWeight: 900, fontSize: 18 }}>لا توجد نتائج مطابقة</div>
              <p className="oms-text">غيّر الفلتر أو نص البحث لعرض تقارير أخرى.</p>
            </section>
          ) : (
            <div className="oms-list">
              {filteredReports.map((report) => (
                <article key={report.id} className="oms-panel reports-card">
                  <div className="reports-card-main">
                    <div className="reports-card-head">
                      <h2 className="reports-card-title">{report.title}</h2>
                      <div className="reports-card-badges">
                        <span className={`reports-type-badge type-${report.reportType}`}>
                          {report.reportType === "financial" ? "مالي" : "استراتيجي"}
                        </span>
                        <span className={`reports-status ${statusClass(report.status)}`}>{report.status}</span>
                      </div>
                    </div>
                    <div className="reports-card-meta">تاريخ التحديث: {report.date}</div>
                    <p className="reports-card-preview">{truncate(report.executiveDecision, 130)}</p>
                    {report.regulatoryCompliance ? (
                      <div className="reports-card-compliance">
                        <span className={`reports-compliance-badge ${complianceClass(report.regulatoryCompliance.readiness)}`}>
                          امتثال تنظيمي: {report.regulatoryCompliance.readiness}
                        </span>
                        <span className="reports-card-meta">
                          مكتمل {report.regulatoryCompliance.completedCount}/{report.regulatoryCompliance.requiredCount}
                        </span>
                      </div>
                    ) : null}
                  </div>
                  <div className="reports-card-actions">
                    {inGapMode ? (
                      <>
                        <button
                          type="button"
                          className="oms-btn oms-btn-primary reports-open-btn reports-action-disabled"
                          disabled
                          title={quickActionBlockedHint}
                        >
                          فتح التقرير
                        </button>
                        <div className="reports-actions-row">
                          <button
                            type="button"
                            className="oms-btn oms-btn-ghost reports-export-btn reports-action-disabled"
                            disabled
                            title={quickActionBlockedHint}
                          >
                            TXT
                          </button>
                          <button
                            type="button"
                            className="oms-btn oms-btn-ghost reports-export-btn reports-action-disabled"
                            disabled
                            title={quickActionBlockedHint}
                          >
                            DOCX
                          </button>
                          <button
                            type="button"
                            className="oms-btn oms-btn-ghost reports-export-btn reports-action-disabled"
                            disabled
                            title={quickActionBlockedHint}
                          >
                            PDF
                          </button>
                          <button
                            type="button"
                            className="oms-btn oms-btn-ghost reports-export-btn reports-action-disabled"
                            disabled
                            title={quickActionBlockedHint}
                          >
                            حزمة
                          </button>
                          <button
                            type="button"
                            className="oms-btn oms-btn-ghost reports-export-btn reports-action-disabled"
                            disabled
                            title={quickActionBlockedHint}
                          >
                            نسخ
                          </button>
                        </div>
                      </>
                    ) : (
                      <>
                        <Link href={`/app/reports/${report.id}`} className="oms-btn oms-btn-primary reports-open-btn">
                          فتح التقرير
                        </Link>
                        <div className="reports-actions-row">
                          {isBundleBusy(report.id) ? (
                            <div className="reports-bundle-loading">جاري تجهيز ملفات الحزمة...</div>
                          ) : null}
                          <button
                            type="button"
                            className="oms-btn oms-btn-ghost reports-export-btn"
                            onClick={() => onExportReportTxt(report)}
                            disabled={isBundleBusy(report.id) || isReportBusy(report.id)}
                          >
                            {isReportActionBusy(report.id, "txt") ? "جاري TXT" : "TXT"}
                          </button>
                          <button
                            type="button"
                            className="oms-btn oms-btn-ghost reports-export-btn"
                            onClick={() => void onExportReportDoc(report)}
                            disabled={isBundleBusy(report.id) || isReportBusy(report.id)}
                          >
                            {isReportActionBusy(report.id, "docx") ? "جاري DOCX" : "DOCX"}
                          </button>
                          <button
                            type="button"
                            className="oms-btn oms-btn-ghost reports-export-btn"
                            onClick={() => void onExportReportPdf(report)}
                            disabled={isBundleBusy(report.id) || isReportBusy(report.id)}
                          >
                            {isReportActionBusy(report.id, "pdf") ? "جاري PDF" : "PDF"}
                          </button>
                          <button
                            type="button"
                            className="oms-btn oms-btn-ghost reports-export-btn"
                            onClick={() => void onExportReportBundle(report)}
                            disabled={isBundleBusy(report.id) || isReportBusy(report.id)}
                          >
                            {isBundleBusy(report.id) ? "جاري الحزمة..." : "حزمة"}
                          </button>
                          <button
                            type="button"
                            className="oms-btn oms-btn-ghost reports-export-btn"
                            onClick={() => void onCopyReport(report)}
                            disabled={isBundleBusy(report.id) || isReportBusy(report.id)}
                          >
                            {isReportActionBusy(report.id, "copy") ? "جاري نسخ" : "نسخ"}
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                </article>
              ))}
            </div>
          )}

          <style>{`
            .reports-toolbar-grid {
              display: grid;
              grid-template-columns: 1.5fr repeat(2, minmax(180px, 0.7fr));
              gap: 10px;
            }

            .reports-field {
              display: grid;
              gap: 6px;
            }

            .reports-field-label {
              font-size: 12px;
              font-weight: 800;
              color: var(--oms-text-faint);
            }

            .reports-input {
              min-height: 40px;
              border-radius: var(--oms-radius-sm);
              border: 1px solid var(--oms-border-strong);
              background: rgba(8, 14, 26, 0.82);
              color: var(--oms-text);
              padding: 0 10px;
              font-size: 14px;
            }

            .reports-kpis {
              margin-top: 10px;
              display: grid;
              grid-template-columns: repeat(4, minmax(0, 1fr));
              gap: 10px;
            }

            .reports-toolbar-actions {
              margin-top: 10px;
              display: flex;
              justify-content: flex-start;
            }

            .reports-export-feedback {
              margin-top: 8px;
              border-radius: 10px;
              border: 1px solid var(--oms-border-strong);
              padding: 8px 10px;
              font-size: 12px;
              font-weight: 800;
              display: flex;
              align-items: center;
              justify-content: space-between;
              gap: 10px;
            }

            .reports-export-feedback.state-pending {
              border-color: rgba(130, 164, 255, 0.58);
              color: #bfd3ff;
              background: rgba(20, 34, 65, 0.52);
            }

            .reports-export-feedback.state-success {
              border-color: rgba(88, 214, 165, 0.58);
              color: #78e3b9;
              background: rgba(14, 56, 45, 0.52);
            }

            .reports-export-feedback.state-error {
              border-color: rgba(247, 106, 121, 0.58);
              color: #ffbcc4;
              background: rgba(70, 20, 33, 0.52);
            }

            .reports-feedback-retry {
              border: 1px solid rgba(247, 106, 121, 0.58);
              background: rgba(255, 255, 255, 0.08);
              color: #ffd8dd;
              border-radius: 8px;
              min-height: 30px;
              padding: 0 10px;
              font-size: 12px;
              font-weight: 800;
              cursor: pointer;
            }

            .reports-feedback-retry:disabled {
              opacity: 0.55;
              cursor: not-allowed;
            }

            .reports-toolbar-export {
              min-height: 38px;
              font-size: 12px;
              font-weight: 800;
            }

            .reports-kpi-value {
              font-size: 24px;
            }

            .reports-card {
              display: grid;
              grid-template-columns: minmax(0, 1fr) auto;
              gap: 12px;
              align-items: center;
            }

            .reports-card-main {
              min-width: 0;
            }

            .reports-card-head {
              display: flex;
              align-items: center;
              justify-content: space-between;
              gap: 8px;
              flex-wrap: wrap;
            }

            .reports-card-badges {
              display: inline-flex;
              align-items: center;
              gap: 6px;
              flex-wrap: wrap;
            }

            .reports-type-badge {
              min-height: 24px;
              border-radius: 999px;
              padding: 0 9px;
              border: 1px solid var(--oms-border-strong);
              font-size: 12px;
              font-weight: 800;
              display: inline-flex;
              align-items: center;
              white-space: nowrap;
            }

            .reports-type-badge.type-financial {
              border-color: rgba(108, 218, 255, 0.58);
              color: #ccf2ff;
              background: rgba(18, 54, 79, 0.72);
            }

            .reports-type-badge.type-strategy {
              border-color: rgba(184, 162, 255, 0.58);
              color: #e4d9ff;
              background: rgba(43, 28, 78, 0.72);
            }

            .reports-card-title {
              margin: 0;
              font-size: 18px;
              font-weight: 900;
            }

            .reports-status {
              min-height: 24px;
              border-radius: 999px;
              padding: 0 9px;
              border: 1px solid var(--oms-border-strong);
              font-size: 12px;
              font-weight: 800;
              display: inline-flex;
              align-items: center;
              white-space: nowrap;
            }

            .reports-status.is-approved {
              border-color: rgba(88, 214, 165, 0.62);
              color: #78e3b9;
              background: rgba(14, 56, 45, 0.78);
            }

            .reports-status.is-complete {
              border-color: rgba(130, 164, 255, 0.58);
              color: #bfd3ff;
              background: rgba(20, 34, 65, 0.72);
            }

            .reports-status.is-draft {
              border-color: rgba(232, 182, 102, 0.58);
              color: #ffd996;
              background: rgba(66, 47, 20, 0.72);
            }

            .reports-card-meta {
              margin-top: 6px;
              color: var(--oms-text-faint);
              font-size: 13px;
            }

            .reports-card-preview {
              margin: 8px 0 0;
              color: var(--oms-text-muted);
              line-height: 1.7;
            }

            .reports-card-actions {
              display: grid;
              gap: 8px;
              min-width: 150px;
            }

            .reports-actions-row {
              display: grid;
              grid-template-columns: repeat(5, minmax(0, 1fr));
              gap: 8px;
            }

            .reports-bundle-loading {
              grid-column: 1 / -1;
              border-radius: 8px;
              border: 1px solid rgba(130, 164, 255, 0.36);
              background: rgba(20, 34, 65, 0.52);
              color: #bfd3ff;
              font-size: 12px;
              font-weight: 700;
              padding: 6px 8px;
            }

            .reports-card-compliance {
              margin-top: 8px;
              display: flex;
              align-items: center;
              gap: 8px;
              flex-wrap: wrap;
            }

            .reports-compliance-badge {
              min-height: 24px;
              border-radius: 999px;
              padding: 0 9px;
              border: 1px solid var(--oms-border-strong);
              font-size: 12px;
              font-weight: 800;
              display: inline-flex;
              align-items: center;
              white-space: nowrap;
            }

            .reports-compliance-badge.is-good {
              border-color: rgba(88, 214, 165, 0.62);
              color: #78e3b9;
              background: rgba(14, 56, 45, 0.78);
            }

            .reports-compliance-badge.is-warning {
              border-color: rgba(232, 182, 102, 0.58);
              color: #ffd996;
              background: rgba(66, 47, 20, 0.72);
            }

            .reports-compliance-badge.is-risk {
              border-color: rgba(247, 106, 121, 0.58);
              color: #ffbcc4;
              background: rgba(70, 20, 33, 0.74);
            }

            .reports-open-btn {
              width: 100%;
              justify-content: center;
              white-space: nowrap;
            }

            .reports-export-btn {
              min-height: 38px;
              justify-content: center;
              font-size: 12px;
              font-weight: 800;
            }

            .reports-action-disabled {
              opacity: 0.58;
              cursor: not-allowed;
              border-color: rgba(244,126,126,0.42) !important;
              color: #ffb3b3 !important;
            }

            @media (max-width: 980px) {
              .reports-toolbar-grid {
                grid-template-columns: 1fr;
              }

              .reports-kpis {
                grid-template-columns: repeat(2, minmax(0, 1fr));
              }

              .reports-card {
                grid-template-columns: 1fr;
                gap: 10px;
              }

              .reports-card-actions {
                width: 100%;
              }

              .reports-open-btn {
                width: 100%;
                justify-content: center;
              }
            }
          `}</style>
        </>
      ) : null}
    </main>
  );
}

function truncate(text: string, maxChars: number) {
  const clean = text.trim();
  if (clean.length <= maxChars) return clean;
  return `${clean.slice(0, maxChars)}...`;
}

function statusClass(status: StrategyReport["status"]) {
  if (status === "معتمد") return "is-approved";
  if (status === "مكتمل") return "is-complete";
  return "is-draft";
}

function complianceClass(readiness: NonNullable<StrategyReport["regulatoryCompliance"]>["readiness"]) {
  if (readiness === "جاهز") return "is-good";
  if (readiness === "جزئي") return "is-warning";
  return "is-risk";
}

function statusRank(status: StrategyReport["status"]) {
  if (status === "معتمد") return 1;
  if (status === "مكتمل") return 2;
  return 3;
}

function wait(ms: number) {
  return new Promise<void>((resolve) => {
    if (typeof window === "undefined") {
      resolve();
      return;
    }
    window.setTimeout(resolve, ms);
  });
}
