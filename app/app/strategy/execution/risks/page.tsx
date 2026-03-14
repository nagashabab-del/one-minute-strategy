"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { readActiveStrategyProject, readWorkspaceStage, workspaceStageLabel } from "../../_lib/readiness";

type RiskSectionKey = "objective" | "scope" | "deliverables" | "actions";
type RiskSeverity = "low" | "medium" | "high" | "critical";
type WorkspaceRiskLevel = "منخفض" | "متوسط" | "مرتفع";
type WorkspaceRiskStatus = "مفتوح" | "قيد المعالجة" | "مغلق" | "مصعّد";

type WorkspaceRiskItem = {
  id?: string;
  title?: string;
  probability?: WorkspaceRiskLevel;
  impact?: WorkspaceRiskLevel;
  owner?: string;
  mitigation?: string;
  reviewDate?: string;
  status?: WorkspaceRiskStatus;
};

type PlanBridgeRiskItem = {
  id?: string;
  taskTitle?: string;
  severity?: "متوسط" | "عالي";
  state?: "مفتوح" | "تحت المعالجة";
  reason?: string;
  updatedAt?: string;
};

type BudgetRegulatoryCommitment = {
  path?: string;
  required?: boolean;
  status?: "غير مطلوب" | "مطلوب" | "قيد الإجراء" | "مكتمل";
  owner?: string;
  updatedAt?: string;
};

type BudgetIncreaseRequest = {
  status?: "طلب جديد" | "تحت المراجعة" | "معتمد" | "مرفوض" | "منفذ";
  reason?: string;
};

type BudgetSnapshot = {
  regulatoryCommitments?: BudgetRegulatoryCommitment[];
  budgetIncreases?: BudgetIncreaseRequest[];
};

type StrategySnapshot = {
  analysis?: {
    strategic_analysis?: {
      risks?: string[];
    };
  };
  liveRiskItems?: WorkspaceRiskItem[];
};

type RiskRow = {
  id: string;
  source: "المسار المتقدم" | "الخطة الزمنية" | "التحليل" | "تنظيمي" | "مالي";
  title: string;
  severity: RiskSeverity;
  status: string;
  owner: string;
  note: string;
};

type RiskBundle = {
  projectName: string;
  stageLabel: string;
  summary: {
    totalOpen: number;
    critical: number;
    escalated: number;
    regulatoryPending: number;
    budgetPending: number;
    workspaceOpen: number;
    planOpen: number;
  };
  scopeItems: string[];
  nextDeliverables: string[];
  decision: {
    label: string;
    tone: "ok" | "warn" | "risk";
    message: string;
  };
  topRows: RiskRow[];
};

const RISK_SECTION_DEFAULTS: Record<RiskSectionKey, boolean> = {
  objective: true,
  scope: true,
  deliverables: true,
  actions: true,
};

const RISK_SECTION_LABELS: Record<RiskSectionKey, string> = {
  objective: "هدف المرحلة",
  scope: "النطاق الحالي",
  deliverables: "المخرجات التالية",
  actions: "الإجراءات التنفيذية",
};

const RISK_SECTION_ANCHORS: Record<RiskSectionKey, string> = {
  objective: "risk-objective",
  scope: "risk-scope",
  deliverables: "risk-deliverables",
  actions: "risk-actions",
};

const PLAN_RISK_BRIDGE_PREFIX = "oms_exec_risk_bridge_v1_";
const BUDGET_TRACKER_PREFIX = "oms_exec_budget_tracker_v1_";

export default function StrategyExecutionRisksPage() {
  const [sectionsOpen, setSectionsOpen] = useState<Record<RiskSectionKey, boolean>>(RISK_SECTION_DEFAULTS);
  const [highlightedSection, setHighlightedSection] = useState<RiskSectionKey | null>(null);
  const sectionRefs = useRef<Record<RiskSectionKey, HTMLElement | null>>({
    objective: null,
    scope: null,
    deliverables: null,
    actions: null,
  });
  const sectionFocusRefs = useRef<Record<RiskSectionKey, HTMLElement | null>>({
    objective: null,
    scope: null,
    deliverables: null,
    actions: null,
  });
  const sectionKeys = Object.keys(RISK_SECTION_LABELS) as RiskSectionKey[];
  const openSectionsCount = sectionKeys.filter((section) => sectionsOpen[section]).length;

  const riskBundle = useMemo<RiskBundle>(() => {
    if (typeof window === "undefined") return createEmptyRiskBundle();

    const activeProject = readActiveStrategyProject();
    const projectName = activeProject.name || "مشروع غير محدد";
    const stageLabel = workspaceStageLabel(readWorkspaceStage(activeProject.snapshot));
    const projectId = activeProject.id === "global" ? "" : activeProject.id;
    const snapshot = (activeProject.snapshot || {}) as StrategySnapshot;

    const workspaceRisks = Array.isArray(snapshot.liveRiskItems) ? snapshot.liveRiskItems : [];
    const workspaceRows: RiskRow[] = workspaceRisks.map((item, idx) => ({
      id: `workspace-${idx}`,
      source: "المسار المتقدم",
      title: (item.title || "خطر بدون عنوان").trim(),
      severity: workspaceSeverity(item.probability, item.impact),
      status: item.status || "مفتوح",
      owner: item.owner?.trim() || "غير محدد",
      note: item.mitigation?.trim() || "لا توجد معالجة مدخلة",
    }));

    const analysisRisks = snapshot.analysis?.strategic_analysis?.risks || [];
    const analysisRows: RiskRow[] = analysisRisks.slice(0, 6).map((line, idx) => ({
      id: `analysis-${idx}`,
      source: "التحليل",
      title: line || "ملاحظة مخاطر غير مسماة",
      severity: "medium",
      status: "مفتوح",
      owner: "مجلس المستشارين",
      note: "يتطلب تحويل إلى إجراء تنفيذي واضح",
    }));

    const planBridge = projectId
      ? safeParse<{ risks?: PlanBridgeRiskItem[] }>(localStorage.getItem(`${PLAN_RISK_BRIDGE_PREFIX}${projectId}`), {})
      : {};
    const planRisks = Array.isArray(planBridge.risks) ? planBridge.risks : [];
    const planRows: RiskRow[] = planRisks.map((item, idx) => ({
      id: `plan-${idx}`,
      source: "الخطة الزمنية",
      title: item.taskTitle || "خطر مرتبط بالمخطط الزمني",
      severity: item.severity === "عالي" ? "high" : "medium",
      status: item.state || "مفتوح",
      owner: "قائد الخطة الزمنية",
      note: item.reason || "تم إنشاؤه تلقائيًا من تعثر المهام",
    }));

    const budgetSnapshot = projectId
      ? safeParse<BudgetSnapshot | null>(localStorage.getItem(`${BUDGET_TRACKER_PREFIX}${projectId}`), null)
      : null;

    const regulatoryPending = (budgetSnapshot?.regulatoryCommitments || []).filter(
      (item) => item.required === true && item.status !== "مكتمل"
    );
    const regulatoryRows: RiskRow[] = regulatoryPending.map((item, idx) => ({
      id: `reg-${idx}`,
      source: "تنظيمي",
      title: `مسار تنظيمي غير مكتمل: ${item.path || "مسار غير محدد"}`,
      severity: "high",
      status: item.status || "قيد الإجراء",
      owner: item.owner?.trim() || "مسؤول التصاريح",
      note: "أغلق المتطلب التنظيمي قبل اعتماد الإطلاق النهائي",
    }));

    const budgetPending = (budgetSnapshot?.budgetIncreases || []).filter(
      (item) => item.status !== "مرفوض" && item.status !== "منفذ"
    );
    const budgetRows: RiskRow[] = budgetPending.map((item, idx) => ({
      id: `budget-${idx}`,
      source: "مالي",
      title: "طلب رفع ميزانية غير مغلق",
      severity: item.status === "معتمد" ? "high" : "medium",
      status: item.status || "طلب جديد",
      owner: "الإدارة المالية",
      note: item.reason || "يتطلب إغلاقًا ماليًا قبل القرار النهائي",
    }));

    const allRows = [...workspaceRows, ...planRows, ...regulatoryRows, ...budgetRows, ...analysisRows];
    const openRows = allRows.filter((item) => !isClosedStatus(item.status));
    const sorted = [...openRows].sort((a, b) => severityWeight(b.severity) - severityWeight(a.severity));

    const totalOpen = openRows.length;
    const critical = openRows.filter((item) => item.severity === "critical" || item.severity === "high").length;
    const escalated = openRows.filter((item) => /مصعّد|عاجل|حرج/.test(item.status)).length;

    const decision =
      totalOpen === 0
        ? {
            label: "مستقر",
            tone: "ok" as const,
            message: "لا توجد مخاطر مفتوحة حاليًا. يمكن متابعة القرار التنفيذي النهائي بثقة أعلى.",
          }
        : critical > 0
          ? {
              label: "إنذار مرتفع",
              tone: "risk" as const,
              message: "يوجد مخاطر حرجة/مرتفعة. عالج البنود الحرجة أولًا قبل اعتماد القرار النهائي.",
            }
          : {
              label: "تحت السيطرة",
              tone: "warn" as const,
              message: "المخاطر الحالية قابلة للإدارة لكن تتطلب متابعة وإغلاق تدريجي قبل الإقفال.",
            };

    const scopeItems = [
      `تجميع سجل موحد من ${toArabicNumber(workspaceRows.length)} خطر من المسار المتقدم و${toArabicNumber(planRows.length)} من الخطة الزمنية.`,
      `متابعة ${toArabicNumber(regulatoryPending.length)} مسار تنظيمي مفتوح و${toArabicNumber(budgetPending.length)} التزام مالي قيد الإجراء.`,
      `ترتيب الأولويات حسب الشدة: ${toArabicNumber(critical)} خطر عالي/حرج من إجمالي ${toArabicNumber(totalOpen)} مفتوح.`,
    ];

    const nextDeliverables = [
      "لوحة مخاطر موحدة بمصدر واضح ومسؤول مباشر لكل خطر.",
      "قرار تصعيد فوري للمخاطر الحرجة قبل الانتقال للقرار التنفيذي النهائي.",
      "تحديث حالة المخاطر المغلقة وربطها بسجل المراجعة النهائية.",
    ];

    return {
      projectName,
      stageLabel,
      summary: {
        totalOpen,
        critical,
        escalated,
        regulatoryPending: regulatoryPending.length,
        budgetPending: budgetPending.length,
        workspaceOpen: workspaceRows.filter((item) => !isClosedStatus(item.status)).length,
        planOpen: planRows.filter((item) => !isClosedStatus(item.status)).length,
      },
      scopeItems,
      nextDeliverables,
      decision,
      topRows: sorted.slice(0, 8),
    };
  }, []);

  function setSectionRef(section: RiskSectionKey, node: HTMLElement | null) {
    sectionRefs.current[section] = node;
  }

  function setSectionFocusRef(section: RiskSectionKey, node: HTMLElement | null) {
    sectionFocusRefs.current[section] = node;
  }

  function navigateToSection(section: RiskSectionKey) {
    setSectionsOpen((prev) => ({ ...prev, [section]: true }));
    setHighlightedSection(section);
    if (typeof window === "undefined") return;

    const anchor = RISK_SECTION_ANCHORS[section];
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
          }, 240);
        }
      });
    });

    window.setTimeout(() => {
      setHighlightedSection((current) => (current === section ? null : current));
    }, 1100);
  }

  function toggleSection(section: RiskSectionKey) {
    setSectionsOpen((prev) => ({ ...prev, [section]: !prev[section] }));
  }

  useEffect(() => {
    if (typeof window === "undefined") return;
    const section = resolveRiskSectionFromHash(window.location.hash);
    if (!section) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial hash hydration opens the target section once
    navigateToSection(section);
  }, []);

  return (
    <main>
      <h1 className="oms-page-title">سجل المخاطر</h1>
      <p className="oms-page-subtitle">إدارة المخاطر والمناطق الحرجة أثناء التشغيل.</p>

      <section className="oms-panel">
        <div className="risk-hierarchy-head">
          <div>
            <h2 className="oms-section-title">هرمية عرض سجل المخاطر</h2>
            <div className="risk-hierarchy-meta">
              مفتوح الآن: {toArabicNumber(openSectionsCount)} / {toArabicNumber(sectionKeys.length)}
            </div>
          </div>
          <div className="risk-hierarchy-actions">
            <button
              className="oms-btn oms-btn-ghost"
              type="button"
              onClick={() =>
                setSectionsOpen({
                  objective: true,
                  scope: true,
                  deliverables: true,
                  actions: true,
                })
              }
            >
              فتح كل التفاصيل
            </button>
            <button
              className="oms-btn oms-btn-ghost"
              type="button"
              onClick={() =>
                setSectionsOpen({
                  objective: false,
                  scope: false,
                  deliverables: false,
                  actions: false,
                })
              }
            >
              إغلاق كل التفاصيل
            </button>
            <button className="oms-btn oms-btn-ghost" type="button" onClick={() => setSectionsOpen(RISK_SECTION_DEFAULTS)}>
              الوضع الافتراضي
            </button>
          </div>
        </div>
        <div className="risk-section-tabs">
          {sectionKeys.map((section) => (
            <button
              key={section}
              className={`risk-section-tab ${sectionsOpen[section] ? "is-open" : ""}`}
              type="button"
              onClick={() => navigateToSection(section)}
            >
              {RISK_SECTION_LABELS[section]}
            </button>
          ))}
        </div>
      </section>

      <section
        id={RISK_SECTION_ANCHORS.objective}
        ref={(node) => setSectionRef("objective", node)}
        className={`oms-panel ${highlightedSection === "objective" ? "risk-panel-highlight" : ""}`}
      >
        <div className="risk-section-head">
          <h2 className="oms-section-title">هدف المرحلة</h2>
          <button
            className="oms-btn oms-btn-ghost"
            type="button"
            ref={(node) => setSectionFocusRef("objective", node)}
            onClick={() => (sectionsOpen.objective ? toggleSection("objective") : navigateToSection("objective"))}
          >
            {sectionsOpen.objective ? "إخفاء" : "عرض"}
          </button>
        </div>
        {sectionsOpen.objective ? (
          <>
            <p className="oms-text">تحديد المخاطر مبكرًا، قياس شدتها، وربطها بإجراءات معالجة ومسؤول مباشر.</p>
            <div className="risk-kpi-grid">
              <article className="risk-kpi-card">
                <div className="risk-kpi-label">المشروع الحالي</div>
                <div className="risk-kpi-value">{riskBundle.projectName}</div>
                <div className="risk-kpi-meta">المرحلة المسجلة: {riskBundle.stageLabel}</div>
              </article>
              <article className="risk-kpi-card">
                <div className="risk-kpi-label">إجمالي المخاطر المفتوحة</div>
                <div className="risk-kpi-value">{toArabicNumber(riskBundle.summary.totalOpen)}</div>
                <div className="risk-kpi-meta">
                  من المسار المتقدم: {toArabicNumber(riskBundle.summary.workspaceOpen)} · من الخطة الزمنية: {toArabicNumber(riskBundle.summary.planOpen)}
                </div>
              </article>
              <article className="risk-kpi-card tone-risk">
                <div className="risk-kpi-label">المخاطر الحرجة/المرتفعة</div>
                <div className="risk-kpi-value">{toArabicNumber(riskBundle.summary.critical)}</div>
                <div className="risk-kpi-meta">مخاطر مصعدة: {toArabicNumber(riskBundle.summary.escalated)}</div>
              </article>
              <article className={`risk-kpi-card tone-${riskBundle.decision.tone}`}>
                <div className="risk-kpi-label">حالة القرار</div>
                <div className="risk-kpi-value">{riskBundle.decision.label}</div>
                <div className="risk-kpi-meta">{riskBundle.decision.message}</div>
              </article>
            </div>
          </>
        ) : (
          <div className="workflow-empty">تم إخفاء هدف المرحلة. افتحه عند المراجعة.</div>
        )}
      </section>

      <section className="oms-grid-2" style={{ marginTop: 12 }}>
        <article
          id={RISK_SECTION_ANCHORS.scope}
          ref={(node) => setSectionRef("scope", node)}
          className={`oms-panel ${highlightedSection === "scope" ? "risk-panel-highlight" : ""}`}
          style={{ marginTop: 0 }}
        >
          <div className="risk-section-head">
            <h2 className="oms-section-title">النطاق الحالي</h2>
            <button
              className="oms-btn oms-btn-ghost"
              type="button"
              ref={(node) => setSectionFocusRef("scope", node)}
              onClick={() => (sectionsOpen.scope ? toggleSection("scope") : navigateToSection("scope"))}
            >
              {sectionsOpen.scope ? "إخفاء" : "عرض"}
            </button>
          </div>
          {sectionsOpen.scope ? (
            riskBundle.scopeItems.map((line, idx) => (
              <div key={idx} className="oms-list-line">
                • {line}
              </div>
            ))
          ) : (
            <div className="workflow-empty">تم إخفاء النطاق الحالي.</div>
          )}
        </article>

        <article
          id={RISK_SECTION_ANCHORS.deliverables}
          ref={(node) => setSectionRef("deliverables", node)}
          className={`oms-panel ${highlightedSection === "deliverables" ? "risk-panel-highlight" : ""}`}
          style={{ marginTop: 0 }}
        >
          <div className="risk-section-head">
            <h2 className="oms-section-title">المخرجات التالية</h2>
            <button
              className="oms-btn oms-btn-ghost"
              type="button"
              ref={(node) => setSectionFocusRef("deliverables", node)}
              onClick={() =>
                sectionsOpen.deliverables ? toggleSection("deliverables") : navigateToSection("deliverables")
              }
            >
              {sectionsOpen.deliverables ? "إخفاء" : "عرض"}
            </button>
          </div>
          {sectionsOpen.deliverables ? (
            <>
              {riskBundle.nextDeliverables.map((line, idx) => (
                <div key={idx} className="oms-list-line">
                  • {line}
                </div>
              ))}

              <div className="risk-live-list">
                {riskBundle.topRows.length === 0 ? (
                  <div className="workflow-empty">لا توجد مخاطر مفتوحة حاليًا.</div>
                ) : (
                  riskBundle.topRows.map((item) => (
                    <article key={item.id} className="risk-live-item">
                      <div className="risk-live-head">
                        <strong>{item.title}</strong>
                        <span className={`risk-severity-badge ${severityClass(item.severity)}`}>
                          {severityLabel(item.severity)}
                        </span>
                      </div>
                      <div className="risk-live-meta">
                        المصدر: {item.source} · الحالة: {item.status} · المالك: {item.owner}
                      </div>
                      <div className="risk-live-note">{item.note}</div>
                    </article>
                  ))
                )}
              </div>
            </>
          ) : (
            <div className="workflow-empty">تم إخفاء المخرجات التالية.</div>
          )}
        </article>
      </section>

      <section
        id={RISK_SECTION_ANCHORS.actions}
        ref={(node) => setSectionRef("actions", node)}
        className={`oms-panel ${highlightedSection === "actions" ? "risk-panel-highlight" : ""}`}
      >
        <div className="risk-section-head">
          <h2 className="oms-section-title">إجراء تنفيذي</h2>
          <button
            className="oms-btn oms-btn-ghost"
            type="button"
            ref={(node) => setSectionFocusRef("actions", node)}
            onClick={() => (sectionsOpen.actions ? toggleSection("actions") : navigateToSection("actions"))}
          >
            {sectionsOpen.actions ? "إخفاء" : "عرض"}
          </button>
        </div>
        {sectionsOpen.actions ? (
          <>
            <div className={`risk-decision-banner tone-${riskBundle.decision.tone}`}>{riskBundle.decision.message}</div>
            <div className="risk-footer-actions">
              <Link href="/app/strategy/decision" className="oms-btn oms-btn-primary">
                الانتقال إلى القرار التنفيذي النهائي
              </Link>
              <Link href="/app/strategy/execution/plan" className="oms-btn oms-btn-ghost">
                العودة إلى الخطة الزمنية
              </Link>
              <Link href="/app/strategy/workspace" className="oms-btn oms-btn-ghost">
                فتح محرك التحليل الحالي
              </Link>
            </div>
          </>
        ) : (
          <div className="workflow-empty">تم إخفاء الإجراءات التنفيذية.</div>
        )}
      </section>

      <style>{`
        .risk-hierarchy-head {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          flex-wrap: wrap;
        }

        .risk-hierarchy-meta {
          margin-top: 6px;
          color: var(--oms-text-muted);
          font-size: 12px;
          line-height: 1.6;
        }

        .risk-hierarchy-actions {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
        }

        .risk-section-tabs {
          margin-top: 10px;
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 8px;
        }

        .risk-section-tab {
          min-height: 36px;
          border-radius: var(--oms-radius-sm);
          border: 1px solid var(--oms-border-strong);
          background: rgba(8, 14, 26, 0.78);
          color: var(--oms-text-muted);
          font-weight: 800;
          cursor: pointer;
        }

        .risk-section-tab.is-open {
          border-color: var(--oms-border-accent);
          background: linear-gradient(180deg, rgba(127, 90, 240, 0.34), rgba(86, 60, 158, 0.22));
          color: var(--oms-text);
        }

        .risk-section-head {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          flex-wrap: wrap;
        }

        .risk-panel-highlight {
          border-color: rgba(167, 115, 255, 0.72);
          box-shadow: 0 0 0 1px rgba(167, 115, 255, 0.24), 0 0 26px rgba(128, 69, 242, 0.18);
          animation: risk-panel-pulse 1.1s ease;
        }

        .risk-kpi-grid {
          margin-top: 10px;
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 8px;
        }

        .risk-kpi-card {
          border: 1px solid var(--oms-border-strong);
          border-radius: var(--oms-radius-md);
          background: rgba(8, 16, 31, 0.72);
          padding: 10px;
          display: grid;
          gap: 4px;
        }

        .risk-kpi-card.tone-ok {
          border-color: rgba(88, 214, 165, 0.56);
          background: rgba(14, 56, 45, 0.72);
        }

        .risk-kpi-card.tone-warn {
          border-color: rgba(232, 182, 102, 0.56);
          background: rgba(66, 47, 20, 0.72);
        }

        .risk-kpi-card.tone-risk {
          border-color: rgba(247, 106, 121, 0.58);
          background: rgba(70, 20, 33, 0.74);
        }

        .risk-kpi-label {
          color: var(--oms-text-faint);
          font-size: 12px;
        }

        .risk-kpi-value {
          font-size: 20px;
          font-weight: 900;
          line-height: 1.3;
        }

        .risk-kpi-meta {
          color: var(--oms-text-muted);
          font-size: 12px;
          line-height: 1.7;
        }

        .risk-live-list {
          margin-top: 10px;
          display: grid;
          gap: 8px;
        }

        .risk-live-item {
          border: 1px solid var(--oms-border);
          border-radius: var(--oms-radius-md);
          background: rgba(8, 14, 27, 0.76);
          padding: 9px;
          display: grid;
          gap: 4px;
        }

        .risk-live-head {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
        }

        .risk-live-meta {
          color: var(--oms-text-faint);
          font-size: 12px;
          line-height: 1.6;
        }

        .risk-live-note {
          color: var(--oms-text-muted);
          font-size: 13px;
          line-height: 1.7;
        }

        .risk-severity-badge {
          min-height: 22px;
          border-radius: 999px;
          border: 1px solid var(--oms-border-strong);
          padding: 0 8px;
          font-size: 11px;
          font-weight: 800;
          display: inline-flex;
          align-items: center;
          white-space: nowrap;
        }

        .risk-severity-badge.severity-low {
          border-color: rgba(102, 180, 232, 0.54);
          color: #cce8ff;
          background: rgba(20, 44, 70, 0.72);
        }

        .risk-severity-badge.severity-medium {
          border-color: rgba(232, 182, 102, 0.54);
          color: #ffd996;
          background: rgba(66, 47, 20, 0.74);
        }

        .risk-severity-badge.severity-high,
        .risk-severity-badge.severity-critical {
          border-color: rgba(247, 106, 121, 0.58);
          color: #ffbcc4;
          background: rgba(70, 20, 33, 0.74);
        }

        .risk-decision-banner {
          margin-top: 10px;
          border: 1px solid var(--oms-border-strong);
          border-radius: var(--oms-radius-sm);
          padding: 10px;
          font-size: 13px;
          line-height: 1.8;
        }

        .risk-decision-banner.tone-ok {
          border-color: rgba(88, 214, 165, 0.56);
          background: rgba(14, 56, 45, 0.72);
          color: #c5f5e3;
        }

        .risk-decision-banner.tone-warn {
          border-color: rgba(232, 182, 102, 0.56);
          background: rgba(66, 47, 20, 0.74);
          color: #ffe7bc;
        }

        .risk-decision-banner.tone-risk {
          border-color: rgba(247, 106, 121, 0.58);
          background: rgba(70, 20, 33, 0.74);
          color: #ffcfd4;
        }

        @keyframes risk-panel-pulse {
          0% {
            box-shadow: 0 0 0 0 rgba(128, 69, 242, 0);
          }
          35% {
            box-shadow: 0 0 0 2px rgba(167, 115, 255, 0.28), 0 0 30px rgba(128, 69, 242, 0.24);
          }
          100% {
            box-shadow: 0 0 0 1px rgba(167, 115, 255, 0.24), 0 0 26px rgba(128, 69, 242, 0.18);
          }
        }

        .risk-footer-actions {
          margin-top: 10px;
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
        }

        @media (max-width: 900px) {
          .risk-section-tabs {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }

          .risk-kpi-grid {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 760px) {
          .risk-section-tabs {
            grid-template-columns: 1fr;
          }

          .risk-footer-actions .oms-btn,
          .risk-hierarchy-actions .oms-btn {
            width: 100%;
            justify-content: center;
          }
        }
      `}</style>
    </main>
  );
}

function createEmptyRiskBundle(): RiskBundle {
  return {
    projectName: "مشروع غير محدد",
    stageLabel: "غير محدد",
    summary: {
      totalOpen: 0,
      critical: 0,
      escalated: 0,
      regulatoryPending: 0,
      budgetPending: 0,
      workspaceOpen: 0,
      planOpen: 0,
    },
    scopeItems: ["لا توجد بيانات مخاطر حتى الآن."],
    nextDeliverables: ["ابدأ بتعبئة بيانات المشروع ثم أنشئ سجل المخاطر."],
    decision: {
      label: "مستقر",
      tone: "ok",
      message: "لا توجد مخاطر مفتوحة حاليًا.",
    },
    topRows: [],
  };
}

function safeParse<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function resolveRiskSectionFromHash(hash: string): RiskSectionKey | null {
  const normalizedHash = hash.replace(/^#/, "");
  const entry = (Object.entries(RISK_SECTION_ANCHORS) as Array<[RiskSectionKey, string]>).find(
    ([, anchor]) => anchor === normalizedHash
  );
  return entry ? entry[0] : null;
}

function workspaceSeverity(probability?: WorkspaceRiskLevel, impact?: WorkspaceRiskLevel): RiskSeverity {
  const score = riskLevelScore(probability) * riskLevelScore(impact);
  if (score >= 8) return "critical";
  if (score >= 6) return "high";
  if (score >= 3) return "medium";
  return "low";
}

function riskLevelScore(level?: WorkspaceRiskLevel): number {
  if (level === "مرتفع") return 3;
  if (level === "متوسط") return 2;
  return 1;
}

function severityWeight(severity: RiskSeverity): number {
  if (severity === "critical") return 4;
  if (severity === "high") return 3;
  if (severity === "medium") return 2;
  return 1;
}

function severityLabel(severity: RiskSeverity): string {
  if (severity === "critical") return "حرج";
  if (severity === "high") return "مرتفع";
  if (severity === "medium") return "متوسط";
  return "منخفض";
}

function severityClass(severity: RiskSeverity): string {
  if (severity === "critical") return "severity-critical";
  if (severity === "high") return "severity-high";
  if (severity === "medium") return "severity-medium";
  return "severity-low";
}

function isClosedStatus(status: string): boolean {
  return /مغلق|مكتمل|منفذ/.test(status);
}

function toArabicNumber(value: number) {
  return new Intl.NumberFormat("ar-SA").format(Math.max(0, Math.round(value)));
}
