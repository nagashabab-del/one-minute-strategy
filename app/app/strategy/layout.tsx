"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { useStrategyReadinessState } from "./_components/readiness-gate";
import { READINESS_STAGE_LOCK_REASON } from "../_lib/readiness-lock";
import { STRATEGY_STAGES, resolveActiveStageId, stageCompletionRatio } from "./stages";

export default function StrategyLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const pathname = usePathname();
  const [mobileStagesOpen, setMobileStagesOpen] = useState(false);
  const activeId = resolveActiveStageId(pathname);
  const activeIndex = STRATEGY_STAGES.findIndex((item) => item.id === activeId);
  const completion = stageCompletionRatio(activeId);
  const activeStage = STRATEGY_STAGES.find((item) => item.id === activeId);
  const { state: readinessState, isLoading: readinessLoading } = useStrategyReadinessState();
  const hasActiveProject = !readinessLoading && readinessState?.project.id !== "global";
  const isGapMode = !readinessLoading && readinessState?.summary.mode === "gap";
  const sidebarBlockHint = READINESS_STAGE_LOCK_REASON;

  return (
    <div className={`strategy-layout ${hasActiveProject ? "" : "is-empty"}`}>
      {hasActiveProject ? (
        <aside className="strategy-sidebar">
          <div className="strategy-sidebar-head">
            <div className="strategy-sidebar-title">مراحل الاستراتيجية</div>
            <div className="strategy-sidebar-progress">{`${completion}%`}</div>
          </div>

          <button
            type="button"
            className="strategy-mobile-toggle"
            onClick={() => setMobileStagesOpen((prev) => !prev)}
          >
            <span>المرحلة الحالية: {activeStage?.title ?? "غير محددة"}</span>
            <span>{mobileStagesOpen ? "إخفاء المراحل" : "عرض المراحل"}</span>
          </button>

          {isGapMode ? (
            <div className="strategy-gap-hint">{sidebarBlockHint}</div>
          ) : null}

          <nav className={`strategy-stage-list ${mobileStagesOpen ? "is-open" : ""}`}>
            {STRATEGY_STAGES.map((stage, idx) => {
              const active = stage.id === activeId;
              const completed = idx < activeIndex;
              const blocked = isGapMode && stage.id !== "brief" && !active;
              const stateLabel = active ? "نشطة" : blocked ? "مغلقة" : completed ? "مكتملة" : "قادمة";
              const stageClassName = `strategy-stage-link ${active ? "is-active" : ""} ${
                completed ? "is-complete" : ""
              } ${blocked ? "is-blocked" : ""}`;
              const stateClassName = `strategy-stage-state ${
                active ? "is-active" : completed ? "is-complete" : ""
              } ${blocked ? "is-blocked" : ""}`;

              const content = (
                <>
                  <span className="strategy-stage-row">
                    <span className="strategy-stage-title">{stage.title}</span>
                    <span className={stateClassName}>{stateLabel}</span>
                  </span>
                  <span className="strategy-stage-subtitle">{stage.subtitle}</span>
                </>
              );

              if (blocked) {
                return (
                  <div key={stage.id} className={stageClassName} title={sidebarBlockHint} aria-disabled>
                    {content}
                  </div>
                );
              }

              return (
                <Link
                  key={stage.id}
                  href={stage.href}
                  className={stageClassName}
                  onClick={() => setMobileStagesOpen(false)}
                >
                  {content}
                </Link>
              );
            })}
          </nav>

          <Link
            href="/app/strategy/workspace"
            className={`oms-btn oms-btn-ghost strategy-engine-btn ${mobileStagesOpen ? "is-open" : ""}`}
          >
            فتح محرك التحليل الحالي
          </Link>
        </aside>
      ) : null}

      <section className="strategy-workspace">{children}</section>

      <style>{`
        .strategy-layout {
          display: grid;
          grid-template-columns: 265px minmax(0, 1fr);
          gap: 10px;
        }

        .strategy-layout.is-empty {
          grid-template-columns: minmax(0, 1fr);
        }

        .strategy-sidebar {
          border: 1px solid var(--oms-border);
          border-radius: var(--oms-radius-lg);
          background: var(--oms-bg-panel);
          padding: 10px;
          height: fit-content;
          position: sticky;
          top: calc(var(--oms-shell-sticky-offset, 10px) + 8px);
          display: grid;
          gap: 10px;
        }

        .strategy-sidebar-head {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
        }

        .strategy-sidebar-title {
          font-size: 13px;
          color: var(--oms-text-faint);
          font-weight: 800;
        }

        .strategy-sidebar-progress {
          min-height: 24px;
          padding: 0 8px;
          border-radius: 999px;
          border: 1px solid var(--oms-border-strong);
          background: rgba(10, 15, 28, 0.8);
          display: inline-flex;
          align-items: center;
          font-size: 12px;
          font-weight: 900;
        }

        .strategy-mobile-toggle {
          display: none;
          min-height: 40px;
          border-radius: var(--oms-radius-sm);
          border: 1px solid var(--oms-border-strong);
          background: rgba(8, 14, 26, 0.84);
          color: var(--oms-text);
          font-weight: 800;
          padding: 0 10px;
          width: 100%;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
        }

        .strategy-stage-list {
          display: grid;
          gap: 6px;
        }

        .strategy-stage-link {
          text-decoration: none;
          color: var(--oms-text);
          border-radius: var(--oms-radius-sm);
          border: 1px solid var(--oms-border);
          background: var(--oms-bg-nav-idle);
          padding: 8px 9px;
          display: grid;
          gap: 4px;
          min-height: 52px;
        }

        .strategy-stage-link.is-complete {
          border-color: rgba(95, 209, 153, 0.5);
          background: linear-gradient(180deg, rgba(16, 36, 33, 0.94), rgba(9, 23, 20, 0.88));
        }

        .strategy-stage-link.is-active {
          border-color: rgba(174, 128, 255, 0.76);
          background: var(--oms-bg-nav-active);
          box-shadow: 0 0 0 1px rgba(174, 128, 255, 0.22), 0 8px 18px rgba(61, 24, 129, 0.42);
        }

        .strategy-stage-link.is-blocked {
          opacity: 0.58;
          cursor: not-allowed;
          border-color: rgba(244, 126, 126, 0.38);
          box-shadow: none;
        }

        .strategy-stage-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
        }

        .strategy-stage-title {
          font-size: 13px;
          font-weight: 800;
          line-height: 1.3;
        }

        .strategy-stage-state {
          min-height: 20px;
          border-radius: 999px;
          border: 1px solid rgba(138, 160, 255, 0.28);
          background: rgba(8, 14, 26, 0.72);
          color: var(--oms-text-faint);
          font-size: 10px;
          font-weight: 800;
          padding: 0 6px;
          display: inline-flex;
          align-items: center;
          white-space: nowrap;
        }

        .strategy-stage-state.is-complete {
          border-color: rgba(95, 209, 153, 0.55);
          color: #6ce3b5;
          background: rgba(13, 42, 35, 0.82);
        }

        .strategy-stage-state.is-active {
          border-color: rgba(186, 148, 255, 0.75);
          color: #f2e9ff;
          background: rgba(93, 39, 201, 0.45);
        }

        .strategy-stage-state.is-blocked {
          border-color: rgba(244, 126, 126, 0.45);
          color: #ffb3b3;
          background: rgba(52, 23, 27, 0.72);
        }

        .strategy-stage-subtitle {
          font-size: 11px;
          color: var(--oms-text-faint);
          line-height: 1.3;
        }

        .strategy-gap-hint {
          border: 1px solid rgba(244, 126, 126, 0.4);
          background: rgba(52, 23, 27, 0.66);
          color: #ffb3b3;
          border-radius: var(--oms-radius-sm);
          padding: 8px 10px;
          font-size: 12px;
          line-height: 1.6;
          font-weight: 700;
        }

        .strategy-engine-btn {
          width: 100%;
        }

        .strategy-workspace {
          min-width: 0;
        }

        @media (max-width: 920px) {
          .strategy-layout {
            grid-template-columns: 1fr;
          }

          .strategy-sidebar {
            position: static;
          }

          .strategy-stage-list {
            display: none;
          }

          .strategy-stage-list.is-open {
            display: grid;
            grid-template-columns: 1fr;
          }

          .strategy-mobile-toggle {
            display: inline-flex;
          }

          .strategy-engine-btn {
            display: none;
          }

          .strategy-engine-btn.is-open {
            display: inline-flex;
          }
        }

        @media (max-width: 640px) {
          .strategy-mobile-toggle {
            flex-direction: column;
            align-items: flex-start;
            justify-content: center;
            padding: 8px 10px;
          }
        }
      `}</style>
    </div>
  );
}
