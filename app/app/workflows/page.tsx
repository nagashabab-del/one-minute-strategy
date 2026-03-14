"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { StrategyReport, readReports } from "../reports/report-store";
import StrategyReadinessBanner, { useStrategyReadinessMode } from "../_components/strategy-readiness-banner";
import {
  isReadinessActionBlocked,
  resolveReadinessBlockedHint,
  resolveReadinessNavigationHref,
} from "../_lib/readiness-actions";
import {
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

type WorkflowSectionKey = "kpis" | "alerts" | "quickActions" | "queue";

const WORKFLOW_SECTION_DEFAULTS: Record<WorkflowSectionKey, boolean> = {
  kpis: true,
  alerts: true,
  quickActions: true,
  queue: true,
};

const WORKFLOW_SECTION_LABELS: Record<WorkflowSectionKey, string> = {
  kpis: "مؤشرات المراحل",
  alerts: "التنبيهات",
  quickActions: "الإجراءات السريعة",
  queue: "طابور المشاريع",
};

const WORKFLOW_SECTION_ANCHORS: Record<WorkflowSectionKey, string> = {
  kpis: "workflow-kpis",
  alerts: "workflow-alerts",
  quickActions: "workflow-quick-actions",
  queue: "workflow-queue",
};

export default function WorkflowsPage() {
  const reports = useMemo(() => readReports(), []);
  const readiness = useStrategyReadinessMode();
  const inGapMode = readiness.mode === "gap";
  const quickStart = resolveQuickStartForReadiness(readiness.mode);
  const quickActionBlockedHint = resolveReadinessBlockedHint(inGapMode);

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
  const [sectionsOpen, setSectionsOpen] =
    useState<Record<WorkflowSectionKey, boolean>>(WORKFLOW_SECTION_DEFAULTS);
  const [highlightedSection, setHighlightedSection] = useState<WorkflowSectionKey | null>(null);
  const sectionRefs = useRef<Record<WorkflowSectionKey, HTMLElement | null>>({
    kpis: null,
    alerts: null,
    quickActions: null,
    queue: null,
  });
  const sectionFocusRefs = useRef<Record<WorkflowSectionKey, HTMLElement | null>>({
    kpis: null,
    alerts: null,
    quickActions: null,
    queue: null,
  });
  const sectionKeys = Object.keys(WORKFLOW_SECTION_LABELS) as WorkflowSectionKey[];
  const openSectionsCount = sectionKeys.filter((section) => sectionsOpen[section]).length;

  function setSectionRef(section: WorkflowSectionKey, node: HTMLElement | null) {
    sectionRefs.current[section] = node;
  }

  function setSectionFocusRef(section: WorkflowSectionKey, node: HTMLElement | null) {
    sectionFocusRefs.current[section] = node;
  }

  function navigateToSection(section: WorkflowSectionKey) {
    setSectionsOpen((prev) => ({ ...prev, [section]: true }));
    setHighlightedSection(section);
    if (typeof window === "undefined") return;

    const anchor = WORKFLOW_SECTION_ANCHORS[section];
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

  function toggleSection(section: WorkflowSectionKey) {
    setSectionsOpen((prev) => ({ ...prev, [section]: !prev[section] }));
  }

  useEffect(() => {
    if (typeof window === "undefined") return;
    const section = resolveWorkflowSectionFromHash(window.location.hash);
    if (!section) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial hash hydration opens the target section once
    navigateToSection(section);
  }, []);

  return (
    <main>
      <h1 className="oms-page-title">سير العمل التنفيذي</h1>
      <p className="oms-page-subtitle">
        لوحة متابعة انتقال المشاريع من التحليل إلى الاعتماد، مع تحديد الإجراء التنفيذي التالي لكل مشروع.
      </p>
      <StrategyReadinessBanner contextLabel="سير العمل" />

      <section className="oms-panel">
        <div className="workflow-hierarchy-head">
          <div>
            <h2 className="oms-section-title">هرمية شاشة سير العمل</h2>
            <div className="workflow-hierarchy-meta">
              مفتوح الآن: {toArabicNumber(openSectionsCount)} / {toArabicNumber(sectionKeys.length)}
            </div>
          </div>
          <div className="workflow-hierarchy-actions">
            <button
              className="oms-btn oms-btn-ghost"
              type="button"
              onClick={() => setSectionsOpen({ kpis: true, alerts: true, quickActions: true, queue: true })}
            >
              فتح كل التفاصيل
            </button>
            <button
              className="oms-btn oms-btn-ghost"
              type="button"
              onClick={() => setSectionsOpen({ kpis: false, alerts: false, quickActions: false, queue: false })}
            >
              إغلاق كل التفاصيل
            </button>
            <button
              className="oms-btn oms-btn-ghost"
              type="button"
              onClick={() => setSectionsOpen(WORKFLOW_SECTION_DEFAULTS)}
            >
              الوضع الافتراضي
            </button>
          </div>
        </div>
        <div className="workflow-section-tabs">
          {sectionKeys.map((section) => (
            <button
              key={section}
              className={`workflow-section-tab ${sectionsOpen[section] ? "is-open" : ""}`}
              type="button"
              onClick={() => navigateToSection(section)}
            >
              {WORKFLOW_SECTION_LABELS[section]}
            </button>
          ))}
        </div>
      </section>

      <section
        id={WORKFLOW_SECTION_ANCHORS.kpis}
        ref={(node) => setSectionRef("kpis", node)}
        className={`oms-panel ${highlightedSection === "kpis" ? "workflow-panel-highlight" : ""}`}
      >
        <div className="workflow-section-head">
          <h2 className="oms-section-title">مؤشرات المراحل</h2>
          <button
            className="oms-btn oms-btn-ghost"
            type="button"
            ref={(node) => setSectionFocusRef("kpis", node)}
            onClick={() => (sectionsOpen.kpis ? toggleSection("kpis") : navigateToSection("kpis"))}
          >
            {sectionsOpen.kpis ? "إخفاء" : "عرض"}
          </button>
        </div>
        {sectionsOpen.kpis ? (
          <div className="workflow-stage-grid">
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
          </div>
        ) : (
          <div className="workflow-empty">تم إخفاء مؤشرات المراحل.</div>
        )}
      </section>

      <section className="workflow-columns">
        <article
          id={WORKFLOW_SECTION_ANCHORS.alerts}
          ref={(node) => setSectionRef("alerts", node)}
          className={`oms-panel ${highlightedSection === "alerts" ? "workflow-panel-highlight" : ""}`}
        >
          <div className="workflow-section-head">
            <h2 className="oms-section-title">تنبيهات وأولويات</h2>
            <button
              className="oms-btn oms-btn-ghost"
              type="button"
              ref={(node) => setSectionFocusRef("alerts", node)}
              onClick={() => (sectionsOpen.alerts ? toggleSection("alerts") : navigateToSection("alerts"))}
            >
              {sectionsOpen.alerts ? "إخفاء" : "عرض"}
            </button>
          </div>
          {sectionsOpen.alerts ? (
            alerts.length === 0 ? (
              <div className="workflow-empty">لا توجد تنبيهات حرجة الآن. استمر على نفس الإيقاع التشغيلي.</div>
            ) : (
              <div className="workflow-alerts">
                {alerts.map((alert) => (
                  <div className={`workflow-alert is-${alert.tone}`} key={alert.id}>
                    <div>
                      <div className="workflow-alert-title">{alert.title}</div>
                      <div className="workflow-alert-text">{alert.description}</div>
                    </div>
                    {isReadinessActionBlocked(inGapMode, alert.href) ? (
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
                        href={resolveReadinessNavigationHref(inGapMode, alert.href)}
                        className={alert.tone === "critical" ? "oms-btn oms-btn-primary" : "oms-btn oms-btn-ghost"}
                      >
                        {alert.actionLabel}
                      </Link>
                    )}
                  </div>
                ))}
              </div>
            )
          ) : (
            <div className="workflow-empty">تم إخفاء التنبيهات.</div>
          )}
        </article>

        <article
          id={WORKFLOW_SECTION_ANCHORS.quickActions}
          ref={(node) => setSectionRef("quickActions", node)}
          className={`oms-panel ${highlightedSection === "quickActions" ? "workflow-panel-highlight" : ""}`}
        >
          <div className="workflow-section-head">
            <h2 className="oms-section-title">إجراءات سريعة</h2>
            <button
              className="oms-btn oms-btn-ghost"
              type="button"
              ref={(node) => setSectionFocusRef("quickActions", node)}
              onClick={() =>
                sectionsOpen.quickActions ? toggleSection("quickActions") : navigateToSection("quickActions")
              }
            >
              {sectionsOpen.quickActions ? "إخفاء" : "عرض"}
            </button>
          </div>
          {sectionsOpen.quickActions ? (
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
          ) : (
            <div className="workflow-empty">تم إخفاء الإجراءات السريعة.</div>
          )}
        </article>
      </section>

      <section
        id={WORKFLOW_SECTION_ANCHORS.queue}
        ref={(node) => setSectionRef("queue", node)}
        className={`oms-panel ${highlightedSection === "queue" ? "workflow-panel-highlight" : ""}`}
      >
        <div className="workflow-section-head">
          <h2 className="oms-section-title">طابور المشاريع التنفيذي</h2>
          <div className="workflow-queue-head-actions">
            <div className="workflow-queue-summary">إجمالي المشاريع في المسار: {toArabicNumber(stageCounts.total)}</div>
            <button
              className="oms-btn oms-btn-ghost"
              type="button"
              ref={(node) => setSectionFocusRef("queue", node)}
              onClick={() => (sectionsOpen.queue ? toggleSection("queue") : navigateToSection("queue"))}
            >
              {sectionsOpen.queue ? "إخفاء" : "عرض"}
            </button>
          </div>
        </div>

        {sectionsOpen.queue ? (
          queue.length === 0 ? (
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
                    {isReadinessActionBlocked(inGapMode, row.href) ? (
                      <button
                        type="button"
                        className="oms-btn oms-btn-primary workflow-action-disabled"
                        disabled
                        title={quickActionBlockedHint}
                      >
                        تنفيذ الآن
                      </button>
                    ) : (
                      <Link
                        href={resolveReadinessNavigationHref(inGapMode, row.href)}
                        className="oms-btn oms-btn-primary"
                      >
                        تنفيذ الآن
                      </Link>
                    )}
                  </div>
                </article>
              ))}
            </div>
          )
        ) : (
          <div className="workflow-empty">تم إخفاء طابور المشاريع.</div>
        )}
      </section>

      <style>{`
        .workflow-hierarchy-head {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          flex-wrap: wrap;
        }

        .workflow-hierarchy-meta {
          margin-top: 6px;
          color: var(--oms-text-muted);
          font-size: 12px;
          line-height: 1.6;
        }

        .workflow-hierarchy-actions {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
        }

        .workflow-section-tabs {
          margin-top: 10px;
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 8px;
        }

        .workflow-section-tab {
          min-height: 36px;
          border-radius: var(--oms-radius-sm);
          border: 1px solid var(--oms-border-strong);
          background: rgba(8, 14, 26, 0.78);
          color: var(--oms-text-muted);
          font-weight: 800;
          cursor: pointer;
        }

        .workflow-section-tab.is-open {
          border-color: var(--oms-border-accent);
          background: linear-gradient(180deg, rgba(127, 90, 240, 0.34), rgba(86, 60, 158, 0.22));
          color: var(--oms-text);
        }

        .workflow-section-head {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          flex-wrap: wrap;
        }

        .workflow-panel-highlight {
          border-color: rgba(167, 115, 255, 0.72);
          box-shadow: 0 0 0 1px rgba(167, 115, 255, 0.24), 0 0 28px rgba(128, 69, 242, 0.18);
          animation: workflow-panel-pulse 1.1s ease;
        }

        @keyframes workflow-panel-pulse {
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

        .workflow-queue-head-actions {
          display: flex;
          align-items: center;
          justify-content: flex-end;
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

        @media (max-width: 900px) {
          .workflow-section-tabs {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
        }

        @media (max-width: 720px) {
          .workflow-stage-grid {
            grid-template-columns: 1fr;
          }

          .workflow-section-tabs {
            grid-template-columns: 1fr;
          }

          .workflow-hierarchy-actions .oms-btn {
            width: 100%;
            justify-content: center;
          }

          .workflow-queue-head-actions {
            width: 100%;
            justify-content: stretch;
          }

          .workflow-queue-head-actions .oms-btn {
            width: 100%;
            justify-content: center;
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

function resolveWorkflowSectionFromHash(hash: string): WorkflowSectionKey | null {
  const normalizedHash = hash.replace(/^#/, "");
  const entry = (Object.entries(WORKFLOW_SECTION_ANCHORS) as Array<[WorkflowSectionKey, string]>).find(
    ([, anchor]) => anchor === normalizedHash
  );
  return entry ? entry[0] : null;
}

function toArabicNumber(value: number) {
  return new Intl.NumberFormat("ar-SA").format(value);
}
