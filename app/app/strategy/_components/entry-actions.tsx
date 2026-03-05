"use client";

import Link from "next/link";
import {
  hasStrategyWorkspaceProgress,
  readWorkspaceStage,
  workspaceStageLabel,
} from "../_lib/readiness";
import { useStrategyReadinessState } from "./readiness-gate";

export function StrategyEntryActions() {
  const { state, isLoading } = useStrategyReadinessState();

  if (isLoading || !state) {
    return (
      <div style={{ marginTop: 10 }}>
        <Link href="/app/strategy/brief" className="oms-btn oms-btn-primary">
          ابدأ من موجز المشروع
        </Link>
      </div>
    );
  }

  const stage = readWorkspaceStage(state.project.snapshot);
  const hasProgress = hasStrategyWorkspaceProgress(state.project.snapshot);
  const primaryHref = hasProgress ? "/app/strategy/workspace" : "/app/strategy/brief";
  const primaryLabel = hasProgress ? "استكمال الجلسة الحالية" : "ابدأ من موجز المشروع";
  const secondaryHref = hasProgress ? "/app/strategy/brief" : "/app/strategy/workspace";
  const secondaryLabel = hasProgress ? "بدء مسار جديد من الموجز" : "فتح المحرك مباشرة";
  const progressHint = hasProgress
    ? `آخر نقطة محفوظة: ${workspaceStageLabel(stage)}`
    : "لا توجد جلسة محفوظة بعد.";

  return (
    <div style={{ marginTop: 10, display: "grid", gap: 8 }}>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <Link href={primaryHref} className="oms-btn oms-btn-primary">
          {primaryLabel}
        </Link>
        <Link href={secondaryHref} className="oms-btn oms-btn-ghost">
          {secondaryLabel}
        </Link>
      </div>
      <div className="oms-list-line">{progressHint}</div>
    </div>
  );
}
