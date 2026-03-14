"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
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
type ReportDetailsSectionKey =
  | "overview"
  | "decision"
  | "financial_board"
  | "financial_comparison"
  | "compliance"
  | "readiness"
  | "advisors"
  | "risks";

const DETAILS_SECTION_DEFAULTS: Record<ReportDetailsSectionKey, boolean> = {
  overview: true,
  decision: true,
  financial_board: true,
  financial_comparison: false,
  compliance: true,
  readiness: false,
  advisors: true,
  risks: true,
};

const DETAILS_SECTION_LABELS: Record<ReportDetailsSectionKey, string> = {
  overview: "نظرة عامة",
  decision: "القرار التنفيذي",
  financial_board: "لوحة المال",
  financial_comparison: "التحليل المالي",
  compliance: "الامتثال",
  readiness: "جاهزية القرار",
  advisors: "المستشارون",
  risks: "المخاطر",
};

const DETAILS_SECTION_ANCHORS: Record<ReportDetailsSectionKey, string> = {
  overview: "report-overview",
  decision: "report-decision",
  financial_board: "report-financial-board",
  financial_comparison: "report-financial-comparison",
  compliance: "report-compliance",
  readiness: "report-readiness",
  advisors: "report-advisors",
  risks: "report-risks",
};

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
  const [sectionsOpen, setSectionsOpen] = useState<Record<ReportDetailsSectionKey, boolean>>(DETAILS_SECTION_DEFAULTS);
  const [highlightedSection, setHighlightedSection] = useState<ReportDetailsSectionKey | null>(null);
  const sectionRefs = useRef<Record<ReportDetailsSectionKey, HTMLElement | null>>({
    overview: null,
    decision: null,
    financial_board: null,
    financial_comparison: null,
    compliance: null,
    readiness: null,
    advisors: null,
    risks: null,
  });
  const sectionFocusRefs = useRef<Record<ReportDetailsSectionKey, HTMLElement | null>>({
    overview: null,
    decision: null,
    financial_board: null,
    financial_comparison: null,
    compliance: null,
    readiness: null,
    advisors: null,
    risks: null,
  });
  const hasBusyAction = busyAction !== null;

  useEffect(() => {
    if (typeof window === "undefined" || !report) return;
    const section = resolveDetailsSectionFromHash(window.location.hash);
    if (!section) return;
    navigateToSection(section);
  }, [report]);

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
  const executiveSectionKeys = new Set([
    "بوابة اعتماد القرار النهائي",
    "جاهزية القرار النهائي",
    "مصفوفة القرار التنفيذي",
    "خطة أول 72 ساعة",
  ]);
  const executiveReadinessSections = (report.detailedSections ?? []).filter((section) =>
    executiveSectionKeys.has(section.title)
  );
  const isFinancialReport = report.reportType === "financial" && Boolean(report.financial);
  const financial = isFinancialReport ? report.financial : null;
  const financialComposition = financial
    ? (() => {
        const total = Math.max(1, financial.composition.reduce((sum, slice) => sum + Math.max(0, slice.value), 0));
        return financial.composition.map((slice) => {
          const safeValue = Math.max(0, slice.value);
          const pct = total > 0 ? (safeValue / total) * 100 : 0;
          return { label: slice.label, value: safeValue, pct };
        });
      })()
    : [];
  const financialTopVariance = financial
    ? [...financial.lines]
        .map((line) => ({
          id: line.id,
          title: line.title,
          variancePct: line.variancePct ?? 0,
          plannedWithVat: line.plannedWithVat,
          committed: line.committed,
        }))
        .sort((a, b) => Math.abs(b.variancePct) - Math.abs(a.variancePct))
        .slice(0, 5)
    : [];
  const financialTopCommitmentShare = financial
    ? [...financial.lines]
        .filter((line) => line.committed > 0)
        .sort((a, b) => b.committed - a.committed)
        .slice(0, 6)
        .map((line) => {
          const share = financial.kpis.committedTotal > 0 ? (line.committed / financial.kpis.committedTotal) * 100 : 0;
          return {
            id: line.id,
            title: line.title,
            committed: line.committed,
            share,
          };
        })
    : [];
  const profitGapAfterVat = financial
    ? financial.kpis.actualProfitAfterVat - financial.kpis.plannedProfitAfterVat
    : 0;
  const profitGapBeforeVat = financial
    ? financial.kpis.actualProfitBeforeVat - financial.kpis.plannedProfitBeforeVat
    : 0;
  const varianceLegendItems = [
    { key: "good", label: "منخفض", range: "≤ 5%" },
    { key: "warn", label: "متوسط", range: "> 5% إلى 15%" },
    { key: "risk", label: "مرتفع", range: "> 15%" },
  ] as const;
  const availableSectionKeys = [
    "overview",
    "decision",
    ...(financial ? (["financial_board", "financial_comparison"] as const) : []),
    ...(report.regulatoryCompliance ? (["compliance"] as const) : []),
    ...(executiveReadinessSections.length > 0 ? (["readiness"] as const) : []),
    "advisors",
    "risks",
  ] as ReportDetailsSectionKey[];
  const openSectionsCount = availableSectionKeys.filter((section) => sectionsOpen[section]).length;

  function setSectionRef(section: ReportDetailsSectionKey, node: HTMLElement | null) {
    sectionRefs.current[section] = node;
  }

  function setSectionFocusRef(section: ReportDetailsSectionKey, node: HTMLElement | null) {
    sectionFocusRefs.current[section] = node;
  }

  function navigateToSection(section: ReportDetailsSectionKey) {
    setSectionsOpen((prev) => ({ ...prev, [section]: true }));
    setHighlightedSection(section);
    if (typeof window === "undefined") return;

    const anchor = DETAILS_SECTION_ANCHORS[section];
    const { pathname, search } = window.location;
    window.history.replaceState(null, "", `${pathname}${search}#${anchor}`);

    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        const sectionNode = sectionRefs.current[section];
        if (sectionNode) {
          const offset = window.matchMedia("(max-width: 720px)").matches ? 112 : 148;
          const top = sectionNode.getBoundingClientRect().top + window.scrollY - offset;
          window.scrollTo({ top: Math.max(0, top), behavior: "smooth" });
        }
        const focusNode = sectionFocusRefs.current[section];
        if (focusNode) {
          window.setTimeout(() => {
            focusNode.focus({ preventScroll: true });
          }, 260);
        }
      });
    });

    window.setTimeout(() => {
      setHighlightedSection((current) => (current === section ? null : current));
    }, 1200);
  }

  const toggleSection = (section: ReportDetailsSectionKey) => {
    setSectionsOpen((prev) => ({ ...prev, [section]: !prev[section] }));
  };
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
      <section
        id={DETAILS_SECTION_ANCHORS.overview}
        ref={(node) => setSectionRef("overview", node)}
        className={`report-head ${highlightedSection === "overview" ? "report-panel-highlight" : ""}`}
      >
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

        <section className="report-hierarchy-shell">
          <div className="report-hierarchy-head">
            <div>
              <h2 className="oms-section-title">هرمية عرض تفاصيل التقرير</h2>
              <div className="report-hierarchy-meta">
                مفتوح الآن: {openSectionsCount}/{availableSectionKeys.length}
              </div>
            </div>
            <div className="report-hierarchy-actions">
              <button
                className="oms-btn oms-btn-ghost"
                type="button"
                onClick={() => {
                  const next = { ...sectionsOpen };
                  availableSectionKeys.forEach((key) => {
                    next[key] = true;
                  });
                  setSectionsOpen(next);
                }}
              >
                فتح كل التفاصيل
              </button>
              <button
                className="oms-btn oms-btn-ghost"
                type="button"
                onClick={() => {
                  const next = { ...sectionsOpen };
                  availableSectionKeys.forEach((key) => {
                    next[key] = false;
                  });
                  setSectionsOpen(next);
                }}
              >
                إغلاق كل التفاصيل
              </button>
              <button
                className="oms-btn oms-btn-ghost"
                type="button"
                onClick={() => setSectionsOpen(DETAILS_SECTION_DEFAULTS)}
              >
                الوضع الافتراضي
              </button>
            </div>
          </div>
          <div className="report-section-tabs">
            {availableSectionKeys.map((key) => (
              <button
                key={key}
                className={`report-section-tab ${sectionsOpen[key] ? "is-open" : ""}`}
                type="button"
                onClick={() => navigateToSection(key)}
              >
                {DETAILS_SECTION_LABELS[key]}
              </button>
            ))}
          </div>
        </section>

        <div className="report-section-head">
          <h2 className="oms-section-title">نظرة عامة على التقرير</h2>
          <button
            className="oms-btn oms-btn-ghost"
            type="button"
            ref={(node) => setSectionFocusRef("overview", node)}
            onClick={() => (sectionsOpen.overview ? toggleSection("overview") : navigateToSection("overview"))}
          >
            {sectionsOpen.overview ? "إخفاء" : "عرض"}
          </button>
        </div>
        {sectionsOpen.overview ? (
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
                  <div className={`oms-kpi-value report-kpi-value ${varianceToneClass(financial.kpis.variancePct)}`}>
                    {formatPercent(financial.kpis.variancePct)}
                  </div>
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
        ) : (
          <div className="workflow-empty">تم إخفاء النظرة العامة للتقرير.</div>
        )}
      </section>

      <section
        id={DETAILS_SECTION_ANCHORS.decision}
        ref={(node) => setSectionRef("decision", node)}
        className={`oms-panel report-decision ${highlightedSection === "decision" ? "report-panel-highlight" : ""}`}
      >
        <div className="report-section-head">
          <h2 className="oms-section-title">القرار التنفيذي</h2>
          <button
            className="oms-btn oms-btn-ghost"
            type="button"
            ref={(node) => setSectionFocusRef("decision", node)}
            onClick={() => (sectionsOpen.decision ? toggleSection("decision") : navigateToSection("decision"))}
          >
            {sectionsOpen.decision ? "إخفاء" : "عرض"}
          </button>
        </div>
        {sectionsOpen.decision ? (
          <p className="oms-text">{report.executiveDecision}</p>
        ) : (
          <div className="workflow-empty">تم إخفاء القرار التنفيذي.</div>
        )}
      </section>

      {financial ? (
        <section
          id={DETAILS_SECTION_ANCHORS.financial_board}
          ref={(node) => setSectionRef("financial_board", node)}
          className={`oms-panel report-financial-board ${
            highlightedSection === "financial_board" ? "report-panel-highlight" : ""
          }`}
        >
          <div className="report-section-head">
            <h2 className="oms-section-title">لوحة المؤشرات المالية</h2>
            <button
              className="oms-btn oms-btn-ghost"
              type="button"
              ref={(node) => setSectionFocusRef("financial_board", node)}
              onClick={() =>
                sectionsOpen.financial_board
                  ? toggleSection("financial_board")
                  : navigateToSection("financial_board")
              }
            >
              {sectionsOpen.financial_board ? "إخفاء" : "عرض"}
            </button>
          </div>
          {sectionsOpen.financial_board ? (
            <>
              <div className="report-risk-head">
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
                        <td className={varianceToneClass(line.variancePct)}>{formatPercent(line.variancePct)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          ) : (
            <div className="workflow-empty">تم إخفاء لوحة المؤشرات المالية.</div>
          )}
        </section>
      ) : null}

      {financial ? (
        <section
          id={DETAILS_SECTION_ANCHORS.financial_comparison}
          ref={(node) => setSectionRef("financial_comparison", node)}
          className={`oms-panel report-financial-comparison ${
            highlightedSection === "financial_comparison" ? "report-panel-highlight" : ""
          }`}
        >
          <div className="report-section-head">
            <h2 className="oms-section-title">التمثيل المالي المقارن</h2>
            <button
              className="oms-btn oms-btn-ghost"
              type="button"
              ref={(node) => setSectionFocusRef("financial_comparison", node)}
              onClick={() =>
                sectionsOpen.financial_comparison
                  ? toggleSection("financial_comparison")
                  : navigateToSection("financial_comparison")
              }
            >
              {sectionsOpen.financial_comparison ? "إخفاء" : "عرض"}
            </button>
          </div>
          {sectionsOpen.financial_comparison ? (
            <>
              <div className="report-risk-head">
                <span className="report-risk-badge">تحليل تفصيلي</span>
              </div>
              <div className="financial-variance-legend" role="note" aria-label="دليل ألوان الانحراف">
                <span className="financial-variance-legend-title">دليل الألوان:</span>
                {varianceLegendItems.map((item) => (
                  <span key={item.key} className="financial-variance-legend-item">
                    <i className={`financial-variance-dot fin-variance-${item.key}`} />
                    {item.label} ({item.range})
                  </span>
                ))}
              </div>

              <div className="financial-comparison-grid">
                <article className="financial-comparison-card">
                  <h3 className="financial-chart-title">توزيع المكونات</h3>
                  {financialComposition.length > 0 ? (
                    <table className="financial-mini-table">
                      <thead>
                        <tr>
                          <th>المكوّن</th>
                          <th>القيمة</th>
                          <th>النسبة</th>
                        </tr>
                      </thead>
                      <tbody>
                        {financialComposition.map((row) => (
                          <tr key={row.label}>
                            <td>{row.label}</td>
                            <td>{formatCurrency(row.value)}</td>
                            <td>{row.pct.toFixed(1)}%</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : (
                    <div className="oms-text">لا يوجد توزيع مالي فعلي حتى الآن.</div>
                  )}
                </article>

                <article className="financial-comparison-card">
                  <h3 className="financial-chart-title">أعلى البنود انحرافًا</h3>
                  {financialTopVariance.length > 0 ? (
                    <div className="financial-variance-list">
                      {financialTopVariance.map((row) => (
                        <div key={row.id} className={`financial-variance-item ${varianceItemToneClass(row.variancePct)}`}>
                          <strong>{row.title}</strong>
                          <span className={varianceToneClass(row.variancePct)}>انحراف: {formatPercent(row.variancePct)}</span>
                          <span>مخطط: {formatCurrency(row.plannedWithVat)} · التزام: {formatCurrency(row.committed)}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="oms-text">لا يوجد انحرافات مسجلة.</div>
                  )}
                </article>

                <article className="financial-comparison-card span-2">
                  <h3 className="financial-chart-title">توزيع الالتزام على البنود الأعلى</h3>
                  {financialTopCommitmentShare.length > 0 ? (
                    <div className="financial-share-wrap">
                      {financialTopCommitmentShare.map((row) => (
                        <div key={row.id} className="financial-share-row">
                          <div className="financial-share-label">{row.title}</div>
                          <div className="financial-share-track">
                            <div className="financial-share-fill" style={{ width: `${Math.max(2, row.share)}%` }} />
                          </div>
                          <div className="financial-share-meta">
                            {formatCurrency(row.committed)} · {row.share.toFixed(1)}%
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="oms-text">لا يوجد التزام فعلي موزع على البنود بعد.</div>
                  )}
                </article>

                <article className="financial-comparison-card span-2">
                  <h3 className="financial-chart-title">فجوة الربح</h3>
                  <div className="financial-gap-grid">
                    <div>
                      <span>بعد الضريبة</span>
                      <strong>{formatSignedCurrency(profitGapAfterVat)}</strong>
                    </div>
                    <div>
                      <span>قبل الضريبة</span>
                      <strong>{formatSignedCurrency(profitGapBeforeVat)}</strong>
                    </div>
                  </div>
                </article>
              </div>
            </>
          ) : (
            <div className="workflow-empty">تم إخفاء التحليل المالي المقارن.</div>
          )}
        </section>
      ) : null}

      {report.regulatoryCompliance ? (
        <section
          id={DETAILS_SECTION_ANCHORS.compliance}
          ref={(node) => setSectionRef("compliance", node)}
          className={`oms-panel ${highlightedSection === "compliance" ? "report-panel-highlight" : ""}`}
        >
          <div className="report-section-head">
            <h2 className="oms-section-title">الالتزام التنظيمي</h2>
            <button
              className="oms-btn oms-btn-ghost"
              type="button"
              ref={(node) => setSectionFocusRef("compliance", node)}
              onClick={() => (sectionsOpen.compliance ? toggleSection("compliance") : navigateToSection("compliance"))}
            >
              {sectionsOpen.compliance ? "إخفاء" : "عرض"}
            </button>
          </div>
          {sectionsOpen.compliance ? (
            <>
              <div className="report-risk-head">
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
            </>
          ) : (
            <div className="workflow-empty">تم إخفاء حالة الامتثال التنظيمي.</div>
          )}
        </section>
      ) : null}

      {executiveReadinessSections.length > 0 ? (
        <section
          id={DETAILS_SECTION_ANCHORS.readiness}
          ref={(node) => setSectionRef("readiness", node)}
          className={`oms-panel ${highlightedSection === "readiness" ? "report-panel-highlight" : ""}`}
        >
          <div className="report-section-head">
            <h2 className="oms-section-title">جاهزية القرار التنفيذي</h2>
            <button
              className="oms-btn oms-btn-ghost"
              type="button"
              ref={(node) => setSectionFocusRef("readiness", node)}
              onClick={() => (sectionsOpen.readiness ? toggleSection("readiness") : navigateToSection("readiness"))}
            >
              {sectionsOpen.readiness ? "إخفاء" : "عرض"}
            </button>
          </div>
          {sectionsOpen.readiness ? (
            <div className="report-exec-sections">
              {executiveReadinessSections.map((section) => (
                <article key={section.title} className="oms-panel report-exec-card" style={{ marginTop: 0 }}>
                  <h2 className="oms-section-title">{section.title}</h2>
                  {section.lines.map((line, idx) => (
                    <div key={`${section.title}-${idx}`} className="oms-list-line">
                      • {line}
                    </div>
                  ))}
                </article>
              ))}
            </div>
          ) : (
            <div className="workflow-empty">تم إخفاء تفاصيل جاهزية القرار.</div>
          )}
        </section>
      ) : null}

      <section className="report-sections">
        <section
          id={DETAILS_SECTION_ANCHORS.advisors}
          ref={(node) => setSectionRef("advisors", node)}
          className={`oms-panel ${highlightedSection === "advisors" ? "report-panel-highlight" : ""}`}
          style={{ marginTop: 0 }}
        >
          <div className="report-section-head">
            <h2 className="oms-section-title">أبرز ملاحظات المستشارين</h2>
            <button
              className="oms-btn oms-btn-ghost"
              type="button"
              ref={(node) => setSectionFocusRef("advisors", node)}
              onClick={() => (sectionsOpen.advisors ? toggleSection("advisors") : navigateToSection("advisors"))}
            >
              {sectionsOpen.advisors ? "إخفاء" : "عرض"}
            </button>
          </div>
          {sectionsOpen.advisors ? (
            report.advisorsHighlights.map((line, idx) => (
              <div key={idx} className="oms-list-line">
                • {line}
              </div>
            ))
          ) : (
            <div className="workflow-empty">تم إخفاء ملاحظات المستشارين.</div>
          )}
        </section>

        {sectionsOpen.advisors ? (
          <section className="oms-panel" style={{ marginTop: 0 }}>
            <h2 className="oms-section-title">التوصيات التنفيذية</h2>
            {report.recommendations.map((line, idx) => (
              <div key={idx} className="oms-list-line">
                • {line}
              </div>
            ))}
          </section>
        ) : null}
      </section>

      <section
        id={DETAILS_SECTION_ANCHORS.risks}
        ref={(node) => setSectionRef("risks", node)}
        className={`oms-panel ${highlightedSection === "risks" ? "report-panel-highlight" : ""}`}
      >
        <div className="report-section-head">
          <h2 className="oms-section-title">المخاطر</h2>
          <button
            className="oms-btn oms-btn-ghost"
            type="button"
            ref={(node) => setSectionFocusRef("risks", node)}
            onClick={() => (sectionsOpen.risks ? toggleSection("risks") : navigateToSection("risks"))}
          >
            {sectionsOpen.risks ? "إخفاء" : "عرض"}
          </button>
        </div>
        {sectionsOpen.risks ? (
          <>
            <div className="report-risk-head">
              <span className="report-risk-badge">مخاطر مفتوحة: {riskCount}</span>
            </div>
            {report.risks.map((line, idx) => (
              <div key={idx} className="oms-list-line">
                • {line}
              </div>
            ))}
          </>
        ) : (
          <div className="workflow-empty">تم إخفاء قائمة المخاطر.</div>
        )}
      </section>

      <style>{`
        .report-head-actions {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
        }

        .report-hierarchy-shell {
          margin-top: 12px;
          border: 1px solid var(--oms-border);
          border-radius: var(--oms-radius-md);
          background: rgba(8, 14, 26, 0.56);
          padding: 10px;
        }

        .report-hierarchy-head {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          flex-wrap: wrap;
        }

        .report-hierarchy-meta {
          margin-top: 6px;
          color: var(--oms-text-muted);
          font-size: 12px;
          line-height: 1.6;
        }

        .report-hierarchy-actions {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
        }

        .report-section-tabs {
          margin-top: 10px;
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 8px;
        }

        .report-section-tab {
          min-height: 36px;
          border-radius: var(--oms-radius-sm);
          border: 1px solid var(--oms-border-strong);
          background: rgba(8, 14, 26, 0.78);
          color: var(--oms-text-muted);
          font-weight: 800;
          cursor: pointer;
        }

        .report-section-tab.is-open {
          border-color: var(--oms-border-accent);
          background: linear-gradient(180deg, rgba(127, 90, 240, 0.34), rgba(86, 60, 158, 0.22));
          color: var(--oms-text);
        }

        .report-section-head {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
          flex-wrap: wrap;
        }

        .report-panel-highlight {
          border-color: rgba(167, 115, 255, 0.72);
          box-shadow: 0 0 0 1px rgba(167, 115, 255, 0.24), 0 0 28px rgba(128, 69, 242, 0.18);
          animation: report-panel-pulse 1.1s ease;
        }

        @keyframes report-panel-pulse {
          0% {
            box-shadow: 0 0 0 0 rgba(128, 69, 242, 0);
          }
          35% {
            box-shadow: 0 0 0 2px rgba(167, 115, 255, 0.28), 0 0 32px rgba(128, 69, 242, 0.24);
          }
          100% {
            box-shadow: 0 0 0 1px rgba(167, 115, 255, 0.24), 0 0 28px rgba(128, 69, 242, 0.18);
          }
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

        .fin-variance-good {
          color: #8bf3ca !important;
        }

        .fin-variance-warn {
          color: #ffd996 !important;
        }

        .fin-variance-risk {
          color: #ffb9c6 !important;
        }

        .fin-variance-neutral {
          color: #bcd1ee !important;
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

        .report-financial-comparison {
          background: linear-gradient(156deg, rgba(20, 31, 56, 0.92), rgba(11, 18, 35, 0.9));
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

        .financial-lines-table td.fin-variance-good {
          color: #8bf3ca;
          font-weight: 800;
        }

        .financial-lines-table td.fin-variance-warn {
          color: #ffd996;
          font-weight: 800;
        }

        .financial-lines-table td.fin-variance-risk {
          color: #ffb9c6;
          font-weight: 800;
        }

        .financial-lines-table td.fin-variance-neutral {
          color: #bcd1ee;
          font-weight: 700;
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

        .financial-comparison-grid {
          margin-top: 10px;
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 10px;
        }

        .financial-variance-legend {
          margin-top: 8px;
          display: flex;
          align-items: center;
          gap: 8px;
          flex-wrap: wrap;
          border-radius: 10px;
          border: 1px solid rgba(128, 164, 230, 0.22);
          background: rgba(8, 18, 35, 0.64);
          padding: 8px 10px;
        }

        .financial-variance-legend-title {
          color: #d6e8ff;
          font-size: 12px;
          font-weight: 900;
        }

        .financial-variance-legend-item {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          color: #b9d0ec;
          font-size: 12px;
          font-weight: 800;
        }

        .financial-variance-dot {
          width: 8px;
          height: 8px;
          border-radius: 999px;
          display: inline-block;
          box-shadow: 0 0 0 2px rgba(255, 255, 255, 0.08);
        }

        .financial-comparison-card {
          border-radius: 12px;
          border: 1px solid rgba(128, 164, 230, 0.24);
          background: linear-gradient(170deg, rgba(12, 22, 42, 0.9), rgba(7, 14, 28, 0.82));
          padding: 10px;
        }

        .financial-comparison-card.span-2 {
          grid-column: span 2;
        }

        .financial-mini-table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 8px;
        }

        .financial-mini-table th,
        .financial-mini-table td {
          border-bottom: 1px solid rgba(128, 164, 230, 0.2);
          padding: 7px 8px;
          text-align: right;
          font-size: 12px;
          white-space: nowrap;
        }

        .financial-mini-table th {
          color: #9fb4d5;
          font-weight: 800;
        }

        .financial-mini-table td {
          color: #e8f1ff;
          font-weight: 700;
        }

        .financial-variance-list {
          margin-top: 8px;
          display: grid;
          gap: 7px;
        }

        .financial-variance-item {
          border-radius: 10px;
          border: 1px solid rgba(130, 164, 255, 0.25);
          background: rgba(9, 18, 35, 0.7);
          padding: 8px 10px;
          display: grid;
          gap: 3px;
        }

        .financial-variance-item.fin-variance-good {
          border-color: rgba(88, 214, 165, 0.45);
          background: rgba(16, 56, 43, 0.38);
        }

        .financial-variance-item.fin-variance-warn {
          border-color: rgba(232, 182, 102, 0.45);
          background: rgba(66, 47, 20, 0.38);
        }

        .financial-variance-item.fin-variance-risk {
          border-color: rgba(247, 106, 121, 0.48);
          background: rgba(70, 20, 33, 0.42);
        }

        .financial-variance-item strong {
          color: #dff0ff;
          font-size: 13px;
        }

        .financial-variance-item span {
          color: #a8c0e0;
          font-size: 12px;
          font-weight: 700;
        }

        .financial-share-wrap {
          margin-top: 8px;
          display: grid;
          gap: 8px;
        }

        .financial-share-row {
          display: grid;
          grid-template-columns: minmax(120px, 1fr) minmax(0, 2fr) auto;
          gap: 8px;
          align-items: center;
        }

        .financial-share-label {
          color: #c7dbf6;
          font-size: 12px;
          font-weight: 800;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .financial-share-track {
          position: relative;
          min-height: 14px;
          border-radius: 999px;
          background: rgba(26, 44, 72, 0.74);
          overflow: hidden;
        }

        .financial-share-fill {
          position: absolute;
          right: 0;
          top: 0;
          bottom: 0;
          border-radius: 999px;
          background: linear-gradient(90deg, rgba(88, 138, 255, 0.82), rgba(120, 210, 255, 0.86));
        }

        .financial-share-meta {
          color: #b9d0ec;
          font-size: 12px;
          font-weight: 800;
          white-space: nowrap;
        }

        .financial-gap-grid {
          margin-top: 8px;
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 8px;
        }

        .financial-gap-grid > div {
          border-radius: 10px;
          border: 1px solid rgba(122, 188, 255, 0.26);
          background: rgba(8, 18, 35, 0.76);
          padding: 8px 10px;
          display: grid;
          gap: 4px;
        }

        .financial-gap-grid span {
          color: #8da7c9;
          font-size: 12px;
          font-weight: 700;
        }

        .financial-gap-grid strong {
          color: #f2f7ff;
          font-size: 18px;
          font-weight: 900;
        }

        .report-sections {
          margin-top: 12px;
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 10px;
        }

        .report-exec-sections {
          margin-top: 12px;
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 10px;
        }

        .report-exec-card {
          margin-top: 0;
          background: linear-gradient(155deg, rgba(18, 30, 54, 0.92), rgba(10, 17, 33, 0.9));
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
          .report-section-tabs {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }

          .report-overview {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }

          .report-sections {
            grid-template-columns: 1fr;
          }

          .report-exec-sections {
            grid-template-columns: 1fr;
          }

          .financial-board-grid {
            grid-template-columns: 1fr;
          }

          .financial-chart-card.span-2 {
            grid-column: span 1;
          }

          .financial-comparison-grid {
            grid-template-columns: 1fr;
          }

          .financial-comparison-card.span-2 {
            grid-column: span 1;
          }
        }

        @media (max-width: 640px) {
          .report-head-actions {
            display: grid;
          }

          .report-section-tabs {
            grid-template-columns: 1fr;
          }

          .report-overview {
            grid-template-columns: 1fr;
          }

          .financial-lines-table {
            min-width: 520px;
          }

          .financial-share-row {
            grid-template-columns: 1fr;
          }

          .financial-gap-grid {
            grid-template-columns: 1fr;
          }

          .report-hierarchy-actions .oms-btn {
            width: 100%;
            justify-content: center;
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

function varianceToneClass(value: number | null): string {
  if (value === null || !Number.isFinite(value)) return "fin-variance-neutral";
  const abs = Math.abs(value);
  if (abs <= 5) return "fin-variance-good";
  if (abs <= 15) return "fin-variance-warn";
  return "fin-variance-risk";
}

function varianceItemToneClass(value: number | null): string {
  return varianceToneClass(value);
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

function resolveDetailsSectionFromHash(hash: string): ReportDetailsSectionKey | null {
  const normalizedHash = hash.replace(/^#/, "");
  const entry = (Object.entries(DETAILS_SECTION_ANCHORS) as Array<[ReportDetailsSectionKey, string]>).find(
    ([, anchor]) => anchor === normalizedHash
  );
  return entry ? entry[0] : null;
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
