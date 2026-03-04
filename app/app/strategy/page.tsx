import Link from "next/link";
import { StrategyReadinessChecklist, StrategyReadinessPanel } from "./_components/readiness-gate";
import { StrategyStageGrid } from "./_components/stage-grid";

export default function StrategyPage() {
  return (
    <main>
      <h1 className="oms-page-title">مركز الاستراتيجية والتنفيذ</h1>
      <p className="oms-page-subtitle">
        ابدأ بموجز مختصر ثم انتقل تدريجيًا إلى القرار، التخطيط، والتشغيل التنفيذي للمشروع.
      </p>

      <section className="oms-panel" style={{ background: "linear-gradient(150deg, rgba(24,36,64,0.92), rgba(16,24,42,0.88))" }}>
        <h2 className="oms-section-title">المسار المقترح</h2>
        <p className="oms-text">
          اتبع المراحل من اليمين إلى اليسار: موجز المشروع ← جلسة المستشارين ← القرار التنفيذي ← إعداد
          التشغيل.
        </p>
        <div style={{ marginTop: 10, display: "flex", gap: 8, flexWrap: "wrap" }}>
          <Link href="/app/strategy/brief" className="oms-btn oms-btn-primary">
            ابدأ من موجز المشروع
          </Link>
        </div>
      </section>

      <StrategyReadinessPanel stageLabel="مركز الاستراتيجية" compact />
      <StrategyReadinessChecklist title="جاهزية الدخول للمسارات التحليلية" />

      <StrategyStageGrid />
    </main>
  );
}
