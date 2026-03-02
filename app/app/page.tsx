"use client";

import Link from "next/link";
import { useMemo } from "react";
import { readReports } from "./reports/report-store";

export default function DashboardPage() {
  const reports = useMemo(() => readReports(), []);
  const approvedCount = reports.filter((item) => item.status === "معتمد").length;
  const lastDate = reports[0]?.date ?? "—";

  return (
    <main>
      <h1 style={{ margin: 0, fontSize: 28, fontWeight: 900 }}>نظرة عامة</h1>
      <p style={{ marginTop: 8, color: "rgba(226,235,255,0.78)", lineHeight: 1.8 }}>
        مركز متابعة الحالة التنفيذية. ابدأ تحليل جديد أو راجع مخرجات المشاريع الحالية.
      </p>

      <section
        className="dashboard-actions-grid"
        style={{
          marginTop: 12,
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: 10,
        }}
      >
        <Link className="dashboard-action-card" href="/app/strategy" style={cardLinkStyle}>
          <strong>ابدأ تحليل جديد</strong>
          <span style={cardHintStyle}>الانتقال إلى مساحة الاستراتيجية</span>
        </Link>

        <Link className="dashboard-action-card" href="/app/reports" style={cardLinkStyle}>
          <strong>عرض التقارير</strong>
          <span style={cardHintStyle}>استعرض قائمة التقارير والتفاصيل</span>
        </Link>
      </section>

      <section
        className="dashboard-kpi-grid"
        style={{
          marginTop: 12,
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
          gap: 10,
        }}
      >
        <div className="dashboard-kpi-card" style={kpiCardStyle}>
          <div style={kpiLabelStyle}>إجمالي التحليلات</div>
          <div className="dashboard-kpi-value" style={kpiValueStyle}>
            {reports.length}
          </div>
        </div>
        <div className="dashboard-kpi-card" style={kpiCardStyle}>
          <div style={kpiLabelStyle}>آخر تحليل</div>
          <div className="dashboard-kpi-value" style={kpiValueStyle}>
            {lastDate}
          </div>
        </div>
        <div className="dashboard-kpi-card" style={kpiCardStyle}>
          <div style={kpiLabelStyle}>تقارير معتمدة</div>
          <div className="dashboard-kpi-value" style={kpiValueStyle}>
            {approvedCount}
          </div>
        </div>
      </section>

      <style>{`
        @media (max-width: 720px) {
          .dashboard-actions-grid {
            grid-template-columns: 1fr !important;
          }

          .dashboard-action-card {
            min-height: 76px !important;
            padding: 12px 10px !important;
          }

          .dashboard-kpi-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
          }

          .dashboard-kpi-card {
            padding: 10px !important;
          }

          .dashboard-kpi-value {
            margin-top: 6px !important;
            font-size: 22px !important;
          }
        }
      `}</style>
    </main>
  );
}

const cardLinkStyle = {
  borderRadius: 14,
  border: "1px solid rgba(138,160,255,0.24)",
  background: "linear-gradient(180deg, rgba(12,20,38,0.88), rgba(10,16,28,0.82))",
  color: "#F5F8FF",
  textDecoration: "none",
  padding: "14px 12px",
  minHeight: 86,
  display: "grid",
  alignContent: "space-between",
  gap: 8,
} as const;

const cardHintStyle = {
  color: "rgba(224,233,255,0.74)",
  fontSize: 13,
} as const;

const kpiCardStyle = {
  borderRadius: 14,
  border: "1px solid rgba(138,160,255,0.22)",
  background: "linear-gradient(180deg, rgba(12,18,34,0.86), rgba(9,13,24,0.78))",
  padding: "12px 12px 14px",
} as const;

const kpiLabelStyle = {
  color: "rgba(221,232,255,0.74)",
  fontSize: 12,
  fontWeight: 700,
} as const;

const kpiValueStyle = {
  marginTop: 8,
  fontSize: 28,
  fontWeight: 900,
} as const;
