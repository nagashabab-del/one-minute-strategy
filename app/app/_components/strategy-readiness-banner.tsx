"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { READINESS_LOCK_REASON } from "../_lib/readiness-lock";
import { evaluateStrategyReadiness, readActiveStrategyProject } from "../strategy/_lib/readiness";

type StrategyReadinessMode = "loading" | "gap" | "advisory";

type StrategyReadinessState = {
  mode: StrategyReadinessMode;
  criticalMissingCount: number;
};

type StrategyReadinessBannerProps = {
  contextLabel: string;
};

export function useStrategyReadinessMode() {
  const [state, setState] = useState<StrategyReadinessState>({
    mode: "loading",
    criticalMissingCount: 0,
  });

  useEffect(() => {
    const update = () => setState(readCurrentReadiness());
    update();
    window.addEventListener("storage", update);
    return () => window.removeEventListener("storage", update);
  }, []);

  return state;
}

export default function StrategyReadinessBanner({ contextLabel }: StrategyReadinessBannerProps) {
  const readiness = useStrategyReadinessMode();

  if (readiness.mode !== "gap") return null;

  return (
    <section
      className="oms-panel"
      style={{
        borderColor: "rgba(244,126,126,0.42)",
        background: "linear-gradient(180deg, rgba(58, 23, 32, 0.72), rgba(25, 13, 19, 0.66))",
      }}
    >
      <h2 className="oms-section-title" style={{ margin: 0 }}>
        إجراءات مقفلة مؤقتًا بسبب فجوة بيانات
      </h2>
      <p className="oms-text" style={{ marginTop: 8 }}>
        في قسم {contextLabel} تم إيقاف بعض الإجراءات لأن موجز المشروع لا يزال ناقصًا ({toArabicNumber(
          readiness.criticalMissingCount
        )} حقول حرجة تقريبًا).
      </p>
      <p className="oms-text" style={{ marginTop: 6 }}>
        {READINESS_LOCK_REASON}
      </p>
      <div style={{ marginTop: 10, display: "flex", gap: 8, flexWrap: "wrap" }}>
        <Link href="/app/strategy/brief" className="oms-btn oms-btn-primary">
          استكمال موجز المشروع الآن
        </Link>
      </div>
    </section>
  );
}

function readCurrentReadiness(): StrategyReadinessState {
  const project = readActiveStrategyProject();
  const summary = evaluateStrategyReadiness(project.snapshot);
  return {
    mode: summary.mode,
    criticalMissingCount: summary.criticalMissing.length,
  };
}

function toArabicNumber(value: number) {
  return new Intl.NumberFormat("ar-SA").format(value);
}
