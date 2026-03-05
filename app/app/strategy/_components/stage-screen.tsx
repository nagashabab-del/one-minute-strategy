import Link from "next/link";

type StageScreenProps = {
  title: string;
  subtitle: string;
  objective: string;
  currentScope: string[];
  nextDeliverables: string[];
  primaryActionHref: string;
  primaryActionLabel: string;
  workspaceHref?: string;
  workspaceLabel?: string;
};

export default function StageScreen(props: StageScreenProps) {
  const scopeItems = props.currentScope.slice(0, 2);
  const deliverables = props.nextDeliverables.slice(0, 2);
  const workspaceHref = props.workspaceHref ?? "/app/strategy/workspace";
  const workspaceLabel = props.workspaceLabel ?? "فتح محرك التحليل الحالي";
  const showWorkspaceAction = workspaceHref !== props.primaryActionHref;

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
          {scopeItems.map((line, idx) => (
            <div key={idx} className="oms-list-line">
              • {line}
            </div>
          ))}
        </article>
        <article className="oms-panel" style={{ marginTop: 0 }}>
          <h2 className="oms-section-title">المخرجات التالية</h2>
          {deliverables.map((line, idx) => (
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
          {showWorkspaceAction ? (
            <Link href={workspaceHref} className="oms-btn oms-btn-ghost">
              {workspaceLabel}
            </Link>
          ) : null}
        </div>
      </section>
    </main>
  );
}
