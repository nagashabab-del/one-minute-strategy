"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useMemo, useState, useSyncExternalStore } from "react";
import {
  BUNDLE_EXPORT_ACTIONS,
  BundleExportAction,
  buildReportDocxBlob,
  buildReportDocxFileName,
  buildReportFileName,
  buildReportPdfBlob,
  buildReportPdfFileName,
  buildReportText,
  createBundlePartialError,
  getBundleFailedActions,
  getReportExportErrorMessage,
  getReportExportPendingMessage,
  getReportExportSuccessMessage,
  getReportsSignature,
  ReportExportAction,
  ReportExportError,
  ReportExportStatus,
  StrategyReport,
  toReportExportError,
  readReportById,
  subscribeReportsChanges,
} from "../report-store";
import StrategyReadinessBanner, { useStrategyReadinessMode } from "../../_components/strategy-readiness-banner";
import { resolveReadinessBlockedHint } from "../../_lib/readiness-actions";
import { resolveQuickStartForReadiness } from "../../_lib/readiness-lock";

type ExportFeedback = {
  status: ReportExportStatus;
  text: string;
  action: ReportExportAction;
};
type ExportRetryTarget = { action: ReportExportAction; bundleFailedActions?: BundleExportAction[] };
type ExportActionOptions = { silent?: boolean; skipBusy?: boolean };
type ExportActionResult = { ok: true } | { ok: false; error: unknown };

export default function ReportDetailsPage() {
  const params = useParams<{ id: string | string[] }>();
  const readiness = useStrategyReadinessMode();
  const inGapMode = readiness.mode === "gap";
  const quickStart = resolveQuickStartForReadiness(readiness.mode);
  const quickActionBlockedHint = resolveReadinessBlockedHint(inGapMode);
  const reportId = useMemo(() => {
    if (Array.isArray(params.id)) return params.id[0] ?? "";
    return typeof params.id === "string" ? params.id : "";
  }, [params.id]);
  const reportsSignature = useSyncExternalStore(
    subscribeReportsChanges,
    getReportsSignature,
    () => "server"
  );
  const report = useMemo<StrategyReport | null>(
    () => (reportsSignature === "server" || !reportId ? null : readReportById(reportId)),
    [reportId, reportsSignature]
  );
  const [exportFeedback, setExportFeedback] = useState<ExportFeedback | null>(null);
  const [retryTarget, setRetryTarget] = useState<ExportRetryTarget | null>(null);
  const [isBundleExporting, setIsBundleExporting] = useState(false);
  const [busyAction, setBusyAction] = useState<ReportExportAction | null>(null);
  const hasBusyAction = busyAction !== null;

  if (reportsSignature === "server") {
    return (
      <main>
        <h1 className="oms-page-title" style={{ fontSize: 24 }}>
          جاري تحميل التقرير...
        </h1>
        <p className="oms-page-subtitle">نراجع البيانات المخزنة لهذا المشروع.</p>
      </main>
    );
  }

  if (!report) {
    return (
      <main>
        <h1 className="oms-page-title" style={{ fontSize: 24 }}>
          التقرير غير موجود
        </h1>
        <p className="oms-page-subtitle">
          لم يتم العثور على تقرير بهذا المعرّف{reportId ? ` (${reportId})` : ""}.
        </p>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <Link href="/app/reports" className="oms-btn oms-btn-ghost">
            رجوع إلى التقارير
          </Link>
          <Link href={quickStart.href} className="oms-btn oms-btn-primary">
            {quickStart.label}
          </Link>
        </div>
      </main>
    );
  }

  const markExportPending = (action: ReportExportAction) => {
    setRetryTarget(null);
    setExportFeedback({
      status: "pending",
      text: getReportExportPendingMessage(action),
      action,
    });
  };

  const markExportSuccess = (action: ReportExportAction, textOverride?: string) => {
    setRetryTarget(null);
    setExportFeedback({
      status: "success",
      text: textOverride ?? getReportExportSuccessMessage(action),
      action,
    });
    if (typeof window !== "undefined") {
      window.setTimeout(() => {
        setExportFeedback((current) =>
          current && current.status === "success" && current.action === action ? null : current
        );
      }, 2600);
    }
  };

  const markExportError = (action: ReportExportAction, error: unknown) => {
    const bundleFailedActions = action === "bundle" ? getBundleFailedActions(error) : undefined;
    setRetryTarget({ action, bundleFailedActions });
    setExportFeedback({
      status: "error",
      text: getReportExportErrorMessage(action, error),
      action,
    });
  };

  const isActionBusy = (action: ReportExportAction) => busyAction === action;

  const riskCount = report.risks.filter((line) => !line.startsWith("لا توجد")).length;
  const recommendationCount = report.recommendations.filter((line) => !line.startsWith("لا توجد")).length;
  const highlightsCount = report.advisorsHighlights.filter((line) => !line.startsWith("لا توجد")).length;
  const isFinancialReport = report.reportType === "financial" && Boolean(report.financial);
  const financial = isFinancialReport ? report.financial : null;
  const onExportTxt = ({ silent = false, skipBusy = false }: ExportActionOptions = {}): ExportActionResult => {
    if (!skipBusy && hasBusyAction) {
      return { ok: false, error: new ReportExportError("ACTION_BUSY", "Another export action is already in progress.") };
    }
    if (inGapMode) {
      return { ok: false, error: new ReportExportError("ACTION_BLOCKED", "Action blocked in gap mode.") };
    }
    if (!silent) {
      markExportPending("txt");
    }
    if (!skipBusy) setBusyAction("txt");
    try {
      triggerDownload(buildReportFileName(report), "text/plain;charset=utf-8", [buildReportText(report)]);
      if (!silent) {
        markExportSuccess("txt");
      }
      return { ok: true };
    } catch (error) {
      if (!silent) {
        markExportError("txt", error);
      }
      return { ok: false, error };
    } finally {
      if (!skipBusy) {
        window.setTimeout(() => {
          setBusyAction((current) => (current === "txt" ? null : current));
        }, 240);
      }
    }
  };
  const onCopyReport = async (
    { silent = false, skipBusy = false }: ExportActionOptions = {}
  ): Promise<ExportActionResult> => {
    if (inGapMode) {
      return { ok: false, error: new ReportExportError("ACTION_BLOCKED", "Action blocked in gap mode.") };
    }
    if (typeof window === "undefined") {
      return { ok: false, error: new ReportExportError("BROWSER_ONLY", "Copy is available in browser only.") };
    }
    if (!skipBusy && hasBusyAction) {
      return { ok: false, error: new ReportExportError("ACTION_BUSY", "Another export action is already in progress.") };
    }
    if (!silent) {
      markExportPending("copy");
    }
    if (!skipBusy) {
      setBusyAction("copy");
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
        markExportSuccess("copy");
      }
      return { ok: true };
    } catch (error) {
      const normalizedError = toReportExportError(error, "COPY_BLOCKED");
      if (!silent) {
        markExportError("copy", normalizedError);
      }
      return { ok: false, error: normalizedError };
    } finally {
      if (!skipBusy) {
        window.setTimeout(() => {
          setBusyAction((current) => (current === "copy" ? null : current));
        }, 240);
      }
    }
  };
  const onExportDoc = async (
    { silent = false, skipBusy = false }: ExportActionOptions = {}
  ): Promise<ExportActionResult> => {
    if (!skipBusy && hasBusyAction) {
      return { ok: false, error: new ReportExportError("ACTION_BUSY", "Another export action is already in progress.") };
    }
    if (inGapMode) {
      return { ok: false, error: new ReportExportError("ACTION_BLOCKED", "Action blocked in gap mode.") };
    }
    if (!silent) {
      markExportPending("docx");
    }
    if (!skipBusy) setBusyAction("docx");
    try {
      const blob = await buildReportDocxBlob(report);
      triggerBlobDownload(buildReportDocxFileName(report), blob);
      if (!silent) {
        markExportSuccess("docx");
      }
      return { ok: true };
    } catch (error) {
      if (!silent) {
        markExportError("docx", error);
      }
      return { ok: false, error };
    } finally {
      if (!skipBusy) {
        setBusyAction((current) => (current === "docx" ? null : current));
      }
    }
  };
  const onExportPdf = async (
    { silent = false, skipBusy = false }: ExportActionOptions = {}
  ): Promise<ExportActionResult> => {
    if (!skipBusy && hasBusyAction) {
      return { ok: false, error: new ReportExportError("ACTION_BUSY", "Another export action is already in progress.") };
    }
    if (inGapMode) {
      return { ok: false, error: new ReportExportError("ACTION_BLOCKED", "Action blocked in gap mode.") };
    }
    if (!silent) {
      markExportPending("pdf");
    }
    if (!skipBusy) setBusyAction("pdf");
    try {
      const blob = await buildReportPdfBlob(report);
      triggerBlobDownload(buildReportPdfFileName(report), blob);
      if (!silent) {
        markExportSuccess("pdf");
      }
      return { ok: true };
    } catch (error) {
      if (!silent) {
        markExportError("pdf", error);
      }
      return { ok: false, error };
    } finally {
      if (!skipBusy) {
        setBusyAction((current) => (current === "pdf" ? null : current));
      }
    }
  };
  const onExportBundle = async (retryActions?: BundleExportAction[]) => {
    if (inGapMode) return;
    if (isBundleExporting || hasBusyAction) return;

    const targetActions =
      retryActions && retryActions.length > 0
        ? BUNDLE_EXPORT_ACTIONS.filter((action) => retryActions.includes(action))
        : [...BUNDLE_EXPORT_ACTIONS];

    if (targetActions.length === 0) {
      markExportError("bundle", new ReportExportError("BUNDLE_RETRY_EMPTY", "No failed actions available for retry."));
      return;
    }

    markExportPending("bundle");
    setIsBundleExporting(true);
    const failedActions: Array<ReportExportAction> = [];

    for (let index = 0; index < targetActions.length; index += 1) {
      const action = targetActions[index];
      if (action === "txt") {
        const txtResult = onExportTxt({ silent: true, skipBusy: true });
        if (!txtResult.ok) failedActions.push("txt");
      } else if (action === "docx") {
        const docResult = await onExportDoc({ silent: true, skipBusy: true });
        if (!docResult.ok) failedActions.push("docx");
      } else if (action === "pdf") {
        const pdfResult = await onExportPdf({ silent: true, skipBusy: true });
        if (!pdfResult.ok) failedActions.push("pdf");
      }
      if (index < targetActions.length - 1) {
        await wait(120);
      }
    }

    setIsBundleExporting(false);
    if (failedActions.length === 0) {
      const successMessage =
        targetActions.length === BUNDLE_EXPORT_ACTIONS.length
          ? undefined
          : "تمت إعادة تصدير العناصر الفاشلة من الحزمة بنجاح.";
      markExportSuccess("bundle", successMessage);
      return;
    }
    markExportError("bundle", createBundlePartialError(failedActions));
  };

  const onRetryLastFailedExport = () => {
    if (!retryTarget) return;
    if (retryTarget.action === "txt") {
      onExportTxt();
      return;
    }
    if (retryTarget.action === "docx") {
      void onExportDoc();
      return;
    }
    if (retryTarget.action === "pdf") {
      void onExportPdf();
      return;
    }
    if (retryTarget.action === "bundle") {
      void onExportBundle(retryTarget.bundleFailedActions);
      return;
    }
    if (retryTarget.action === "copy") {
      void onCopyReport();
    }
  };

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
      <section className="report-head">
        <div className="report-head-actions">
          <Link href="/app/reports" className="oms-btn oms-btn-ghost">
            رجوع إلى قائمة التقارير
          </Link>
          <Link href={quickStart.href} className="oms-btn oms-btn-primary">
            {quickStart.label}
          </Link>
          <button
            type="button"
            className={`oms-btn oms-btn-ghost ${inGapMode ? "report-action-disabled" : ""}`}
            onClick={() => onExportTxt()}
            disabled={isBundleExporting || inGapMode || hasBusyAction}
            title={inGapMode ? quickActionBlockedHint : undefined}
          >
            {isActionBusy("txt") ? "جاري تصدير TXT..." : "تصدير نصي (.txt)"}
          </button>
          <button
            type="button"
            className={`oms-btn oms-btn-ghost ${inGapMode ? "report-action-disabled" : ""}`}
            onClick={() => void onExportDoc()}
            disabled={isBundleExporting || inGapMode || hasBusyAction}
            title={inGapMode ? quickActionBlockedHint : undefined}
          >
            {isActionBusy("docx") ? "جاري تصدير DOCX..." : "تصدير Word (.docx)"}
          </button>
          <button
            type="button"
            className={`oms-btn oms-btn-ghost ${inGapMode ? "report-action-disabled" : ""}`}
            onClick={() => void onExportPdf()}
            disabled={inGapMode || hasBusyAction || isBundleExporting}
            title={inGapMode ? quickActionBlockedHint : undefined}
          >
            {isActionBusy("pdf") ? "جاري تصدير PDF..." : "تصدير PDF"}
          </button>
          <button
            type="button"
            className={`oms-btn oms-btn-ghost ${inGapMode ? "report-action-disabled" : ""}`}
            onClick={() => void onExportBundle()}
            disabled={isBundleExporting || inGapMode || hasBusyAction}
            title={inGapMode ? quickActionBlockedHint : undefined}
          >
            {isBundleExporting ? "جاري تصدير الحزمة..." : "تصدير الحزمة"}
          </button>
          <button
            type="button"
            className={`oms-btn oms-btn-ghost ${inGapMode ? "report-action-disabled" : ""}`}
            onClick={() => void onCopyReport()}
            disabled={inGapMode || hasBusyAction || isBundleExporting}
            title={inGapMode ? quickActionBlockedHint : undefined}
          >
            {isActionBusy("copy") ? "جاري نسخ التقرير..." : "نسخ التقرير"}
          </button>
        </div>
        {inGapMode ? <div className="report-lock-note">{quickActionBlockedHint}</div> : null}
        {exportFeedback ? (
          <div className={`report-export-feedback state-${exportFeedback.status}`}>
            <span>{exportFeedback.text}</span>
            {exportFeedback.status === "error" && retryTarget ? (
              <button
                type="button"
                className="report-feedback-retry"
                onClick={() => void onRetryLastFailedExport()}
                disabled={isBundleExporting || hasBusyAction}
              >
                إعادة المحاولة
              </button>
            ) : null}
          </div>
        ) : null}
        <div className="report-nonprint">
          <StrategyReadinessBanner contextLabel="التقارير" />
        </div>

        <h1 className="oms-page-title" style={{ marginTop: 12 }}>
          {report.title}
        </h1>
        <p className="oms-page-subtitle">
          نوع التقرير: {report.reportType === "financial" ? "مالي" : "استراتيجي"} · تاريخ التحديث: {report.date}
        </p>

        <div className="report-overview">
          {financial ? (
            <>
              <article className="oms-kpi-card">
                <div className="oms-kpi-label">حالة التقرير</div>
                <div className={`report-status ${statusClass(report.status)}`}>{report.status}</div>
              </article>
              <article className="oms-kpi-card">
                <div className="oms-kpi-label">إجمالي المخطط</div>
                <div className="oms-kpi-value report-kpi-value">{formatCurrency(financial.kpis.plannedTotal)}</div>
              </article>
              <article className="oms-kpi-card">
                <div className="oms-kpi-label">إجمالي الالتزام</div>
                <div className="oms-kpi-value report-kpi-value">{formatCurrency(financial.kpis.committedTotal)}</div>
              </article>
              <article className="oms-kpi-card">
                <div className="oms-kpi-label">المتاح</div>
                <div className="oms-kpi-value report-kpi-value">
                  {formatSignedCurrency(financial.kpis.remainingAfterCommitment)}
                </div>
              </article>
              <article className="oms-kpi-card">
                <div className="oms-kpi-label">الانحراف</div>
                <div className="oms-kpi-value report-kpi-value">{formatPercent(financial.kpis.variancePct)}</div>
              </article>
              <article className="oms-kpi-card">
                <div className="oms-kpi-label">العهد المفتوحة</div>
                <div className="oms-kpi-value report-kpi-value">{financial.kpis.openAdvancesCount}</div>
              </article>
            </>
          ) : (
            <>
              <article className="oms-kpi-card">
                <div className="oms-kpi-label">حالة التقرير</div>
                <div className={`report-status ${statusClass(report.status)}`}>{report.status}</div>
              </article>
              <article className="oms-kpi-card">
                <div className="oms-kpi-label">ملاحظات المستشارين</div>
                <div className="oms-kpi-value report-kpi-value">{highlightsCount}</div>
              </article>
              <article className="oms-kpi-card">
                <div className="oms-kpi-label">المخاطر الفعلية</div>
                <div className="oms-kpi-value report-kpi-value">{riskCount}</div>
              </article>
              <article className="oms-kpi-card">
                <div className="oms-kpi-label">التوصيات</div>
                <div className="oms-kpi-value report-kpi-value">{recommendationCount}</div>
              </article>
            </>
          )}
        </div>
      </section>

      <section className="oms-panel report-decision">
        <h2 className="oms-section-title">القرار التنفيذي</h2>
        <p className="oms-text">{report.executiveDecision}</p>
      </section>

      {financial ? (
        <section className="oms-panel report-financial-board">
          <div className="report-risk-head">
            <h2 className="oms-section-title">لوحة المؤشرات المالية</h2>
            <span className="report-risk-badge">بنود فعالة: {financial.lines.length}</span>
          </div>

          <div className="financial-board-grid">
            <article className="financial-chart-card span-2">
              <h3 className="financial-chart-title">اتجاه المخطط مقابل الالتزام</h3>
              <FinancialTrendChart points={financial.trend} />
            </article>
            <article className="financial-chart-card">
              <h3 className="financial-chart-title">توزيع الالتزامات</h3>
              <FinancialDonutChart
                slices={financial.composition}
                centerLabel={formatCurrency(financial.kpis.committedTotal)}
              />
            </article>
            <article className="financial-chart-card span-2">
              <h3 className="financial-chart-title">أعلى البنود (مخطط/التزام)</h3>
              <FinancialBarsChart rows={financial.lines.slice(0, 6)} />
            </article>
            <article className="financial-chart-card">
              <h3 className="financial-chart-title">الربحية بعد الضريبة</h3>
              <div className="financial-profit-card">
                <div>
                  <span>مخطط</span>
                  <strong>{formatSignedCurrency(financial.kpis.plannedProfitAfterVat)}</strong>
                </div>
                <div>
                  <span>فعلي</span>
                  <strong>{formatSignedCurrency(financial.kpis.actualProfitAfterVat)}</strong>
                </div>
              </div>
            </article>
          </div>

          <div className="financial-lines-table-wrap">
            <table className="financial-lines-table">
              <thead>
                <tr>
                  <th>البند</th>
                  <th>المخطط</th>
                  <th>الالتزام</th>
                  <th>المتاح</th>
                  <th>الانحراف</th>
                </tr>
              </thead>
              <tbody>
                {financial.lines.slice(0, 10).map((line) => (
                  <tr key={line.id}>
                    <td>{line.title}</td>
                    <td>{formatCurrency(line.plannedWithVat)}</td>
                    <td>{formatCurrency(line.committed)}</td>
                    <td>{formatSignedCurrency(line.available)}</td>
                    <td>{formatPercent(line.variancePct)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

      {report.regulatoryCompliance ? (
        <section className="oms-panel">
          <div className="report-risk-head">
            <h2 className="oms-section-title">الالتزام التنظيمي</h2>
            <span className={`report-compliance-badge ${complianceClass(report.regulatoryCompliance.readiness)}`}>
              {report.regulatoryCompliance.readiness}
            </span>
          </div>
          <div className="oms-text">
            مكتمل {report.regulatoryCompliance.completedCount} من {report.regulatoryCompliance.requiredCount} مسار مطلوب.
          </div>
          {report.regulatoryCompliance.pendingPaths.length > 0 ? (
            <div className="oms-list-line">
              • مسارات مفتوحة: {report.regulatoryCompliance.pendingPaths.join("، ")}
            </div>
          ) : (
            <div className="oms-list-line">• لا توجد مسارات تنظيمية مفتوحة حاليًا.</div>
          )}
        </section>
      ) : null}

      <section className="report-sections">
        <section className="oms-panel" style={{ marginTop: 0 }}>
          <h2 className="oms-section-title">أبرز ملاحظات المستشارين</h2>
          {report.advisorsHighlights.map((line, idx) => (
            <div key={idx} className="oms-list-line">
              • {line}
            </div>
          ))}
        </section>

        <section className="oms-panel" style={{ marginTop: 0 }}>
          <h2 className="oms-section-title">التوصيات التنفيذية</h2>
          {report.recommendations.map((line, idx) => (
            <div key={idx} className="oms-list-line">
              • {line}
            </div>
          ))}
        </section>
      </section>

      <section className="oms-panel">
        <div className="report-risk-head">
          <h2 className="oms-section-title">المخاطر</h2>
          <span className="report-risk-badge">مخاطر مفتوحة: {riskCount}</span>
        </div>
        {report.risks.map((line, idx) => (
          <div key={idx} className="oms-list-line">
            • {line}
          </div>
        ))}
      </section>

      <style>{`
        .report-head-actions {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
        }

        .report-action-disabled {
          opacity: 0.58;
          cursor: not-allowed;
          border-color: rgba(244, 126, 126, 0.42) !important;
          color: #ffb3b3 !important;
        }

        .report-lock-note {
          margin-top: 6px;
          border-radius: 10px;
          border: 1px solid rgba(247, 106, 121, 0.54);
          background: rgba(70, 20, 33, 0.5);
          color: #ffbcc4;
          padding: 8px 10px;
          font-size: 12px;
          font-weight: 800;
        }

        .report-overview {
          margin-top: 12px;
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 10px;
        }

        .report-export-feedback {
          margin-top: 6px;
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

        .report-export-feedback.state-pending {
          border-color: rgba(130, 164, 255, 0.58);
          color: #bfd3ff;
          background: rgba(20, 34, 65, 0.52);
        }

        .report-export-feedback.state-success {
          border-color: rgba(88, 214, 165, 0.58);
          color: #78e3b9;
          background: rgba(14, 56, 45, 0.52);
        }

        .report-export-feedback.state-error {
          border-color: rgba(247, 106, 121, 0.58);
          color: #ffbcc4;
          background: rgba(70, 20, 33, 0.52);
        }

        .report-feedback-retry {
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

        .report-feedback-retry:disabled {
          opacity: 0.55;
          cursor: not-allowed;
        }

        .report-kpi-value {
          font-size: 24px;
        }

        .report-status {
          margin-top: 8px;
          min-height: 28px;
          border-radius: 999px;
          padding: 0 10px;
          border: 1px solid var(--oms-border-strong);
          font-size: 12px;
          font-weight: 800;
          display: inline-flex;
          align-items: center;
          width: fit-content;
        }

        .report-status.is-approved {
          border-color: rgba(88, 214, 165, 0.62);
          color: #78e3b9;
          background: rgba(14, 56, 45, 0.78);
        }

        .report-status.is-complete {
          border-color: rgba(130, 164, 255, 0.58);
          color: #bfd3ff;
          background: rgba(20, 34, 65, 0.72);
        }

        .report-status.is-draft {
          border-color: rgba(232, 182, 102, 0.58);
          color: #ffd996;
          background: rgba(66, 47, 20, 0.72);
        }

        .report-decision {
          background: linear-gradient(150deg, rgba(24,36,64,0.92), rgba(16,24,42,0.88));
        }

        .report-financial-board {
          background: linear-gradient(155deg, rgba(19, 33, 60, 0.92), rgba(9, 16, 30, 0.9));
        }

        .financial-board-grid {
          margin-top: 10px;
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 10px;
        }

        .financial-chart-card {
          border-radius: 12px;
          border: 1px solid rgba(128, 164, 230, 0.24);
          background: linear-gradient(170deg, rgba(12, 22, 42, 0.9), rgba(7, 14, 28, 0.82));
          padding: 10px;
          min-height: 188px;
        }

        .financial-chart-card.span-2 {
          grid-column: span 2;
        }

        .financial-chart-title {
          margin: 0 0 8px;
          color: #d6e8ff;
          font-size: 13px;
          font-weight: 900;
        }

        .financial-profit-card {
          margin-top: 10px;
          display: grid;
          gap: 8px;
        }

        .financial-profit-card div {
          border-radius: 10px;
          border: 1px solid rgba(122, 188, 255, 0.26);
          background: rgba(8, 18, 35, 0.76);
          padding: 8px 10px;
          display: grid;
          gap: 4px;
        }

        .financial-profit-card span {
          color: #8da7c9;
          font-size: 12px;
          font-weight: 700;
        }

        .financial-profit-card strong {
          color: #f2f7ff;
          font-size: 18px;
          font-weight: 900;
        }

        .financial-lines-table-wrap {
          margin-top: 10px;
          overflow: auto;
          border-radius: 10px;
          border: 1px solid rgba(128, 164, 230, 0.24);
        }

        .financial-lines-table {
          width: 100%;
          border-collapse: collapse;
          min-width: 620px;
        }

        .financial-lines-table th,
        .financial-lines-table td {
          border-bottom: 1px solid rgba(128, 164, 230, 0.2);
          padding: 8px 10px;
          text-align: right;
          white-space: nowrap;
        }

        .financial-lines-table th {
          color: #9fb4d5;
          font-size: 12px;
          font-weight: 800;
          background: rgba(16, 30, 58, 0.84);
        }

        .financial-lines-table td {
          color: #e8f1ff;
          font-size: 13px;
        }

        .financial-svg-wrap svg {
          width: 100%;
          height: 180px;
          display: block;
        }

        .financial-chart-legend {
          margin-top: 8px;
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
          color: #a9c0df;
          font-size: 12px;
          font-weight: 700;
        }

        .financial-chart-legend span {
          display: inline-flex;
          align-items: center;
          gap: 6px;
        }

        .financial-chart-legend i {
          display: inline-block;
          width: 10px;
          height: 10px;
          border-radius: 999px;
        }

        .financial-bars {
          display: grid;
          gap: 8px;
          margin-top: 8px;
        }

        .financial-bars-row {
          display: grid;
          gap: 4px;
        }

        .financial-bars-label {
          color: #bfd4f1;
          font-size: 12px;
          font-weight: 700;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .financial-bars-track {
          position: relative;
          min-height: 18px;
          border-radius: 999px;
          background: rgba(26, 44, 72, 0.74);
          overflow: hidden;
        }

        .financial-bars-planned,
        .financial-bars-committed {
          position: absolute;
          right: 0;
          top: 0;
          bottom: 0;
          border-radius: 999px;
        }

        .financial-bars-planned {
          background: linear-gradient(90deg, rgba(88, 138, 255, 0.82), rgba(120, 210, 255, 0.86));
          opacity: 0.86;
        }

        .financial-bars-committed {
          background: linear-gradient(90deg, rgba(68, 214, 170, 0.88), rgba(108, 239, 216, 0.92));
          mix-blend-mode: screen;
        }

        .financial-donut-wrap {
          display: grid;
          justify-items: center;
        }

        .financial-donut {
          width: 164px;
          height: 164px;
        }

        .financial-donut-center {
          margin-top: -96px;
          min-height: 84px;
          display: grid;
          place-items: center;
          color: #f3f8ff;
          font-size: 17px;
          font-weight: 900;
          text-align: center;
        }

        .report-sections {
          margin-top: 12px;
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 10px;
        }

        .report-risk-head {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
          flex-wrap: wrap;
        }

        .report-risk-badge {
          min-height: 24px;
          border-radius: 999px;
          padding: 0 9px;
          border: 1px solid rgba(232, 182, 102, 0.58);
          color: #ffd996;
          background: rgba(66, 47, 20, 0.72);
          display: inline-flex;
          align-items: center;
          font-size: 12px;
          font-weight: 800;
        }

        .report-compliance-badge {
          min-height: 24px;
          border-radius: 999px;
          padding: 0 9px;
          border: 1px solid var(--oms-border-strong);
          display: inline-flex;
          align-items: center;
          font-size: 12px;
          font-weight: 800;
          white-space: nowrap;
        }

        .report-compliance-badge.is-good {
          border-color: rgba(88, 214, 165, 0.62);
          color: #78e3b9;
          background: rgba(14, 56, 45, 0.78);
        }

        .report-compliance-badge.is-warning {
          border-color: rgba(232, 182, 102, 0.58);
          color: #ffd996;
          background: rgba(66, 47, 20, 0.72);
        }

        .report-compliance-badge.is-risk {
          border-color: rgba(247, 106, 121, 0.58);
          color: #ffbcc4;
          background: rgba(70, 20, 33, 0.74);
        }

        @media (max-width: 980px) {
          .report-overview {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }

          .report-sections {
            grid-template-columns: 1fr;
          }

          .financial-board-grid {
            grid-template-columns: 1fr;
          }

          .financial-chart-card.span-2 {
            grid-column: span 1;
          }
        }

        @media (max-width: 640px) {
          .report-head-actions {
            display: grid;
          }

          .report-overview {
            grid-template-columns: 1fr;
          }

          .financial-lines-table {
            min-width: 520px;
          }
        }

        @media print {
          @page {
            size: A4;
            margin: 14mm;
          }

          :global(body) {
            background: #fff !important;
            color: #111 !important;
          }

          .report-head-actions,
          .report-lock-note,
          .report-nonprint {
            display: none !important;
          }

          .oms-panel {
            border: 1px solid #d3d7de !important;
            background: #fff !important;
            box-shadow: none !important;
            break-inside: avoid;
            page-break-inside: avoid;
          }

          .report-overview {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }

          .report-status,
          .report-risk-badge,
          .report-compliance-badge {
            border-color: #9ea6b2 !important;
            color: #111 !important;
            background: #fff !important;
          }

          .oms-page-title,
          .oms-page-subtitle,
          .oms-text,
          .oms-list-line,
          .oms-section-title {
            color: #111 !important;
          }
        }
      `}</style>
    </main>
  );
}

function statusClass(status: StrategyReport["status"]) {
  if (status === "معتمد") return "is-approved";
  if (status === "مكتمل") return "is-complete";
  return "is-draft";
}

function FinancialTrendChart({ points }: { points: NonNullable<StrategyReport["financial"]>["trend"] }) {
  const chartWidth = 620;
  const chartHeight = 220;
  const padding = 24;
  const safePoints = points.length > 0 ? points : [{ label: "—", planned: 0, committed: 0 }];
  const maxValue = Math.max(
    1,
    ...safePoints.flatMap((point) => [point.planned, point.committed]).map((value) => Math.max(0, value))
  );
  const xStep = safePoints.length > 1 ? (chartWidth - padding * 2) / (safePoints.length - 1) : 0;
  const toY = (value: number) => chartHeight - padding - (Math.max(0, value) / maxValue) * (chartHeight - padding * 2);

  const plannedPath = safePoints
    .map((point, idx) => `${idx === 0 ? "M" : "L"} ${padding + idx * xStep} ${toY(point.planned)}`)
    .join(" ");
  const committedPath = safePoints
    .map((point, idx) => `${idx === 0 ? "M" : "L"} ${padding + idx * xStep} ${toY(point.committed)}`)
    .join(" ");

  return (
    <div className="financial-svg-wrap">
      <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} role="img" aria-label="اتجاه المخطط مقابل الالتزام">
        <rect x={0} y={0} width={chartWidth} height={chartHeight} fill="transparent" />
        {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
          const y = chartHeight - padding - ratio * (chartHeight - padding * 2);
          return <line key={ratio} x1={padding} y1={y} x2={chartWidth - padding} y2={y} stroke="rgba(119,154,219,.25)" />;
        })}
        <path d={plannedPath} fill="none" stroke="#7ec9ff" strokeWidth={3} strokeLinecap="round" />
        <path d={committedPath} fill="none" stroke="#6ed9ba" strokeWidth={3} strokeLinecap="round" />
      </svg>
      <div className="financial-chart-legend">
        <span><i style={{ background: "#7ec9ff" }} /> المخطط</span>
        <span><i style={{ background: "#6ed9ba" }} /> الالتزام</span>
      </div>
    </div>
  );
}

function FinancialBarsChart({ rows }: { rows: NonNullable<StrategyReport["financial"]>["lines"] }) {
  const source = rows.length ? rows : [];
  const max = Math.max(
    1,
    ...source.flatMap((row) => [Math.max(0, row.plannedWithVat), Math.max(0, row.committed)])
  );

  return (
    <div className="financial-bars">
      {source.map((row) => {
        const plannedPct = (Math.max(0, row.plannedWithVat) / max) * 100;
        const committedPct = (Math.max(0, row.committed) / max) * 100;
        return (
          <div key={row.id} className="financial-bars-row">
            <div className="financial-bars-label">{row.title}</div>
            <div className="financial-bars-track">
              <div className="financial-bars-planned" style={{ width: `${plannedPct}%` }} />
              <div className="financial-bars-committed" style={{ width: `${committedPct}%` }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function FinancialDonutChart({
  slices,
  centerLabel,
}: {
  slices: NonNullable<StrategyReport["financial"]>["composition"];
  centerLabel: string;
}) {
  const chartSize = 180;
  const radius = 62;
  const circumference = 2 * Math.PI * radius;
  const total = Math.max(1, slices.reduce((sum, slice) => sum + Math.max(0, slice.value), 0));
  const colors = ["#73c8ff", "#70e0b8", "#9cb6ff", "#b495ff"];
  const donutSegments = slices.reduce<{
    segments: Array<{ label: string; idx: number; dash: number; offset: number }>;
    offset: number;
  }>(
    (state, slice, idx) => {
      const value = Math.max(0, slice.value);
      const ratio = value / total;
      const dash = ratio * circumference;
      return {
        segments: [...state.segments, { label: slice.label, idx, dash, offset: state.offset }],
        offset: state.offset + dash,
      };
    },
    { segments: [], offset: 0 }
  ).segments;

  return (
    <div className="financial-donut-wrap">
      <svg viewBox={`0 0 ${chartSize} ${chartSize}`} className="financial-donut" role="img" aria-label="توزيع الالتزامات">
        <circle cx={chartSize / 2} cy={chartSize / 2} r={radius} fill="none" stroke="rgba(115, 162, 243, .22)" strokeWidth={18} />
        {donutSegments.map((segment) => (
            <circle
              key={segment.label}
              cx={chartSize / 2}
              cy={chartSize / 2}
              r={radius}
              fill="none"
              stroke={colors[segment.idx % colors.length]}
              strokeWidth={18}
              strokeDasharray={`${segment.dash} ${Math.max(circumference - segment.dash, 0)}`}
              strokeDashoffset={-segment.offset}
              transform={`rotate(-90 ${chartSize / 2} ${chartSize / 2})`}
              strokeLinecap="round"
            />
        ))}
      </svg>
      <div className="financial-donut-center">{centerLabel}</div>
      <div className="financial-chart-legend">
        {slices.map((slice, idx) => (
          <span key={slice.label}>
            <i style={{ background: colors[idx % colors.length] }} /> {slice.label}
          </span>
        ))}
      </div>
    </div>
  );
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("ar-SA", {
    style: "currency",
    currency: "SAR",
    maximumFractionDigits: 0,
  }).format(Math.max(0, Number.isFinite(value) ? value : 0));
}

function formatSignedCurrency(value: number) {
  const safe = Number.isFinite(value) ? value : 0;
  const sign = safe < 0 ? "-" : safe > 0 ? "+" : "";
  return `${sign}${formatCurrency(Math.abs(safe))}`;
}

function formatPercent(value: number | null) {
  if (value === null || !Number.isFinite(value)) return "—";
  return `${value.toFixed(1)}%`;
}

function complianceClass(readiness: NonNullable<StrategyReport["regulatoryCompliance"]>["readiness"]) {
  if (readiness === "جاهز") return "is-good";
  if (readiness === "جزئي") return "is-warning";
  return "is-risk";
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
