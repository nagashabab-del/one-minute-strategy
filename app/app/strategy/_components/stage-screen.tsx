"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";

type StageScreenProps = {
  title: string;
  subtitle: string;
  objective: string;
  currentScope: string[];
  nextDeliverables: string[];
  primaryActionHref: string;
  primaryActionLabel: string;
  secondaryActionHref?: string;
  secondaryActionLabel?: string;
  workspaceHref?: string;
  workspaceLabel?: string;
};

type StageSectionKey = "objective" | "scope" | "deliverables" | "actions";

const STAGE_SECTION_DEFAULTS: Record<StageSectionKey, boolean> = {
  objective: true,
  scope: true,
  deliverables: true,
  actions: true,
};

const STAGE_SECTION_LABELS: Record<StageSectionKey, string> = {
  objective: "هدف المرحلة",
  scope: "النطاق الحالي",
  deliverables: "المخرجات التالية",
  actions: "الإجراء التنفيذي",
};

const STAGE_SECTION_ANCHORS: Record<StageSectionKey, string> = {
  objective: "stage-objective",
  scope: "stage-scope",
  deliverables: "stage-deliverables",
  actions: "stage-actions",
};

export default function StageScreen(props: StageScreenProps) {
  const scopeItems = useMemo(() => props.currentScope.slice(0, 2), [props.currentScope]);
  const deliverables = useMemo(() => props.nextDeliverables.slice(0, 2), [props.nextDeliverables]);
  const workspaceHref = props.workspaceHref ?? "/app/strategy/workspace";
  const workspaceLabel = props.workspaceLabel ?? "فتح محرك التحليل الحالي";
  const showWorkspaceAction = workspaceHref !== props.primaryActionHref;
  const showSecondaryAction =
    Boolean(props.secondaryActionHref) &&
    Boolean(props.secondaryActionLabel) &&
    props.secondaryActionHref !== props.primaryActionHref &&
    props.secondaryActionHref !== workspaceHref;

  const [sectionsOpen, setSectionsOpen] = useState<Record<StageSectionKey, boolean>>(STAGE_SECTION_DEFAULTS);
  const [highlightedSection, setHighlightedSection] = useState<StageSectionKey | null>(null);

  const sectionRefs = useRef<Record<StageSectionKey, HTMLElement | null>>({
    objective: null,
    scope: null,
    deliverables: null,
    actions: null,
  });
  const sectionFocusRefs = useRef<Record<StageSectionKey, HTMLElement | null>>({
    objective: null,
    scope: null,
    deliverables: null,
    actions: null,
  });

  const sectionKeys = Object.keys(STAGE_SECTION_LABELS) as StageSectionKey[];
  const openSectionsCount = sectionKeys.filter((section) => sectionsOpen[section]).length;

  function setSectionRef(section: StageSectionKey, node: HTMLElement | null) {
    sectionRefs.current[section] = node;
  }

  function setSectionFocusRef(section: StageSectionKey, node: HTMLElement | null) {
    sectionFocusRefs.current[section] = node;
  }

  function toggleSection(section: StageSectionKey) {
    setSectionsOpen((prev) => ({ ...prev, [section]: !prev[section] }));
  }

  function navigateToSection(section: StageSectionKey) {
    setSectionsOpen((prev) => ({ ...prev, [section]: true }));
    setHighlightedSection(section);
    if (typeof window === "undefined") return;

    const anchor = STAGE_SECTION_ANCHORS[section];
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

  useEffect(() => {
    if (typeof window === "undefined") return;
    const section = resolveStageSectionFromHash(window.location.hash);
    if (!section) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- open the deep-linked section once on first render
    navigateToSection(section);
  }, []);

  return (
    <main>
      <h1 className="oms-page-title">{props.title}</h1>
      <p className="oms-page-subtitle">{props.subtitle}</p>

      <section className="oms-panel">
        <div className="stage-hierarchy-head">
          <div>
            <h2 className="oms-section-title">هرمية هذه المرحلة</h2>
            <div className="stage-hierarchy-meta">
              مفتوح الآن: {toArabicNumber(openSectionsCount)} / {toArabicNumber(sectionKeys.length)}
            </div>
          </div>
          <div className="stage-hierarchy-actions">
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
            <button className="oms-btn oms-btn-ghost" type="button" onClick={() => setSectionsOpen(STAGE_SECTION_DEFAULTS)}>
              الوضع الافتراضي
            </button>
          </div>
        </div>
        <div className="stage-section-tabs">
          {sectionKeys.map((section) => (
            <button
              key={section}
              className={`stage-section-tab ${sectionsOpen[section] ? "is-open" : ""}`}
              type="button"
              onClick={() => navigateToSection(section)}
            >
              {STAGE_SECTION_LABELS[section]}
            </button>
          ))}
        </div>
      </section>

      <section
        id={STAGE_SECTION_ANCHORS.objective}
        ref={(node) => setSectionRef("objective", node)}
        className={`oms-panel ${highlightedSection === "objective" ? "stage-panel-highlight" : ""}`}
      >
        <div className="stage-section-head">
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
          <p className="oms-text">{props.objective}</p>
        ) : (
          <div className="workflow-empty">تم إخفاء هدف المرحلة. افتحه عند المراجعة.</div>
        )}
      </section>

      <section className="oms-grid-2" style={{ marginTop: 12 }}>
        <article
          id={STAGE_SECTION_ANCHORS.scope}
          ref={(node) => setSectionRef("scope", node)}
          className={`oms-panel ${highlightedSection === "scope" ? "stage-panel-highlight" : ""}`}
          style={{ marginTop: 0 }}
        >
          <div className="stage-section-head">
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
          id={STAGE_SECTION_ANCHORS.deliverables}
          ref={(node) => setSectionRef("deliverables", node)}
          className={`oms-panel ${highlightedSection === "deliverables" ? "stage-panel-highlight" : ""}`}
          style={{ marginTop: 0 }}
        >
          <div className="stage-section-head">
            <h2 className="oms-section-title">المخرجات التالية</h2>
            <button
              className="oms-btn oms-btn-ghost"
              type="button"
              ref={(node) => setSectionFocusRef("deliverables", node)}
              onClick={() => (sectionsOpen.deliverables ? toggleSection("deliverables") : navigateToSection("deliverables"))}
            >
              {sectionsOpen.deliverables ? "إخفاء" : "عرض"}
            </button>
          </div>
          {sectionsOpen.deliverables ? (
            deliverables.map((line, idx) => (
              <div key={idx} className="oms-list-line">
                • {line}
              </div>
            ))
          ) : (
            <div className="workflow-empty">تم إخفاء المخرجات التالية.</div>
          )}
        </article>
      </section>

      <section
        id={STAGE_SECTION_ANCHORS.actions}
        ref={(node) => setSectionRef("actions", node)}
        className={`oms-panel ${highlightedSection === "actions" ? "stage-panel-highlight" : ""}`}
      >
        <div className="stage-section-head">
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
          <div className="stage-footer-actions">
            <Link href={props.primaryActionHref} className="oms-btn oms-btn-primary">
              {props.primaryActionLabel}
            </Link>
            {showSecondaryAction ? (
              <Link href={props.secondaryActionHref!} className="oms-btn oms-btn-ghost">
                {props.secondaryActionLabel}
              </Link>
            ) : null}
            {showWorkspaceAction ? (
              <Link href={workspaceHref} className="oms-btn oms-btn-ghost">
                {workspaceLabel}
              </Link>
            ) : null}
          </div>
        ) : (
          <div className="workflow-empty">تم إخفاء الإجراءات التنفيذية.</div>
        )}
      </section>

      <style jsx>{`
        .stage-hierarchy-head {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 12px;
          flex-wrap: wrap;
        }
        .stage-hierarchy-meta {
          margin-top: 4px;
          color: var(--oms-text-faint);
          font-size: 12px;
          font-weight: 700;
        }
        .stage-hierarchy-actions {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
        }
        .stage-section-tabs {
          margin-top: 10px;
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
        }
        .stage-section-tab {
          min-height: 34px;
          border-radius: 12px;
          border: 1px solid var(--oms-border);
          background: rgba(10, 18, 36, 0.58);
          color: var(--oms-text-faint);
          font-weight: 800;
          padding: 0 12px;
          transition: border-color 160ms ease, color 160ms ease, background 160ms ease;
          cursor: pointer;
        }
        .stage-section-tab.is-open {
          border-color: rgba(149, 120, 255, 0.58);
          color: var(--oms-text);
          background: rgba(88, 58, 178, 0.24);
        }
        .stage-section-head {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          flex-wrap: wrap;
        }
        .stage-footer-actions {
          margin-top: 10px;
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }
        .stage-panel-highlight {
          animation: stage-panel-pulse 1100ms ease;
        }
        @keyframes stage-panel-pulse {
          0% {
            border-color: rgba(151, 122, 255, 0.72);
            box-shadow: 0 0 0 0 rgba(151, 122, 255, 0.28);
          }
          100% {
            border-color: var(--oms-border);
            box-shadow: 0 0 0 0 rgba(151, 122, 255, 0);
          }
        }
        @media (max-width: 900px) {
          .stage-hierarchy-actions {
            width: 100%;
          }
          .stage-hierarchy-actions .oms-btn {
            flex: 1 1 180px;
          }
        }
        @media (max-width: 720px) {
          .stage-section-tabs {
            display: grid;
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
          .stage-section-tab {
            width: 100%;
          }
          .stage-footer-actions .oms-btn,
          .stage-hierarchy-actions .oms-btn {
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

function resolveStageSectionFromHash(hash: string): StageSectionKey | null {
  const normalizedHash = hash.replace(/^#/, "");
  const entry = (Object.entries(STAGE_SECTION_ANCHORS) as Array<[StageSectionKey, string]>).find(
    ([, anchor]) => anchor === normalizedHash
  );
  return entry ? entry[0] : null;
}
