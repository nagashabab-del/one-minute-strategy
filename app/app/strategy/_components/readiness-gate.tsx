"use client";

import Link from "next/link";
import { useMemo, useSyncExternalStore } from "react";
import {
  ActiveStrategyProject,
  evaluateStrategyReadiness,
  readActiveStrategyProject,
  readActiveStrategyProjectId,
  StrategyReadinessSummary,
} from "../_lib/readiness";

type ReadinessState = {
  project: ActiveStrategyProject;
  summary: StrategyReadinessSummary;
};

type StrategyReadinessPanelProps = {
  stageLabel: string;
  compact?: boolean;
};

type StrategyReadinessChecklistProps = {
  title?: string;
  showOptional?: boolean;
};

type StrategyReadinessGuardProps = {
  children: React.ReactNode;
  blockedTitle: string;
  blockedDescription: string;
};

export function StrategyReadinessPanel({ stageLabel, compact = false }: StrategyReadinessPanelProps) {
  const { state, isLoading } = useStrategyReadinessState();

  if (isLoading || !state) {
    return (
      <section className="oms-panel">
        <h2 className="oms-section-title">بوابة جودة بيانات الاستشارة</h2>
        <p className="oms-text">جارٍ فحص جاهزية البيانات...</p>
      </section>
    );
  }

  return <ReadinessBody stageLabel={stageLabel} state={state} compact={compact} />;
}

export function StrategyReadinessChecklist({
  title = "قائمة جاهزية موجز المشروع",
  showOptional = false,
}: StrategyReadinessChecklistProps) {
  const { state, isLoading } = useStrategyReadinessState();

  if (isLoading || !state) {
    return (
      <section className="oms-panel">
        <h2 className="oms-section-title">{title}</h2>
        <p className="oms-text">جارٍ تحميل عناصر الجاهزية...</p>
      </section>
    );
  }

  const fields = state.summary.fields.filter((field) => showOptional || field.critical);
  const completedCount = fields.filter((field) => field.done).length;

  return (
    <section className="oms-panel">
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 8,
          flexWrap: "wrap",
        }}
      >
        <h2 className="oms-section-title" style={{ margin: 0 }}>
          {title}
        </h2>
        <span className="oms-list-line" style={{ fontWeight: 800 }}>
          {toArabicNumber(completedCount)}/{toArabicNumber(fields.length)}
        </span>
      </div>

      <p className="oms-text" style={{ marginTop: 8 }}>
        هذه القائمة تقرأ مباشرة من بيانات المشروع في محرك الاستراتيجية.
      </p>

      <div style={{ marginTop: 8, display: "grid", gap: 8 }}>
        {fields.map((field) => {
          const statusText = field.done ? "مكتمل" : field.critical ? "ناقص (حرج)" : "ناقص";
          const statusStyle = field.done
            ? {
                border: "1px solid rgba(95, 209, 153, 0.55)",
                background: "rgba(12, 44, 36, 0.72)",
                color: "#75e0b6",
              }
            : field.critical
              ? {
                  border: "1px solid rgba(244, 126, 126, 0.55)",
                  background: "rgba(52, 23, 27, 0.74)",
                  color: "#ffb3b3",
                }
              : {
                  border: "1px solid rgba(160, 178, 255, 0.34)",
                  background: "rgba(12, 20, 36, 0.72)",
                  color: "var(--oms-text-faint)",
                };

          return (
            <div
              key={field.key}
              style={{
                border: "1px solid var(--oms-border)",
                borderRadius: "12px",
                padding: "8px 10px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 8,
                flexWrap: "wrap",
                background: "var(--oms-bg-card)",
              }}
            >
              <span className="oms-list-line" style={{ margin: 0, fontWeight: 700 }}>
                {field.label}
              </span>
              <span
                style={{
                  minHeight: 22,
                  borderRadius: 999,
                  padding: "0 8px",
                  fontSize: 12,
                  fontWeight: 800,
                  display: "inline-flex",
                  alignItems: "center",
                  ...statusStyle,
                }}
              >
                {statusText}
              </span>
            </div>
          );
        })}
      </div>

      <div style={{ marginTop: 10, display: "flex", gap: 8, flexWrap: "wrap" }}>
        <Link href="/app/strategy/workspace" className="oms-btn oms-btn-ghost">
          فتح المحرك وتحديث البيانات
        </Link>
      </div>
    </section>
  );
}

export function StrategyReadinessGuard({
  children,
  blockedTitle,
  blockedDescription,
}: StrategyReadinessGuardProps) {
  const { state, isLoading } = useStrategyReadinessState();

  if (isLoading || !state) {
    return (
      <section className="oms-panel">
        <h2 className="oms-section-title">فحص جاهزية البيانات</h2>
        <p className="oms-text">جارٍ فحص المدخلات قبل فتح المرحلة...</p>
      </section>
    );
  }

  if (state.summary.mode === "gap") {
    return (
      <section className="oms-panel">
        <h2 className="oms-section-title">{blockedTitle}</h2>
        <p className="oms-text">{blockedDescription}</p>
        <ReadinessBody stageLabel="المرحلة الحالية" state={state} compact />
        <div style={{ marginTop: 10, display: "flex", gap: 8, flexWrap: "wrap" }}>
          <Link href="/app/strategy/brief" className="oms-btn oms-btn-ghost">
            الرجوع إلى موجز المشروع
          </Link>
          <Link href="/app/strategy/workspace" className="oms-btn oms-btn-primary">
            استكمال البيانات في المحرك
          </Link>
        </div>
      </section>
    );
  }

  return <>{children}</>;
}

function ReadinessBody({
  stageLabel,
  state,
  compact,
}: {
  stageLabel: string;
  state: ReadinessState;
  compact: boolean;
}) {
  const { project, summary } = state;
  const isAdvisory = summary.mode === "advisory";

  return (
    <section className={compact ? "" : "oms-panel"} style={compact ? { marginTop: 10 } : undefined}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 8,
          flexWrap: "wrap",
        }}
      >
        <h2 className="oms-section-title" style={{ margin: 0 }}>
          بوابة جودة بيانات الاستشارة
        </h2>
        <span
          style={{
            minHeight: 24,
            borderRadius: 999,
            padding: "0 9px",
            border: isAdvisory
              ? "1px solid rgba(88,214,165,0.62)"
              : "1px solid rgba(232,182,102,0.58)",
            background: isAdvisory ? "rgba(14,56,45,0.74)" : "rgba(66,47,20,0.72)",
            color: isAdvisory ? "#78e3b9" : "#ffd996",
            fontSize: 12,
            fontWeight: 800,
            display: "inline-flex",
            alignItems: "center",
            whiteSpace: "nowrap",
          }}
        >
          {isAdvisory ? "وضع الاستشارة" : "وضع فجوة البيانات"}
        </span>
      </div>

      <p className="oms-text" style={{ marginTop: 8 }}>
        {stageLabel} · المشروع الحالي: <strong>{project.name}</strong>
      </p>

      <div style={{ marginTop: 8, display: "flex", gap: 8, flexWrap: "wrap" }}>
        <div className="oms-list-line">اكتمال البيانات: {toArabicNumber(summary.score)}%</div>
        <div className="oms-list-line">الحد الأدنى قبل التحليل الكامل: {toArabicNumber(summary.requiredScore)}%</div>
      </div>

      {summary.criticalMissing.length > 0 ? (
        <div style={{ marginTop: 8 }}>
          <div className="oms-list-line" style={{ fontWeight: 800 }}>
            النواقص الحرجة:
          </div>
          {summary.criticalMissing.slice(0, 4).map((item) => (
            <div key={item} className="oms-list-line">
              • {item}
            </div>
          ))}
        </div>
      ) : (
        <div className="oms-list-line" style={{ marginTop: 8 }}>
          • الحقول الحرجة مكتملة، ويمكن الانتقال للتحليل التنفيذي.
        </div>
      )}

      {!isAdvisory ? (
        <div style={{ marginTop: 10 }}>
          <Link href="/app/strategy/workspace" className="oms-btn oms-btn-primary">
            استكمال البيانات قبل التحليل
          </Link>
        </div>
      ) : null}
    </section>
  );
}

function useStrategyReadinessState() {
  const signature = useSyncExternalStore(
    subscribeReadiness,
    getReadinessSnapshotSignature,
    getReadinessServerSnapshotSignature
  );
  const state = useMemo(() => {
    if (signature === "server") return null;
    return getReadinessSnapshot();
  }, [signature]);
  return { state, isLoading: state === null };
}

function toArabicNumber(value: number) {
  return new Intl.NumberFormat("ar-SA").format(value);
}

function subscribeReadiness(callback: () => void) {
  if (typeof window === "undefined") return () => {};
  window.addEventListener("storage", callback);
  return () => window.removeEventListener("storage", callback);
}

function getReadinessSnapshot(): ReadinessState {
  const project = readActiveStrategyProject();
  const summary = evaluateStrategyReadiness(project.snapshot);
  return { project, summary };
}

function getReadinessSnapshotSignature(): string {
  if (typeof window === "undefined") return "server";
  try {
    const activeProjectId = readActiveStrategyProjectId();
    if (!activeProjectId) return "empty";
    const projectRaw = localStorage.getItem(`oms_dashboard_project_data_v1_${activeProjectId}`) ?? "";
    return `${activeProjectId}::${projectRaw}`;
  } catch {
    return "unavailable";
  }
}

function getReadinessServerSnapshotSignature(): string {
  return "server";
}
