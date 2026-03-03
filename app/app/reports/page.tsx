"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { StrategyReport, readReports } from "./report-store";

type StatusFilter = "الكل" | StrategyReport["status"];
type SortOption = "الأحدث" | "الأقدم" | "الحالة";

export default function ReportsPage() {
  const [reports] = useState<StrategyReport[]>(() => readReports());
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("الكل");
  const [sortBy, setSortBy] = useState<SortOption>("الأحدث");

  const statusCounts = useMemo(
    () => ({
      total: reports.length,
      approved: reports.filter((item) => item.status === "معتمد").length,
      completed: reports.filter((item) => item.status === "مكتمل").length,
      draft: reports.filter((item) => item.status === "مسودة").length,
    }),
    [reports]
  );

  const filteredReports = useMemo(() => {
    const normalizedQuery = search.trim().toLowerCase();
    const byFilter = reports.filter((item) => {
      const matchesStatus = statusFilter === "الكل" || item.status === statusFilter;
      const matchesQuery =
        normalizedQuery.length === 0 ||
        item.title.toLowerCase().includes(normalizedQuery) ||
        item.executiveDecision.toLowerCase().includes(normalizedQuery);
      return matchesStatus && matchesQuery;
    });

    return byFilter.sort((a, b) => {
      if (sortBy === "الأقدم") return a.date.localeCompare(b.date);
      if (sortBy === "الحالة") return statusRank(a.status) - statusRank(b.status);
      return b.date.localeCompare(a.date);
    });
  }, [reports, search, statusFilter, sortBy]);

  return (
    <main>
      <h1 className="oms-page-title">التقارير</h1>
      <p className="oms-page-subtitle">
        مساحة مراجعة واعتماد تقارير المشاريع مع فرز سريع حسب الحالة والوقت.
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
        <>
          <section className="oms-panel reports-toolbar">
            <div className="reports-toolbar-grid">
              <label className="reports-field">
                <span className="reports-field-label">بحث</span>
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="ابحث باسم المشروع أو القرار التنفيذي"
                  className="reports-input"
                />
              </label>

              <label className="reports-field">
                <span className="reports-field-label">الحالة</span>
                <select
                  value={statusFilter}
                  onChange={(event) => setStatusFilter(event.target.value as StatusFilter)}
                  className="reports-input"
                >
                  <option value="الكل">الكل</option>
                  <option value="معتمد">معتمد</option>
                  <option value="مكتمل">مكتمل</option>
                  <option value="مسودة">مسودة</option>
                </select>
              </label>

              <label className="reports-field">
                <span className="reports-field-label">الفرز</span>
                <select
                  value={sortBy}
                  onChange={(event) => setSortBy(event.target.value as SortOption)}
                  className="reports-input"
                >
                  <option value="الأحدث">الأحدث</option>
                  <option value="الأقدم">الأقدم</option>
                  <option value="الحالة">حسب الحالة</option>
                </select>
              </label>
            </div>

            <div className="reports-kpis">
              <div className="oms-kpi-card">
                <div className="oms-kpi-label">إجمالي التقارير</div>
                <div className="oms-kpi-value reports-kpi-value">{statusCounts.total}</div>
              </div>
              <div className="oms-kpi-card">
                <div className="oms-kpi-label">معتمدة</div>
                <div className="oms-kpi-value reports-kpi-value">{statusCounts.approved}</div>
              </div>
              <div className="oms-kpi-card">
                <div className="oms-kpi-label">مكتملة</div>
                <div className="oms-kpi-value reports-kpi-value">{statusCounts.completed}</div>
              </div>
              <div className="oms-kpi-card">
                <div className="oms-kpi-label">مسودات</div>
                <div className="oms-kpi-value reports-kpi-value">{statusCounts.draft}</div>
              </div>
            </div>
          </section>

          {filteredReports.length === 0 ? (
            <section className="oms-panel">
              <div style={{ fontWeight: 900, fontSize: 18 }}>لا توجد نتائج مطابقة</div>
              <p className="oms-text">غيّر الفلتر أو نص البحث لعرض تقارير أخرى.</p>
            </section>
          ) : (
            <div className="oms-list">
              {filteredReports.map((report) => (
                <article key={report.id} className="oms-panel reports-card">
                  <div className="reports-card-main">
                    <div className="reports-card-head">
                      <h2 className="reports-card-title">{report.title}</h2>
                      <span className={`reports-status ${statusClass(report.status)}`}>{report.status}</span>
                    </div>
                    <div className="reports-card-meta">تاريخ التحديث: {report.date}</div>
                    <p className="reports-card-preview">{truncate(report.executiveDecision, 130)}</p>
                    {report.regulatoryCompliance ? (
                      <div className="reports-card-compliance">
                        <span className={`reports-compliance-badge ${complianceClass(report.regulatoryCompliance.readiness)}`}>
                          امتثال تنظيمي: {report.regulatoryCompliance.readiness}
                        </span>
                        <span className="reports-card-meta">
                          مكتمل {report.regulatoryCompliance.completedCount}/{report.regulatoryCompliance.requiredCount}
                        </span>
                      </div>
                    ) : null}
                  </div>
                  <div className="reports-card-actions">
                    <Link href={`/app/reports/${report.id}`} className="oms-btn oms-btn-primary reports-open-btn">
                      فتح التقرير
                    </Link>
                  </div>
                </article>
              ))}
            </div>
          )}

          <style>{`
            .reports-toolbar-grid {
              display: grid;
              grid-template-columns: 1.5fr repeat(2, minmax(180px, 0.7fr));
              gap: 10px;
            }

            .reports-field {
              display: grid;
              gap: 6px;
            }

            .reports-field-label {
              font-size: 12px;
              font-weight: 800;
              color: var(--oms-text-faint);
            }

            .reports-input {
              min-height: 40px;
              border-radius: var(--oms-radius-sm);
              border: 1px solid var(--oms-border-strong);
              background: rgba(8, 14, 26, 0.82);
              color: var(--oms-text);
              padding: 0 10px;
              font-size: 14px;
            }

            .reports-kpis {
              margin-top: 10px;
              display: grid;
              grid-template-columns: repeat(4, minmax(0, 1fr));
              gap: 10px;
            }

            .reports-kpi-value {
              font-size: 24px;
            }

            .reports-card {
              display: grid;
              grid-template-columns: minmax(0, 1fr) auto;
              gap: 12px;
              align-items: center;
            }

            .reports-card-main {
              min-width: 0;
            }

            .reports-card-head {
              display: flex;
              align-items: center;
              justify-content: space-between;
              gap: 8px;
              flex-wrap: wrap;
            }

            .reports-card-title {
              margin: 0;
              font-size: 18px;
              font-weight: 900;
            }

            .reports-status {
              min-height: 24px;
              border-radius: 999px;
              padding: 0 9px;
              border: 1px solid var(--oms-border-strong);
              font-size: 12px;
              font-weight: 800;
              display: inline-flex;
              align-items: center;
              white-space: nowrap;
            }

            .reports-status.is-approved {
              border-color: rgba(88, 214, 165, 0.62);
              color: #78e3b9;
              background: rgba(14, 56, 45, 0.78);
            }

            .reports-status.is-complete {
              border-color: rgba(130, 164, 255, 0.58);
              color: #bfd3ff;
              background: rgba(20, 34, 65, 0.72);
            }

            .reports-status.is-draft {
              border-color: rgba(232, 182, 102, 0.58);
              color: #ffd996;
              background: rgba(66, 47, 20, 0.72);
            }

            .reports-card-meta {
              margin-top: 6px;
              color: var(--oms-text-faint);
              font-size: 13px;
            }

            .reports-card-preview {
              margin: 8px 0 0;
              color: var(--oms-text-muted);
              line-height: 1.7;
            }

            .reports-card-actions {
              display: flex;
              align-items: center;
              justify-content: flex-start;
            }

            .reports-card-compliance {
              margin-top: 8px;
              display: flex;
              align-items: center;
              gap: 8px;
              flex-wrap: wrap;
            }

            .reports-compliance-badge {
              min-height: 24px;
              border-radius: 999px;
              padding: 0 9px;
              border: 1px solid var(--oms-border-strong);
              font-size: 12px;
              font-weight: 800;
              display: inline-flex;
              align-items: center;
              white-space: nowrap;
            }

            .reports-compliance-badge.is-good {
              border-color: rgba(88, 214, 165, 0.62);
              color: #78e3b9;
              background: rgba(14, 56, 45, 0.78);
            }

            .reports-compliance-badge.is-warning {
              border-color: rgba(232, 182, 102, 0.58);
              color: #ffd996;
              background: rgba(66, 47, 20, 0.72);
            }

            .reports-compliance-badge.is-risk {
              border-color: rgba(247, 106, 121, 0.58);
              color: #ffbcc4;
              background: rgba(70, 20, 33, 0.74);
            }

            .reports-open-btn {
              white-space: nowrap;
            }

            @media (max-width: 980px) {
              .reports-toolbar-grid {
                grid-template-columns: 1fr;
              }

              .reports-kpis {
                grid-template-columns: repeat(2, minmax(0, 1fr));
              }

              .reports-card {
                grid-template-columns: 1fr;
                gap: 10px;
              }

              .reports-card-actions {
                width: 100%;
              }

              .reports-open-btn {
                width: 100%;
                justify-content: center;
              }
            }
          `}</style>
        </>
      )}
    </main>
  );
}

function truncate(text: string, maxChars: number) {
  const clean = text.trim();
  if (clean.length <= maxChars) return clean;
  return `${clean.slice(0, maxChars)}...`;
}

function statusClass(status: StrategyReport["status"]) {
  if (status === "معتمد") return "is-approved";
  if (status === "مكتمل") return "is-complete";
  return "is-draft";
}

function complianceClass(readiness: NonNullable<StrategyReport["regulatoryCompliance"]>["readiness"]) {
  if (readiness === "جاهز") return "is-good";
  if (readiness === "جزئي") return "is-warning";
  return "is-risk";
}

function statusRank(status: StrategyReport["status"]) {
  if (status === "معتمد") return 1;
  if (status === "مكتمل") return 2;
  return 3;
}
