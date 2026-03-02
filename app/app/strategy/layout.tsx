"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { STRATEGY_STAGES, resolveActiveStageId, stageCompletionRatio } from "./stages";

export default function StrategyLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const pathname = usePathname();
  const activeId = resolveActiveStageId(pathname);
  const activeIndex = STRATEGY_STAGES.findIndex((item) => item.id === activeId);
  const completion = stageCompletionRatio(activeId);

  return (
    <div className="strategy-layout">
      <aside className="strategy-sidebar">
        <div className="strategy-sidebar-head">
          <div className="strategy-sidebar-title">مراحل الاستراتيجية</div>
          <div className="strategy-sidebar-progress">{completion}%</div>
        </div>

        <nav className="strategy-stage-list">
          {STRATEGY_STAGES.map((stage, idx) => {
            const active = stage.id === activeId;
            const completed = idx < activeIndex;
            const stateLabel = active ? "نشطة" : completed ? "مكتملة" : "قادمة";
            return (
              <Link
                key={stage.id}
                href={stage.href}
                className={`strategy-stage-link ${active ? "is-active" : ""} ${
                  completed ? "is-complete" : ""
                }`}
              >
                <span className="strategy-stage-row">
                  <span className="strategy-stage-title">{stage.title}</span>
                  <span className={`strategy-stage-state ${active ? "is-active" : completed ? "is-complete" : ""}`}>
                    {stateLabel}
                  </span>
                </span>
                <span className="strategy-stage-subtitle">{stage.subtitle}</span>
              </Link>
            );
          })}
        </nav>

        <Link href="/app/strategy/workspace" className="oms-btn oms-btn-ghost strategy-engine-btn">
          فتح محرك التحليل الحالي
        </Link>
      </aside>

      <section className="strategy-workspace">{children}</section>

      <style>{`
        .strategy-layout {
          display: grid;
          grid-template-columns: 265px minmax(0, 1fr);
          gap: 10px;
        }

        .strategy-sidebar {
          border: 1px solid var(--oms-border);
          border-radius: var(--oms-radius-lg);
          background: var(--oms-bg-panel);
          padding: 10px;
          height: fit-content;
          position: sticky;
          top: 10px;
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

        .strategy-stage-subtitle {
          font-size: 11px;
          color: var(--oms-text-faint);
          line-height: 1.3;
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
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
        }

        @media (max-width: 640px) {
          .strategy-stage-list {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
}
