"use client";

import Link from "next/link";
import { useState } from "react";
import { StrategyReport, readReports } from "./report-store";

export default function ReportsPage() {
  const [reports] = useState<StrategyReport[]>(() => readReports());

  return (
    <main>
      <h1 className="oms-page-title">التقارير</h1>
      <p className="oms-page-subtitle">
        تقارير مبنية على بيانات المشاريع المحفوظة داخل مساحة الاستراتيجية.
      </p>

      {reports.length === 0 ? (
        <div className="oms-panel">
          <div style={{ fontWeight: 900, fontSize: 18 }}>لا توجد تقارير حتى الآن</div>
          <p style={{ margin: "6px 0 0", color: "var(--oms-text-muted)" }}>
            ابدأ تحليل جديد وسيظهر التقرير هنا لاحقًا.
          </p>
          <Link href="/app/strategy" className="oms-btn oms-btn-primary" style={{ marginTop: 10 }}>
            ابدأ تحليل جديد
          </Link>
        </div>
      ) : (
        <div className="oms-list">
          {reports.map((report) => (
            <article key={report.id} className="oms-panel" style={reportCardStyle}>
              <div>
                <div style={{ fontWeight: 900, fontSize: 17 }}>{report.title}</div>
                <div style={{ marginTop: 6, color: "var(--oms-text-muted)", fontSize: 13 }}>
                  تاريخ التحديث: {report.date} • الحالة: {report.status}
                </div>
              </div>
              <Link href={`/app/reports/${report.id}`} className="oms-btn oms-btn-primary">
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
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 10,
  flexWrap: "wrap",
} as const;
