"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useMemo } from "react";
import { StrategyReport, readReportById } from "../report-store";
import StrategyReadinessBanner, { useStrategyReadinessMode } from "../../_components/strategy-readiness-banner";

export default function ReportDetailsPage() {
  const params = useParams<{ id: string }>();
  const readiness = useStrategyReadinessMode();
  const quickStartHref = readiness.mode === "gap" ? "/app/strategy/brief" : "/app/strategy";
  const quickStartLabel = readiness.mode === "gap" ? "استكمال موجز المشروع" : "بدء تحليل جديد";
  const report = useMemo<StrategyReport | null>(() => readReportById(params.id), [params.id]);

  if (!report) {
    return (
      <main>
        <h1 className="oms-page-title" style={{ fontSize: 24 }}>
          التقرير غير موجود
        </h1>
        <p className="oms-page-subtitle">
          لم يتم العثور على التقرير المطلوب.
        </p>
        <Link href="/app/reports" className="oms-btn oms-btn-ghost">
          رجوع إلى التقارير
        </Link>
      </main>
    );
  }

  const riskCount = report.risks.filter((line) => !line.startsWith("لا توجد")).length;
  const recommendationCount = report.recommendations.filter((line) => !line.startsWith("لا توجد")).length;
  const highlightsCount = report.advisorsHighlights.filter((line) => !line.startsWith("لا توجد")).length;

  return (
    <main>
      <section className="report-head">
        <div className="report-head-actions">
          <Link href="/app/reports" className="oms-btn oms-btn-ghost">
            رجوع إلى قائمة التقارير
          </Link>
          <Link href={quickStartHref} className="oms-btn oms-btn-primary">
            {quickStartLabel}
          </Link>
        </div>
        <StrategyReadinessBanner contextLabel="التقارير" />

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

        .report-overview {
          margin-top: 12px;
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 10px;
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
