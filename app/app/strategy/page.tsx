import Link from "next/link";
import { STRATEGY_STAGES } from "./stages";

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

      <section className="oms-grid-2" style={{ marginTop: 12 }}>
        {STRATEGY_STAGES.map((stage) => (
          <article key={stage.id} className="oms-panel" style={{ marginTop: 0 }}>
            <h3 style={{ margin: 0, fontWeight: 800 }}>{stage.title}</h3>
            <p className="oms-text" style={{ marginTop: 6 }}>
              {stage.subtitle}
            </p>
            <div style={{ marginTop: 10 }}>
              <Link href={stage.href} className="oms-btn oms-btn-ghost">
                دخول المرحلة
              </Link>
            </div>
          </article>
        ))}
      </section>
    </main>
  );
}
