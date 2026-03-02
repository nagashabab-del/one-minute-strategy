"use client";

import Link from "next/link";
import { useState } from "react";
import { MockReport, readReports } from "./report-store";

export default function ReportsPage() {
  const [reports] = useState<MockReport[]>(() => readReports());

  return (
    <main>
      <h1 style={{ margin: 0, fontSize: 28, fontWeight: 900 }}>Reports</h1>
      <p style={{ marginTop: 8, color: "rgba(226,235,255,0.78)", lineHeight: 1.8 }}>
        قائمة التقارير الحالية (Mock) لحين ربط قاعدة البيانات.
      </p>

      {reports.length === 0 ? (
        <div style={emptyStateStyle}>
          <div style={{ fontWeight: 900, fontSize: 18 }}>لا توجد تقارير حتى الآن</div>
          <p style={{ margin: "6px 0 0", color: "rgba(226,235,255,0.76)" }}>
            ابدأ تحليل جديد وسيظهر التقرير هنا لاحقًا.
          </p>
          <Link href="/app/strategy" style={primaryBtnStyle}>
            ابدأ تحليل جديد
          </Link>
        </div>
      ) : (
        <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
          {reports.map((report) => (
            <article key={report.id} style={reportCardStyle}>
              <div>
                <div style={{ fontWeight: 900, fontSize: 17 }}>{report.title}</div>
                <div style={{ marginTop: 6, color: "rgba(224,233,255,0.74)", fontSize: 13 }}>
                  التاريخ: {report.date} • الحالة: {report.status}
                </div>
              </div>
              <Link href={`/app/reports/${report.id}`} style={openBtnStyle}>
                فتح التقرير
              </Link>
            </article>
          ))}
        </div>
      )}
    </main>
  );
}

const reportCardStyle = {
  borderRadius: 14,
  border: "1px solid rgba(138,160,255,0.22)",
  background: "linear-gradient(180deg, rgba(12,20,36,0.88), rgba(10,16,28,0.80))",
  padding: "12px",
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 10,
  flexWrap: "wrap",
} as const;

const openBtnStyle = {
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

const primaryBtnStyle = {
  ...openBtnStyle,
  marginTop: 10,
} as const;

const emptyStateStyle = {
  marginTop: 12,
  borderRadius: 14,
  border: "1px solid rgba(138,160,255,0.22)",
  background: "linear-gradient(180deg, rgba(12,20,36,0.88), rgba(10,16,28,0.80))",
  padding: "18px 14px",
} as const;
