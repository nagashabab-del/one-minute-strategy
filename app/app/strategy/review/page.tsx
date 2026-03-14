"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  evaluateStrategyReadiness,
  readActiveStrategyProject,
  readWorkspaceStage,
  workspaceStageLabel,
  type StrategyReadinessSummary,
} from "../_lib/readiness";

type ReviewSectionKey = "objective" | "scope" | "deliverables" | "actions";

const REVIEW_SECTION_DEFAULTS: Record<ReviewSectionKey, boolean> = {
  objective: true,
  scope: true,
  deliverables: true,
  actions: true,
};

const REVIEW_SECTION_LABELS: Record<ReviewSectionKey, string> = {
  objective: "هدف المرحلة",
  scope: "النطاق الحالي",
  deliverables: "المخرجات التالية",
  actions: "الإجراءات التنفيذية",
};

const REVIEW_SECTION_ANCHORS: Record<ReviewSectionKey, string> = {
  objective: "review-objective",
  scope: "review-scope",
  deliverables: "review-deliverables",
  actions: "review-actions",
};

export default function StrategyReviewPage() {
  const [sectionsOpen, setSectionsOpen] = useState<Record<ReviewSectionKey, boolean>>(REVIEW_SECTION_DEFAULTS);
  const [highlightedSection, setHighlightedSection] = useState<ReviewSectionKey | null>(null);
  const sectionRefs = useRef<Record<ReviewSectionKey, HTMLElement | null>>({
    objective: null,
    scope: null,
    deliverables: null,
    actions: null,
  });
  const sectionFocusRefs = useRef<Record<ReviewSectionKey, HTMLElement | null>>({
    objective: null,
    scope: null,
    deliverables: null,
    actions: null,
  });
  const sectionKeys = Object.keys(REVIEW_SECTION_LABELS) as ReviewSectionKey[];
  const openSectionsCount = sectionKeys.filter((section) => sectionsOpen[section]).length;

  function setSectionRef(section: ReviewSectionKey, node: HTMLElement | null) {
    sectionRefs.current[section] = node;
  }

  function setSectionFocusRef(section: ReviewSectionKey, node: HTMLElement | null) {
    sectionFocusRefs.current[section] = node;
  }

  function navigateToSection(section: ReviewSectionKey) {
    setSectionsOpen((prev) => ({ ...prev, [section]: true }));
    setHighlightedSection(section);
    if (typeof window === "undefined") return;

    const anchor = REVIEW_SECTION_ANCHORS[section];
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

  function toggleSection(section: ReviewSectionKey) {
    setSectionsOpen((prev) => ({ ...prev, [section]: !prev[section] }));
  }

  useEffect(() => {
    if (typeof window === "undefined") return;
    const section = resolveReviewSectionFromHash(window.location.hash);
    if (!section) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial hash hydration opens the target section once
    navigateToSection(section);
  }, []);

  const activeProject = useMemo(() => {
    if (typeof window === "undefined") return null;
    return readActiveStrategyProject();
  }, []);

  const projectName = activeProject?.name || "مشروع غير محدد";
  const stageLabel = activeProject ? workspaceStageLabel(readWorkspaceStage(activeProject.snapshot)) : "غير محدد";
  const readinessSummary: StrategyReadinessSummary | null = useMemo(() => {
    if (!activeProject) return null;
    return evaluateStrategyReadiness(activeProject.snapshot);
  }, [activeProject]);

  const closureDecision = useMemo(() => {
    if (!readinessSummary) {
      return {
        label: "قيد التحميل",
        tone: "neutral" as const,
        message: "جاري قراءة بيانات المشروع قبل تقييم جاهزية الإغلاق.",
      };
    }
    if (readinessSummary.mode === "gap") {
      return {
        label: "غير جاهز للإغلاق",
        tone: "risk" as const,
        message: "يوجد نقص في المتطلبات الحرجة. أكمل الحقول الحرجة أولًا قبل اعتماد الإغلاق.",
      };
    }
    if (readinessSummary.optionalMissing.length > 0) {
      return {
        label: "جاهز مع تحسينات",
        tone: "warn" as const,
        message: "يمكن الإغلاق، مع توصية بإكمال الحقول الاختيارية لتحسين دقة التقرير النهائي.",
      };
    }
    return {
      label: "جاهز للإغلاق",
      tone: "ok" as const,
      message: "كل الحقول الأساسية والمساندة مكتملة. يمكن رفع الحزمة النهائية للاعتماد.",
    };
  }, [readinessSummary]);

  const scopeItems = ["فحص جاهزية البنود قبل الإغلاق.", "مراجعة الالتزام الزمني والمالي."];
  const nextDeliverables = ["حزمة تقرير نهائي قابلة للعرض.", "نقطة انتقال واضحة إلى مساحة التقارير."];

  return (
    <main>
      <h1 className="oms-page-title">المراجعة النهائية</h1>
      <p className="oms-page-subtitle">نقطة ضبط قبل الإغلاق ورفع التقارير التنفيذية.</p>

      <section className="oms-panel">
        <div className="review-hierarchy-head">
          <div>
            <h2 className="oms-section-title">هرمية عرض المراجعة النهائية</h2>
            <div className="review-hierarchy-meta">
              مفتوح الآن: {toArabicNumber(openSectionsCount)} / {toArabicNumber(sectionKeys.length)}
            </div>
          </div>
          <div className="review-hierarchy-actions">
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
            <button
              className="oms-btn oms-btn-ghost"
              type="button"
              onClick={() => setSectionsOpen(REVIEW_SECTION_DEFAULTS)}
            >
              الوضع الافتراضي
            </button>
          </div>
        </div>
        <div className="review-section-tabs">
          {sectionKeys.map((section) => (
            <button
              key={section}
              className={`review-section-tab ${sectionsOpen[section] ? "is-open" : ""}`}
              type="button"
              onClick={() => navigateToSection(section)}
            >
              {REVIEW_SECTION_LABELS[section]}
            </button>
          ))}
        </div>
      </section>

      <section
        id={REVIEW_SECTION_ANCHORS.objective}
        ref={(node) => setSectionRef("objective", node)}
        className={`oms-panel ${highlightedSection === "objective" ? "review-panel-highlight" : ""}`}
      >
        <div className="review-section-head">
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
            <p className="oms-text">
              تجميع القرار، النطاق، المال، التقدم، والمخاطر في حزمة تنفيذية واحدة جاهزة للإدارة.
            </p>
            <div className="review-readiness-grid">
              <article className="review-readiness-card">
                <div className="review-readiness-label">المشروع الحالي</div>
                <div className="review-readiness-value">{projectName}</div>
                <div className="review-readiness-meta">المرحلة المسجلة: {stageLabel}</div>
              </article>
              <article className="review-readiness-card">
                <div className="review-readiness-label">مؤشر الجاهزية</div>
                <div className="review-readiness-value">
                  {readinessSummary ? `${toArabicNumber(readinessSummary.score)}%` : "—"}
                </div>
                <div className="review-readiness-meta">
                  حد القبول الأدنى: {readinessSummary ? `${toArabicNumber(readinessSummary.requiredScore)}%` : "—"}
                </div>
              </article>
              <article className={`review-readiness-card tone-${closureDecision.tone}`}>
                <div className="review-readiness-label">قرار الإغلاق</div>
                <div className="review-readiness-value">{closureDecision.label}</div>
                <div className="review-readiness-meta">{closureDecision.message}</div>
              </article>
            </div>
          </>
        ) : (
          <div className="workflow-empty">تم إخفاء هدف المرحلة. افتحه عند المراجعة.</div>
        )}
      </section>

      <section className="oms-grid-2" style={{ marginTop: 12 }}>
        <article
          id={REVIEW_SECTION_ANCHORS.scope}
          ref={(node) => setSectionRef("scope", node)}
          className={`oms-panel ${highlightedSection === "scope" ? "review-panel-highlight" : ""}`}
          style={{ marginTop: 0 }}
        >
          <div className="review-section-head">
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
            scopeItems.map((line, idx) => (
              <div key={idx} className="oms-list-line">
                • {line}
              </div>
            ))
          ) : (
            <div className="workflow-empty">تم إخفاء النطاق الحالي.</div>
          )}
        </article>

        <article
          id={REVIEW_SECTION_ANCHORS.deliverables}
          ref={(node) => setSectionRef("deliverables", node)}
          className={`oms-panel ${highlightedSection === "deliverables" ? "review-panel-highlight" : ""}`}
          style={{ marginTop: 0 }}
        >
          <div className="review-section-head">
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
              {nextDeliverables.map((line, idx) => (
                <div key={idx} className="oms-list-line">
                  • {line}
                </div>
              ))}
              <div className="review-checklist-wrap">
                <div className="review-checklist-head">قائمة تحقق الإغلاق</div>
                {readinessSummary ? (
                  <>
                    <div className="review-checklist-grid">
                      {readinessSummary.fields.map((field) => (
                        <article key={field.key} className={`review-check-item ${field.done ? "done" : "pending"}`}>
                          <div className="review-check-title">{field.label}</div>
                          <div className="review-check-state">
                            {field.done ? "مكتمل" : field.critical ? "حرج غير مكتمل" : "اختياري غير مكتمل"}
                          </div>
                        </article>
                      ))}
                    </div>
                    {readinessSummary.criticalMissing.length > 0 ? (
                      <div className="review-check-gap risk">
                        نواقص حرجة: {readinessSummary.criticalMissing.join("، ")}
                      </div>
                    ) : null}
                    {readinessSummary.optionalMissing.length > 0 ? (
                      <div className="review-check-gap warn">
                        تحسينات اختيارية: {readinessSummary.optionalMissing.join("، ")}
                      </div>
                    ) : null}
                  </>
                ) : (
                  <div className="workflow-empty">جاري تجهيز قائمة تحقق الإغلاق...</div>
                )}
              </div>
            </>
          ) : (
            <div className="workflow-empty">تم إخفاء المخرجات التالية.</div>
          )}
        </article>
      </section>

      <section
        id={REVIEW_SECTION_ANCHORS.actions}
        ref={(node) => setSectionRef("actions", node)}
        className={`oms-panel ${highlightedSection === "actions" ? "review-panel-highlight" : ""}`}
      >
        <div className="review-section-head">
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
            <div className={`review-decision-banner tone-${closureDecision.tone}`}>{closureDecision.message}</div>
            <div className="review-footer-actions">
              <Link
                href={readinessSummary?.mode === "gap" ? "/app/strategy/workspace" : "/app/reports"}
                className="oms-btn oms-btn-primary"
              >
                {readinessSummary?.mode === "gap" ? "استكمال الفجوات الحرجة" : "فتح مساحة التقارير"}
              </Link>
              <Link href="/app/strategy/decision" className="oms-btn oms-btn-ghost">
                العودة إلى القرار التنفيذي
              </Link>
              <Link href="/app/strategy/workspace" className="oms-btn oms-btn-ghost">
                فتح محرك التحليل الحالي
              </Link>
              <Link href="/app/settings" className="oms-btn oms-btn-ghost">
                ضبط الإعدادات قبل الإغلاق
              </Link>
            </div>
          </>
        ) : (
          <div className="workflow-empty">تم إخفاء الإجراءات التنفيذية.</div>
        )}
      </section>

      <style>{`
        .review-hierarchy-head {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          flex-wrap: wrap;
        }

        .review-hierarchy-meta {
          margin-top: 6px;
          color: var(--oms-text-muted);
          font-size: 12px;
          line-height: 1.6;
        }

        .review-hierarchy-actions {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
        }

        .review-section-tabs {
          margin-top: 10px;
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 8px;
        }

        .review-section-tab {
          min-height: 36px;
          border-radius: var(--oms-radius-sm);
          border: 1px solid var(--oms-border-strong);
          background: rgba(8, 14, 26, 0.78);
          color: var(--oms-text-muted);
          font-weight: 800;
          cursor: pointer;
        }

        .review-section-tab.is-open {
          border-color: var(--oms-border-accent);
          background: linear-gradient(180deg, rgba(127, 90, 240, 0.34), rgba(86, 60, 158, 0.22));
          color: var(--oms-text);
        }

        .review-section-head {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          flex-wrap: wrap;
        }

        .review-panel-highlight {
          border-color: rgba(167, 115, 255, 0.72);
          box-shadow: 0 0 0 1px rgba(167, 115, 255, 0.24), 0 0 26px rgba(128, 69, 242, 0.18);
          animation: review-panel-pulse 1.1s ease;
        }

        .review-readiness-grid {
          margin-top: 10px;
          display: grid;
          gap: 8px;
          grid-template-columns: repeat(3, minmax(0, 1fr));
        }

        .review-readiness-card {
          border: 1px solid var(--oms-border-strong);
          border-radius: var(--oms-radius-md);
          background: rgba(8, 16, 31, 0.72);
          padding: 10px;
          display: grid;
          gap: 4px;
        }

        .review-readiness-card.tone-ok {
          border-color: rgba(88, 214, 165, 0.58);
          background: rgba(13, 48, 39, 0.64);
        }

        .review-readiness-card.tone-warn {
          border-color: rgba(232, 182, 102, 0.56);
          background: rgba(57, 42, 15, 0.68);
        }

        .review-readiness-card.tone-risk {
          border-color: rgba(247, 106, 121, 0.6);
          background: rgba(62, 18, 30, 0.68);
        }

        .review-readiness-label {
          font-size: 12px;
          color: var(--oms-text-faint);
        }

        .review-readiness-value {
          font-size: 20px;
          font-weight: 900;
          line-height: 1.4;
        }

        .review-readiness-meta {
          color: var(--oms-text-muted);
          font-size: 12px;
          line-height: 1.7;
        }

        .review-checklist-wrap {
          margin-top: 10px;
          border: 1px solid var(--oms-border);
          border-radius: var(--oms-radius-md);
          background: rgba(9, 16, 29, 0.74);
          padding: 10px;
          display: grid;
          gap: 8px;
        }

        .review-checklist-head {
          font-size: 13px;
          font-weight: 800;
          color: var(--oms-text);
        }

        .review-checklist-grid {
          display: grid;
          gap: 8px;
          grid-template-columns: repeat(2, minmax(0, 1fr));
        }

        .review-check-item {
          border: 1px solid var(--oms-border-strong);
          border-radius: var(--oms-radius-sm);
          background: rgba(10, 18, 34, 0.72);
          padding: 8px;
          display: grid;
          gap: 3px;
        }

        .review-check-item.done {
          border-color: rgba(88, 214, 165, 0.48);
        }

        .review-check-item.pending {
          border-color: rgba(232, 182, 102, 0.44);
        }

        .review-check-title {
          font-size: 13px;
          font-weight: 800;
        }

        .review-check-state {
          color: var(--oms-text-muted);
          font-size: 12px;
        }

        .review-check-gap {
          border-radius: var(--oms-radius-sm);
          padding: 8px 10px;
          font-size: 12px;
          font-weight: 700;
          line-height: 1.7;
        }

        .review-check-gap.risk {
          border: 1px solid rgba(247, 106, 121, 0.56);
          background: rgba(62, 18, 30, 0.7);
          color: #ffbcc4;
        }

        .review-check-gap.warn {
          border: 1px solid rgba(232, 182, 102, 0.52);
          background: rgba(57, 42, 15, 0.74);
          color: #ffd996;
        }

        .review-decision-banner {
          margin-top: 10px;
          border: 1px solid var(--oms-border-strong);
          border-radius: var(--oms-radius-sm);
          padding: 10px;
          line-height: 1.8;
          font-size: 13px;
          color: var(--oms-text-muted);
        }

        .review-decision-banner.tone-ok {
          border-color: rgba(88, 214, 165, 0.56);
          background: rgba(13, 48, 39, 0.66);
          color: #c5f5e3;
        }

        .review-decision-banner.tone-warn {
          border-color: rgba(232, 182, 102, 0.52);
          background: rgba(57, 42, 15, 0.72);
          color: #ffe7bc;
        }

        .review-decision-banner.tone-risk {
          border-color: rgba(247, 106, 121, 0.58);
          background: rgba(62, 18, 30, 0.74);
          color: #ffcfd4;
        }

        @keyframes review-panel-pulse {
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

        .review-footer-actions {
          margin-top: 10px;
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
        }

        @media (max-width: 900px) {
          .review-section-tabs {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }

          .review-readiness-grid,
          .review-checklist-grid {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 760px) {
          .review-section-tabs {
            grid-template-columns: 1fr;
          }

          .review-footer-actions .oms-btn,
          .review-hierarchy-actions .oms-btn {
            width: 100%;
            justify-content: center;
          }
        }
      `}</style>
    </main>
  );
}

function toArabicNumber(value: number) {
  return new Intl.NumberFormat("ar-SA").format(value);
}

function resolveReviewSectionFromHash(hash: string): ReviewSectionKey | null {
  const normalizedHash = hash.replace(/^#/, "");
  const entry = (Object.entries(REVIEW_SECTION_ANCHORS) as Array<[ReviewSectionKey, string]>).find(
    ([, anchor]) => anchor === normalizedHash
  );
  return entry ? entry[0] : null;
}
