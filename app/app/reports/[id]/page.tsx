"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useMemo } from "react";
import { StrategyReport, readReportById } from "../report-store";

export default function ReportDetailsPage() {
  const params = useParams<{ id: string }>();
  const report = useMemo<StrategyReport | null>(() => readReportById(params.id), [params.id]);

  if (!report) {
    return (
      <main>
        <h1 className="oms-page-title" style={{ fontSize: 24 }}>
          التقرير غير موجود
        </h1>
        <p className="oms-page-subtitle">
          لم يتم العثور على التقرير المطلوب.
        </p>
        <Link href="/app/reports" className="oms-btn oms-btn-ghost">
          رجوع إلى التقارير
        </Link>
      </main>
    );
  }

  return (
    <main>
      <Link href="/app/reports" className="oms-btn oms-btn-ghost">
        ← رجوع إلى قائمة التقارير
      </Link>

      <h1 className="oms-page-title" style={{ marginTop: 12 }}>
        {report.title}
      </h1>
      <p className="oms-page-subtitle">
        تاريخ التحديث: {report.date} • الحالة: {report.status}
      </p>

      <div className="oms-list">
        <section className="oms-panel">
          <h2 className="oms-section-title">القرار التنفيذي</h2>
          <p className="oms-text">{report.executiveDecision}</p>
        </section>

        <section className="oms-panel">
          <h2 className="oms-section-title">أبرز ملاحظات المستشارين</h2>
          {report.advisorsHighlights.map((line, idx) => (
            <div key={idx} className="oms-list-line">
              • {line}
            </div>
          ))}
        </section>

        <section className="oms-panel">
          <h2 className="oms-section-title">المخاطر</h2>
          {report.risks.map((line, idx) => (
            <div key={idx} className="oms-list-line">
              • {line}
            </div>
          ))}
        </section>

        <section className="oms-panel">
          <h2 className="oms-section-title">التوصيات</h2>
          {report.recommendations.map((line, idx) => (
            <div key={idx} className="oms-list-line">
              • {line}
            </div>
          ))}
        </section>
      </div>
    </main>
  );
}
