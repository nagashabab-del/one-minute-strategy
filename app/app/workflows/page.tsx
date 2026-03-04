"use client";

import Link from "next/link";
import { useMemo } from "react";
import { StrategyReport, readReports } from "../reports/report-store";
import StrategyReadinessBanner, { useStrategyReadinessMode } from "../_components/strategy-readiness-banner";
import {
  isReadinessBlockedHref,
  READINESS_LOCK_REASON,
  resolveQuickStartForReadiness,
} from "../_lib/readiness-lock";

type WorkflowAlert = {
  id: string;
  title: string;
  description: string;
  href: string;
  actionLabel: string;
  tone: "critical" | "attention" | "normal";
};

type WorkflowQueueRow = {
  id: string;
  title: string;
  status: StrategyReport["status"];
  date: string;
  nextAction: string;
  href: string;
};

export default function WorkflowsPage() {
  const reports = useMemo(() => readReports(), []);
  const readiness = useStrategyReadinessMode();
  const inGapMode = readiness.mode === "gap";
  const quickStart = resolveQuickStartForReadiness(readiness.mode);
  const quickActionBlockedHint = READINESS_LOCK_REASON;

  const stageCounts = useMemo(() => {
    const drafts = reports.filter((item) => item.status === "مسودة").length;
    const review = reports.filter((item) => item.status === "مكتمل").length;
    const approved = reports.filter((item) => item.status === "معتمد").length;
    return {
      intake: drafts,
      analysis: drafts,
      review,
      approved,
      total: reports.length,
    };
  }, [reports]);

  const alerts = useMemo<WorkflowAlert[]>(() => buildAlerts(reports), [reports]);
  const queue = useMemo<WorkflowQueueRow[]>(() => buildQueue(reports), [reports]);

  return (
    <main>
      <h1 className="oms-page-title">سير العمل التنفيذي</h1>
      <p className="oms-page-subtitle">
        لوحة متابعة انتقال المشاريع من التحليل إلى الاعتماد، مع تحديد الإجراء التنفيذي التالي لكل مشروع.
      </p>
      <StrategyReadinessBanner contextLabel="سير العمل" />

      <section className="workflow-stage-grid">
        <article className="oms-kpi-card workflow-stage-card">
          <div className="oms-kpi-label">استقبال المدخلات</div>
          <div className="workflow-stage-meta">ملخصات أولية قيد التجهيز</div>
          <div className="oms-kpi-value">{stageCounts.intake}</div>
        </article>
        <article className="oms-kpi-card workflow-stage-card">
          <div className="oms-kpi-label">قيد التحليل</div>
          <div className="workflow-stage-meta">جلسات استشارية نشطة</div>
          <div className="oms-kpi-value">{stageCounts.analysis}</div>
        </article>
        <article className="oms-kpi-card workflow-stage-card">
          <div className="oms-kpi-label">بانتظار الاعتماد</div>
          <div className="workflow-stage-meta">جاهزة لمراجعة القرار</div>
          <div className="oms-kpi-value">{stageCounts.review}</div>
        </article>
        <article className="oms-kpi-card workflow-stage-card">
          <div className="oms-kpi-label">معتمدة للتنفيذ</div>
          <div className="workflow-stage-meta">مؤهلة للتشغيل</div>
          <div className="oms-kpi-value">{stageCounts.approved}</div>
        </article>
      </section>

      <section className="workflow-columns">
        <article className="oms-panel">
          <h2 className="oms-section-title">تنبيهات وأولويات</h2>
          {alerts.length === 0 ? (
            <div className="workflow-empty">لا توجد تنبيهات حرجة الآن. استمر على نفس الإيقاع التشغيلي.</div>
          ) : (
            <div className="workflow-alerts">
              {alerts.map((alert) => (
                <div className={`workflow-alert is-${alert.tone}`} key={alert.id}>
                  <div>
                    <div className="workflow-alert-title">{alert.title}</div>
                    <div className="workflow-alert-text">{alert.description}</div>
                  </div>
                  {inGapMode && isReadinessBlockedHref(alert.href) ? (
                    <button
                      type="button"
                      className={`${
                        alert.tone === "critical" ? "oms-btn oms-btn-primary" : "oms-btn oms-btn-ghost"
                      } workflow-action-disabled`}
                      disabled
                      title={quickActionBlockedHint}
                    >
                      {alert.actionLabel}
                    </button>
                  ) : (
                    <Link
                      href={inGapMode ? "/app/strategy/brief" : alert.href}
                      className={alert.tone === "critical" ? "oms-btn oms-btn-primary" : "oms-btn oms-btn-ghost"}
                    >
                      {alert.actionLabel}
                    </Link>
                  )}
                </div>
              ))}
            </div>
          )}
        </article>

        <article className="oms-panel">
          <h2 className="oms-section-title">إجراءات سريعة</h2>
          <div className="workflow-quick-actions">
            <Link href={quickStart.href} className="oms-btn oms-btn-primary">
              {quickStart.label}
            </Link>
            {inGapMode ? (
              <>
                <button
                  type="button"
                  className="oms-btn oms-btn-ghost workflow-action-disabled"
                  disabled
                  title={quickActionBlockedHint}
                >
                  متابعة الخطة المالية
                </button>
                <button
                  type="button"
                  className="oms-btn oms-btn-ghost workflow-action-disabled"
                  disabled
                  title={quickActionBlockedHint}
                >
                  مراجعة التقارير
                </button>
              </>
            ) : (
              <>
                <Link href="/app/strategy/execution/budget" className="oms-btn oms-btn-ghost">
                  متابعة الخطة المالية
                </Link>
                <Link href="/app/reports" className="oms-btn oms-btn-ghost">
                  مراجعة التقارير
                </Link>
              </>
            )}
            <Link href="/app" className="oms-btn oms-btn-ghost">
              الرجوع للوحة التنفيذ
            </Link>
          </div>
        </article>
      </section>

      <section className="oms-panel">
        <div className="workflow-queue-head">
          <h2 className="oms-section-title">طابور المشاريع التنفيذي</h2>
          <div className="workflow-queue-summary">إجمالي المشاريع في المسار: {stageCounts.total}</div>
        </div>

        {queue.length === 0 ? (
          <div className="workflow-empty">لا يوجد أي مشروع في الطابور. ابدأ تحليل جديد لإنشاء أول مسار.</div>
        ) : (
          <div className="workflow-queue-list">
            {queue.map((row) => (
              <article className="workflow-queue-row" key={row.id}>
                <div>
                  <div className="workflow-queue-title">{row.title}</div>
                  <div className="workflow-queue-meta">آخر تحديث: {row.date}</div>
                </div>
                <div className="workflow-queue-center">
                  <span className={`workflow-status is-${statusClass(row.status)}`}>{row.status}</span>
                  <div className="workflow-next-action">{row.nextAction}</div>
                </div>
                <div className="workflow-queue-actions">
                  {inGapMode && isReadinessBlockedHref(row.href) ? (
                    <button
                      type="button"
                      className="oms-btn oms-btn-primary workflow-action-disabled"
                      disabled
                      title={quickActionBlockedHint}
                    >
                      تنفيذ الآن
                    </button>
                  ) : (
                    <Link href={inGapMode ? "/app/strategy/brief" : row.href} className="oms-btn oms-btn-primary">
                      تنفيذ الآن
                    </Link>
                  )}
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <style>{`
        .workflow-stage-grid {
          margin-top: 12px;
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 10px;
        }

        .workflow-stage-card {
          background: linear-gradient(180deg, rgba(13, 22, 39, 0.90), rgba(10, 17, 31, 0.82));
        }

        .workflow-stage-meta {
          margin-top: 4px;
          color: var(--oms-text-faint);
          font-size: 12px;
        }

        .workflow-columns {
          margin-top: 12px;
          display: grid;
          grid-template-columns: minmax(0, 1.4fr) minmax(0, 1fr);
          gap: 10px;
        }

        .workflow-alerts {
          margin-top: 10px;
          display: grid;
          gap: 8px;
        }

        .workflow-alert {
          border: 1px solid var(--oms-border);
          border-radius: var(--oms-radius-md);
          background: var(--oms-bg-card);
          padding: 10px;
          display: grid;
          gap: 8px;
        }

        .workflow-alert.is-critical {
          border-color: rgba(247, 106, 121, 0.55);
          background: linear-gradient(180deg, rgba(56, 20, 30, 0.78), rgba(29, 14, 20, 0.72));
        }

        .workflow-alert.is-attention {
          border-color: rgba(232, 182, 102, 0.5);
          background: linear-gradient(180deg, rgba(53, 39, 14, 0.76), rgba(28, 20, 10, 0.72));
        }

        .workflow-alert-title {
          font-weight: 800;
        }

        .workflow-alert-text {
          margin-top: 4px;
          color: var(--oms-text-muted);
          line-height: 1.7;
        }

        .workflow-quick-actions {
          margin-top: 10px;
          display: grid;
          gap: 8px;
        }

        .workflow-queue-head {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          flex-wrap: wrap;
        }

        .workflow-queue-summary {
          font-size: 13px;
          color: var(--oms-text-faint);
        }

        .workflow-queue-list {
          margin-top: 10px;
          display: grid;
          gap: 8px;
        }

        .workflow-queue-row {
          border: 1px solid var(--oms-border);
          border-radius: var(--oms-radius-md);
          background: var(--oms-bg-card);
          padding: 10px;
          display: grid;
          grid-template-columns: minmax(0, 1.2fr) minmax(0, 1fr) auto;
          align-items: center;
          gap: 10px;
        }

        .workflow-queue-title {
          font-size: 18px;
          font-weight: 900;
          line-height: 1.4;
        }

        .workflow-queue-meta {
          margin-top: 4px;
          color: var(--oms-text-faint);
          font-size: 13px;
        }

        .workflow-queue-center {
          display: grid;
          gap: 6px;
          justify-items: start;
        }

        .workflow-status {
          min-height: 24px;
          border-radius: 999px;
          border: 1px solid var(--oms-border-strong);
          font-size: 12px;
          font-weight: 800;
          display: inline-flex;
          align-items: center;
          padding: 0 10px;
        }

        .workflow-status.is-approved {
          border-color: rgba(88, 214, 165, 0.62);
          color: #78e3b9;
          background: rgba(14, 56, 45, 0.78);
        }

        .workflow-status.is-complete {
          border-color: rgba(130, 164, 255, 0.58);
          color: #bfd3ff;
          background: rgba(20, 34, 65, 0.72);
        }

        .workflow-status.is-draft {
          border-color: rgba(232, 182, 102, 0.58);
          color: #ffd996;
          background: rgba(66, 47, 20, 0.72);
        }

        .workflow-next-action {
          color: var(--oms-text-muted);
          font-size: 14px;
          line-height: 1.6;
        }

        .workflow-queue-actions {
          display: flex;
          justify-content: flex-end;
        }

        .workflow-action-disabled {
          opacity: 0.58;
          cursor: not-allowed;
          border-color: rgba(244,126,126,0.42) !important;
          color: #ffb3b3 !important;
        }

        .workflow-empty {
          margin-top: 10px;
          border: 1px dashed var(--oms-border);
          border-radius: var(--oms-radius-md);
          padding: 12px;
          color: var(--oms-text-muted);
          line-height: 1.8;
          background: rgba(10, 16, 28, 0.55);
        }

        @media (max-width: 1080px) {
          .workflow-stage-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }

          .workflow-columns {
            grid-template-columns: 1fr;
          }

          .workflow-queue-row {
            grid-template-columns: 1fr;
            align-items: stretch;
          }

          .workflow-queue-actions {
            justify-content: stretch;
          }

          .workflow-queue-actions .oms-btn {
            width: 100%;
            justify-content: center;
          }
        }

        @media (max-width: 720px) {
          .workflow-stage-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </main>
  );
}

function buildAlerts(reports: StrategyReport[]): WorkflowAlert[] {
  const alerts: WorkflowAlert[] = [];
  const draft = reports.filter((item) => item.status === "مسودة").length;
  const review = reports.filter((item) => item.status === "مكتمل").length;
  const risky = reports.filter((item) => !isNoRisk(item.risks)).length;

  if (review > 0) {
    alerts.push({
      id: "review",
      title: `${review} تقرير بانتظار الاعتماد`,
      description: "اعتمد القرار التنفيذي للتقارير المكتملة حتى لا تتعطل مرحلة التشغيل.",
      href: "/app/reports",
      actionLabel: "فتح التقارير",
      tone: "critical",
    });
  }

  if (draft > 0) {
    alerts.push({
      id: "draft",
      title: `${draft} مشروع ما زال في المسودة`,
      description: "استكمل موجز المشروع وجلسة التحليل لتحويله إلى مسار قابل للاعتماد.",
      href: "/app/strategy",
      actionLabel: "استكمال التحليل",
      tone: "attention",
    });
  }

  if (risky > 0) {
    alerts.push({
      id: "risk",
      title: `${risky} تقرير يحتوي على مخاطر معلنة`,
      description: "راجع المخاطر المرتفعة وحدد إجراءات تخفيف قبل اعتماد التنفيذ النهائي.",
      href: "/app/reports",
      actionLabel: "مراجعة المخاطر",
      tone: "attention",
    });
  }

  if (alerts.length === 0 && reports.length > 0) {
    alerts.push({
      id: "healthy",
      title: "المسار مستقر",
      description: "لا توجد اختناقات حرجة الآن. يمكنك بدء تحليل جديد أو متابعة التنفيذ.",
      href: "/app/strategy",
      actionLabel: "بدء تحليل جديد",
      tone: "normal",
    });
  }

  return alerts;
}

function buildQueue(reports: StrategyReport[]): WorkflowQueueRow[] {
  return reports.map((item) => ({
    id: item.id,
    title: item.title,
    status: item.status,
    date: item.date,
    nextAction: resolveNextAction(item.status),
    href: item.status === "مسودة" ? "/app/strategy" : `/app/reports/${item.id}`,
  }));
}

function resolveNextAction(status: StrategyReport["status"]) {
  if (status === "مسودة") return "استكمال التحليل: إغلاق المدخلات والانتقال لجلسة المستشارين.";
  if (status === "مكتمل") return "اعتماد القرار التنفيذي ثم بدء هيكلة نطاق التنفيذ.";
  return "متابعة التنفيذ التشغيلي وتحديث التقرير الدوري.";
}

function statusClass(status: StrategyReport["status"]) {
  if (status === "معتمد") return "approved";
  if (status === "مكتمل") return "complete";
  return "draft";
}

function isNoRisk(risks: string[]) {
  const first = risks[0]?.trim() ?? "";
  return first.startsWith("لا توجد مخاطر");
}
