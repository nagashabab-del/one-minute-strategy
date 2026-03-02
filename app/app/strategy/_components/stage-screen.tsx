import Link from "next/link";

type StageScreenProps = {
  title: string;
  subtitle: string;
  objective: string;
  currentScope: string[];
  nextDeliverables: string[];
  primaryActionHref: string;
  primaryActionLabel: string;
};

export default function StageScreen(props: StageScreenProps) {
  return (
    <main>
      <h1 className="oms-page-title">{props.title}</h1>
      <p className="oms-page-subtitle">{props.subtitle}</p>

      <section className="oms-panel">
        <h2 className="oms-section-title">هدف المرحلة</h2>
        <p className="oms-text">{props.objective}</p>
      </section>

      <section className="oms-grid-2" style={{ marginTop: 12 }}>
        <article className="oms-panel" style={{ marginTop: 0 }}>
          <h2 className="oms-section-title">النطاق الحالي</h2>
          {props.currentScope.map((line, idx) => (
            <div key={idx} className="oms-list-line">
              • {line}
            </div>
          ))}
        </article>
        <article className="oms-panel" style={{ marginTop: 0 }}>
          <h2 className="oms-section-title">المخرجات التالية</h2>
          {props.nextDeliverables.map((line, idx) => (
            <div key={idx} className="oms-list-line">
              • {line}
            </div>
          ))}
        </article>
      </section>

      <section className="oms-panel">
        <h2 className="oms-section-title">إجراء تنفيذي</h2>
        <div style={{ marginTop: 10, display: "flex", flexWrap: "wrap", gap: 8 }}>
          <Link href={props.primaryActionHref} className="oms-btn oms-btn-primary">
            {props.primaryActionLabel}
          </Link>
          <Link href="/app/strategy/workspace" className="oms-btn oms-btn-ghost">
            فتح المحرك الحالي
          </Link>
        </div>
      </section>
    </main>
  );
}
