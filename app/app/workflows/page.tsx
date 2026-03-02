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
      <h1 style={{ margin: 0, fontSize: 28, fontWeight: 900 }}>سير العمل</h1>
      <p style={{ marginTop: 8, color: "rgba(226,235,255,0.78)", lineHeight: 1.8 }}>
        تتبع انتقال المشاريع بين مراحل التحليل والمراجعة والاعتماد.
      </p>

      <section
        style={{
          marginTop: 12,
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
          gap: 10,
        }}
      >
        <article style={stageCardStyle}>
          <div style={stageTitleStyle}>Draft</div>
          <div style={stageMetaStyle}>المدخلات الأولية</div>
          <div style={stageCountStyle}>{counts.draft}</div>
        </article>
        <article style={stageCardStyle}>
          <div style={stageTitleStyle}>In Analysis</div>
          <div style={stageMetaStyle}>قيد التحليل</div>
          <div style={stageCountStyle}>{counts.inAnalysis}</div>
        </article>
        <article style={stageCardStyle}>
          <div style={stageTitleStyle}>Ready for Review</div>
          <div style={stageMetaStyle}>جاهز للمراجعة</div>
          <div style={stageCountStyle}>{counts.review}</div>
        </article>
        <article style={stageCardStyle}>
          <div style={stageTitleStyle}>Approved</div>
          <div style={stageMetaStyle}>معتمد</div>
          <div style={stageCountStyle}>{counts.approved}</div>
        </article>
      </section>

      <section style={panelStyle}>
        <h2 style={sectionTitleStyle}>إجراءات سريعة</h2>
        <div style={{ marginTop: 10, display: "flex", gap: 8, flexWrap: "wrap" }}>
          <Link href="/app/strategy" style={primaryBtnStyle}>
            بدء تحليل جديد
          </Link>
          <Link href="/app/reports" style={secondaryBtnStyle}>
            مراجعة التقارير
          </Link>
        </div>
      </section>
    </main>
  );
}

const panelStyle = {
  marginTop: 12,
  borderRadius: 14,
  border: "1px solid rgba(138,160,255,0.22)",
  background: "linear-gradient(180deg, rgba(12,20,36,0.88), rgba(10,16,28,0.80))",
  padding: "12px",
} as const;

const sectionTitleStyle = {
  margin: 0,
  fontSize: 18,
  fontWeight: 900,
} as const;

const stageCardStyle = {
  borderRadius: 14,
  border: "1px solid rgba(138,160,255,0.22)",
  background: "linear-gradient(180deg, rgba(12,18,34,0.86), rgba(9,13,24,0.78))",
  padding: "12px 12px 14px",
} as const;

const stageTitleStyle = {
  fontSize: 14,
  fontWeight: 800,
} as const;

const stageMetaStyle = {
  marginTop: 4,
  color: "rgba(221,232,255,0.74)",
  fontSize: 12,
} as const;

const stageCountStyle = {
  marginTop: 8,
  fontSize: 30,
  fontWeight: 900,
} as const;

const primaryBtnStyle = {
  minHeight: 38,
  borderRadius: 10,
  border: "1px solid rgba(160,114,255,0.50)",
  background: "linear-gradient(180deg, rgba(131,64,242,0.94), rgba(88,39,187,0.92))",
  color: "#FFFFFF",
  fontWeight: 800,
  textDecoration: "none",
  padding: "0 12px",
  display: "inline-flex",
  alignItems: "center",
} as const;

const secondaryBtnStyle = {
  minHeight: 38,
  borderRadius: 10,
  border: "1px solid rgba(138,160,255,0.30)",
  background: "rgba(10,15,28,0.80)",
  color: "#F5F8FF",
  fontWeight: 800,
  textDecoration: "none",
  padding: "0 12px",
  display: "inline-flex",
  alignItems: "center",
} as const;
