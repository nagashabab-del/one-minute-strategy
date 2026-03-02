"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useMemo } from "react";
import { MockReport, readReportById } from "../report-store";

export default function ReportDetailsPage() {
  const params = useParams<{ id: string }>();
  const report = useMemo<MockReport | null>(() => readReportById(params.id), [params.id]);

  if (!report) {
    return (
      <main>
        <h1 style={{ margin: 0, fontSize: 24, fontWeight: 900 }}>التقرير غير موجود</h1>
        <p style={{ marginTop: 8, color: "rgba(226,235,255,0.78)" }}>
          لم يتم العثور على التقرير المطلوب.
        </p>
        <Link href="/app/reports" style={backBtnStyle}>
          رجوع إلى التقارير
        </Link>
      </main>
    );
  }

  return (
    <main>
      <Link href="/app/reports" style={backBtnStyle}>
        ← رجوع إلى قائمة التقارير
      </Link>

      <h1 style={{ margin: "12px 0 0", fontSize: 28, fontWeight: 900 }}>{report.title}</h1>
      <p style={{ marginTop: 8, color: "rgba(226,235,255,0.78)", lineHeight: 1.8 }}>
        التاريخ: {report.date} • الحالة: {report.status}
      </p>

      <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
        <section style={cardStyle}>
          <h2 style={sectionTitleStyle}>Executive decision</h2>
          <p style={sectionTextStyle}>{report.executiveDecision}</p>
        </section>

        <section style={cardStyle}>
          <h2 style={sectionTitleStyle}>Advisors highlights</h2>
          {report.advisorsHighlights.map((line, idx) => (
            <div key={idx} style={listLineStyle}>
              • {line}
            </div>
          ))}
        </section>

        <section style={cardStyle}>
          <h2 style={sectionTitleStyle}>Risks</h2>
          {report.risks.map((line, idx) => (
            <div key={idx} style={listLineStyle}>
              • {line}
            </div>
          ))}
        </section>

        <section style={cardStyle}>
          <h2 style={sectionTitleStyle}>Recommendations</h2>
          {report.recommendations.map((line, idx) => (
            <div key={idx} style={listLineStyle}>
              • {line}
            </div>
          ))}
        </section>
      </div>
    </main>
  );
}

const cardStyle = {
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

const sectionTextStyle = {
  marginTop: 8,
  color: "rgba(226,235,255,0.84)",
  lineHeight: 1.8,
} as const;

const listLineStyle = {
  marginTop: 6,
  color: "rgba(226,235,255,0.84)",
  lineHeight: 1.7,
} as const;

const backBtnStyle = {
  minHeight: 36,
  borderRadius: 10,
  border: "1px solid rgba(138,160,255,0.32)",
  background: "linear-gradient(180deg, rgba(11,18,33,0.88), rgba(8,13,24,0.84))",
  color: "#F5F8FF",
  textDecoration: "none",
  padding: "0 12px",
  display: "inline-flex",
  alignItems: "center",
  fontWeight: 800,
} as const;
