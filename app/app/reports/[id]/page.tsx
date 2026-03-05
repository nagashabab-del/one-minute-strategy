"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useMemo, useState, useSyncExternalStore } from "react";
import {
  buildReportFileName,
  buildReportText,
  buildReportWordFileName,
  buildReportWordHtml,
  getReportsSignature,
  StrategyReport,
  readReportById,
  subscribeReportsChanges,
} from "../report-store";
import StrategyReadinessBanner, { useStrategyReadinessMode } from "../../_components/strategy-readiness-banner";
import { READINESS_LOCK_REASON, resolveQuickStartForReadiness } from "../../_lib/readiness-lock";

type ExportFeedback = { tone: "ok" | "error"; text: string };

export default function ReportDetailsPage() {
  const params = useParams<{ id: string | string[] }>();
  const readiness = useStrategyReadinessMode();
  const inGapMode = readiness.mode === "gap";
  const quickStart = resolveQuickStartForReadiness(readiness.mode);
  const quickActionBlockedHint = READINESS_LOCK_REASON;
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
  const [isBundleExporting, setIsBundleExporting] = useState(false);

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

  const pushExportFeedback = (tone: ExportFeedback["tone"], text: string) => {
    setExportFeedback({ tone, text });
    if (typeof window !== "undefined") {
      window.setTimeout(() => setExportFeedback(null), 2600);
    }
  };

  const riskCount = report.risks.filter((line) => !line.startsWith("لا توجد")).length;
  const recommendationCount = report.recommendations.filter((line) => !line.startsWith("لا توجد")).length;
  const highlightsCount = report.advisorsHighlights.filter((line) => !line.startsWith("لا توجد")).length;
  const onExportTxt = (silent = false) => {
    if (inGapMode) return false;
    const ok = triggerDownload(buildReportFileName(report), "text/plain;charset=utf-8", [buildReportText(report)]);
    if (!silent) {
      pushExportFeedback(ok ? "ok" : "error", ok ? "تم تنزيل ملف TXT بنجاح." : "تعذر تنزيل ملف TXT.");
    }
    return ok;
  };
  const onCopyReport = async () => {
    if (inGapMode || typeof window === "undefined") return;
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
        document.execCommand("copy");
        document.body.removeChild(textarea);
      }
      pushExportFeedback("ok", "تم نسخ التقرير للحافظة.");
    } catch {
      pushExportFeedback("error", "تعذر نسخ التقرير. يمكنك استخدام التصدير النصي.");
    }
  };
  const onPrintPdf = () => {
    if (inGapMode || typeof window === "undefined") return;
    window.print();
  };
  const onExportDoc = (silent = false) => {
    if (inGapMode) return false;
    const ok = triggerDownload(buildReportWordFileName(report), "application/msword;charset=utf-8", [
      "\ufeff",
      buildReportWordHtml(report),
    ]);
    if (!silent) {
      pushExportFeedback(ok ? "ok" : "error", ok ? "تم تنزيل ملف DOC بنجاح." : "تعذر تنزيل ملف DOC.");
    }
    return ok;
  };
  const onExportBundle = async () => {
    if (inGapMode) return;
    if (isBundleExporting) return;
    setIsBundleExporting(true);
    const txtOk = onExportTxt(true);
    await wait(120);
    const docOk = onExportDoc(true);
    setIsBundleExporting(false);
    pushExportFeedback(
      txtOk && docOk ? "ok" : "error",
      txtOk && docOk ? "تم تنزيل الحزمة (TXT + DOC)." : "تم تنزيل جزء من الحزمة أو فشل التصدير."
    );
  };

  const triggerDownload = (fileName: string, mimeType: string, payload: BlobPart[]) => {
    if (typeof window === "undefined") return false;
    try {
      const blob = new Blob(payload, { type: mimeType });
      const url = window.URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = fileName;
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
      window.URL.revokeObjectURL(url);
      return true;
    } catch {
      return false;
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
            disabled={isBundleExporting || inGapMode}
            title={inGapMode ? quickActionBlockedHint : undefined}
          >
            تصدير نصي (.txt)
          </button>
          <button
            type="button"
            className={`oms-btn oms-btn-ghost ${inGapMode ? "report-action-disabled" : ""}`}
            onClick={() => onExportDoc()}
            disabled={isBundleExporting || inGapMode}
            title={inGapMode ? quickActionBlockedHint : undefined}
          >
            تصدير Word (.doc)
          </button>
          <button
            type="button"
            className={`oms-btn oms-btn-ghost ${inGapMode ? "report-action-disabled" : ""}`}
            onClick={() => void onExportBundle()}
            disabled={isBundleExporting || inGapMode}
            title={inGapMode ? quickActionBlockedHint : undefined}
          >
            {isBundleExporting ? "جاري تصدير الحزمة..." : "تصدير الحزمة"}
          </button>
          <button
            type="button"
            className={`oms-btn oms-btn-ghost ${inGapMode ? "report-action-disabled" : ""}`}
            onClick={onCopyReport}
            disabled={inGapMode}
            title={inGapMode ? quickActionBlockedHint : undefined}
          >
            نسخ التقرير
          </button>
          <button
            type="button"
            className={`oms-btn oms-btn-ghost ${inGapMode ? "report-action-disabled" : ""}`}
            onClick={onPrintPdf}
            disabled={inGapMode}
            title={inGapMode ? quickActionBlockedHint : undefined}
          >
            تصدير PDF (طباعة)
          </button>
        </div>
        {inGapMode ? <div className="report-lock-note">{quickActionBlockedHint}</div> : null}
        <div className="report-print-note">للتصدير PDF: اضغط الزر ثم اختر &quot;Save as PDF&quot;.</div>
        {exportFeedback ? (
          <div className={`report-export-feedback tone-${exportFeedback.tone}`}>{exportFeedback.text}</div>
        ) : null}
        <div className="report-nonprint">
          <StrategyReadinessBanner contextLabel="التقارير" />
        </div>

        <h1 className="oms-page-title" style={{ marginTop: 12 }}>
          {report.title}
        </h1>
        <p className="oms-page-subtitle">تاريخ التحديث: {report.date}</p>

        <div className="report-overview">
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
        </div>
      </section>

      <section className="oms-panel report-decision">
        <h2 className="oms-section-title">القرار التنفيذي</h2>
        <p className="oms-text">{report.executiveDecision}</p>
      </section>

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
        }

        .report-export-feedback.tone-ok {
          border-color: rgba(88, 214, 165, 0.58);
          color: #78e3b9;
          background: rgba(14, 56, 45, 0.52);
        }

        .report-export-feedback.tone-error {
          border-color: rgba(247, 106, 121, 0.58);
          color: #ffbcc4;
          background: rgba(70, 20, 33, 0.52);
        }

        .report-print-note {
          margin-top: 6px;
          color: var(--oms-text-faint);
          font-size: 12px;
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
        }

        @media (max-width: 640px) {
          .report-head-actions {
            display: grid;
          }

          .report-overview {
            grid-template-columns: 1fr;
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
          .report-print-note,
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
