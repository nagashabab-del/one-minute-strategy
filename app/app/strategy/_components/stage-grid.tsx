"use client";

import Link from "next/link";
import { STRATEGY_STAGES } from "../stages";
import { useStrategyReadinessState } from "./readiness-gate";
import { READINESS_STAGE_LOCK_REASON } from "../../_lib/readiness-lock";

const READINESS_BLOCK_REASON = READINESS_STAGE_LOCK_REASON;

export function StrategyStageGrid() {
  const { state, isLoading } = useStrategyReadinessState();
  const readinessMode = state?.summary.mode ?? "gap";
  const isGapMode = !isLoading && readinessMode === "gap";

  return (
    <section className="oms-grid-2" style={{ marginTop: 12 }}>
      {STRATEGY_STAGES.map((stage) => {
        const isBlocked = isGapMode && stage.id !== "brief";
        return (
          <article key={stage.id} className="oms-panel" style={{ marginTop: 0 }}>
            <h3 style={{ margin: 0, fontWeight: 800 }}>{stage.title}</h3>
            <p className="oms-text" style={{ marginTop: 6 }}>
              {stage.subtitle}
            </p>

            <div style={{ marginTop: 10, display: "grid", gap: 8 }}>
              {isBlocked ? (
                <>
                  <button
                    type="button"
                    className="oms-btn oms-btn-ghost"
                    disabled
                    title={READINESS_BLOCK_REASON}
                    style={{
                      opacity: 0.58,
                      cursor: "not-allowed",
                      borderColor: "rgba(244,126,126,0.45)",
                    }}
                  >
                    دخول المرحلة (مغلق مؤقتًا)
                  </button>
                  <div className="oms-list-line" style={{ color: "#ffb3b3" }}>
                    {READINESS_BLOCK_REASON}
                  </div>
                </>
              ) : (
                <Link href={stage.href} className="oms-btn oms-btn-ghost">
                  دخول المرحلة
                </Link>
              )}
            </div>
          </article>
        );
      })}
    </section>
  );
}
