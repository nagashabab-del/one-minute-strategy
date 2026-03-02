"use client";

import Link from "next/link";
import { useMemo } from "react";
import { readReports } from "../reports/report-store";

export default function WorkflowsPage() {
  const reports = useMemo(() => readReports(), []);
  const counts = useMemo(
    () => ({
      draft: reports.filter((item) => item.status === "مسودة").length,
      inAnalysis: 0,
      review: reports.filter((item) => item.status === "مكتمل").length,
      approved: reports.filter((item) => item.status === "معتمد").length,
    }),
    [reports]
  );

  return (
    <main>
      <h1 className="oms-page-title">سير العمل</h1>
      <p className="oms-page-subtitle">
        تتبع انتقال المشاريع بين مراحل التحليل والمراجعة والاعتماد.
      </p>

      <section className="oms-grid-auto" style={{ marginTop: 12 }}>
        <article className="oms-kpi-card">
          <div className="oms-kpi-label">Draft</div>
          <div style={stageMetaStyle}>المدخلات الأولية</div>
          <div className="oms-kpi-value">{counts.draft}</div>
        </article>
        <article className="oms-kpi-card">
          <div className="oms-kpi-label">In Analysis</div>
          <div style={stageMetaStyle}>قيد التحليل</div>
          <div className="oms-kpi-value">{counts.inAnalysis}</div>
        </article>
        <article className="oms-kpi-card">
          <div className="oms-kpi-label">Ready for Review</div>
          <div style={stageMetaStyle}>جاهز للمراجعة</div>
          <div className="oms-kpi-value">{counts.review}</div>
        </article>
        <article className="oms-kpi-card">
          <div className="oms-kpi-label">Approved</div>
          <div style={stageMetaStyle}>معتمد</div>
          <div className="oms-kpi-value">{counts.approved}</div>
        </article>
      </section>

      <section className="oms-panel">
        <h2 className="oms-section-title">إجراءات سريعة</h2>
        <div style={{ marginTop: 10, display: "flex", gap: 8, flexWrap: "wrap" }}>
          <Link href="/app/strategy" className="oms-btn oms-btn-primary">
            بدء تحليل جديد
          </Link>
          <Link href="/app/reports" className="oms-btn oms-btn-ghost">
            مراجعة التقارير
          </Link>
        </div>
      </section>
    </main>
  );
}

const stageMetaStyle = {
  marginTop: 4,
  color: "var(--oms-text-faint)",
  fontSize: 12,
} as const;
