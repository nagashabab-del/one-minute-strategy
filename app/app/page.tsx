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
      <h1 className="oms-page-title">نظرة عامة</h1>
      <p className="oms-page-subtitle">
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
        <Link className="dashboard-action-card oms-card" href="/app/strategy" style={actionCardStyle}>
          <strong>ابدأ تحليل جديد</strong>
          <span style={cardHintStyle}>الانتقال إلى مساحة الاستراتيجية</span>
        </Link>

        <Link className="dashboard-action-card oms-card" href="/app/reports" style={actionCardStyle}>
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
        <div className="dashboard-kpi-card oms-kpi-card">
          <div className="oms-kpi-label">إجمالي التحليلات</div>
          <div className="dashboard-kpi-value oms-kpi-value">{reports.length}</div>
        </div>
        <div className="dashboard-kpi-card oms-kpi-card">
          <div className="oms-kpi-label">آخر تحليل</div>
          <div className="dashboard-kpi-value oms-kpi-value">{lastDate}</div>
        </div>
        <div className="dashboard-kpi-card oms-kpi-card">
          <div className="oms-kpi-label">تقارير معتمدة</div>
          <div className="dashboard-kpi-value oms-kpi-value">{approvedCount}</div>
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

const actionCardStyle = {
  color: "#F5F8FF",
  textDecoration: "none",
  padding: "14px 12px",
  minHeight: 86,
  display: "grid",
  alignContent: "space-between",
  gap: 8,
} as const;

const cardHintStyle = {
  color: "var(--oms-text-muted)",
  fontSize: 13,
} as const;
