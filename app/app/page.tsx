"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import FirstRunOnboardingWizard from "./_components/first-run-onboarding-wizard";
import StrategyReadinessBanner, { useStrategyReadinessMode } from "./_components/strategy-readiness-banner";
import {
  isReadinessBlockedHref,
  READINESS_LOCK_REASON,
  resolveQuickStartForReadiness,
} from "./_lib/readiness-lock";
import { completeFirstRunOnboarding, shouldShowFirstRunOnboarding } from "./_lib/onboarding-state";
import { readReports } from "./reports/report-store";

type PriorityItem = {
  title: string;
  description: string;
  href: string;
  actionLabel: string;
  tone: "neutral" | "warning" | "success";
};

export default function DashboardPage() {
  const readiness = useStrategyReadinessMode();
  const inGapMode = readiness.mode === "gap";
  const quickStart = resolveQuickStartForReadiness(readiness.mode);
  const quickActionBlockedHint = READINESS_LOCK_REASON;
  const [showFirstRunOnboarding, setShowFirstRunOnboarding] = useState<boolean>(() => shouldShowFirstRunOnboarding());
  const reports = useMemo(() => readReports(), []);
  const approvedCount = reports.filter((item) => item.status === "معتمد").length;
  const completedCount = reports.filter((item) => item.status === "مكتمل").length;
  const draftCount = reports.filter((item) => item.status === "مسودة").length;
  const inReviewCount = Math.max(completedCount - approvedCount, 0);
  const openRiskCount = reports.filter((item) => !isNoRisk(item.risks)).length;
  const lastDate = reports[0]?.date ?? "—";
  const readinessScore = reports.length ? Math.round((approvedCount / reports.length) * 100) : 0;
  const readinessLabel = resolveReadinessLabel(readinessScore);
  const recentReports = reports.slice(0, 3);

  const priorities = buildPriorities({
    reportsCount: reports.length,
    draftCount,
    inReviewCount,
    openRiskCount,
  });

  const closeOnboarding = (skipped: boolean) => {
    completeFirstRunOnboarding(skipped);
    setShowFirstRunOnboarding(false);
  };

  return (
    <main>
      {showFirstRunOnboarding ? (
        <FirstRunOnboardingWizard
          quickStartHref={quickStart.href}
          onSkip={() => closeOnboarding(true)}
          onComplete={() => closeOnboarding(false)}
        />
      ) : null}

      <h1 className="oms-page-title">لوحة التحكم التنفيذية</h1>
      <p className="oms-page-subtitle">
        مركز قيادة القرار والتنفيذ: راقب الجاهزية، اعرف الأولويات، واتخذ الإجراء التالي فورًا.
      </p>

      <section className="oms-panel cockpit-quick-start">
        <h2 className="oms-section-title">ابدأ الآن</h2>
        <p className="cockpit-quick-start-text">
          اختر المسار مباشرة: ابدأ تحليل جديد، افتح مشروعًا سابقًا، أو راجع النظرة العامة.
        </p>
        <div className="cockpit-quick-actions">
          <Link className="oms-btn oms-btn-primary" href="/app/strategy/brief">
            تحليل جديد
          </Link>
          <Link className="oms-btn oms-btn-ghost" href="/app/workflows">
            فتح مشروع سابق
          </Link>
          <Link className="oms-btn oms-btn-ghost" href="/app">
            نظرة عامة
          </Link>
        </div>
      </section>

      <StrategyReadinessBanner contextLabel="نظرة عامة" />

      <section className="oms-panel cockpit-hero">
        <div className="cockpit-hero-top">
          <div>
            <div className="cockpit-chip">جاهزية المسار</div>
            <div className="cockpit-score">{readinessScore}%</div>
            <div className="cockpit-subline">{readinessLabel}</div>
          </div>
          <div className="cockpit-actions">
            <Link className="oms-btn oms-btn-primary" href={quickStart.href}>
              {quickStart.label}
            </Link>
            {inGapMode ? (
              <>
                <button
                  type="button"
                  className="oms-btn oms-btn-ghost cockpit-action-disabled"
                  disabled
                  title={quickActionBlockedHint}
                >
                  فتح مشروع سابق
                </button>
                <button
                  type="button"
                  className="oms-btn oms-btn-ghost cockpit-action-disabled"
                  disabled
                  title={quickActionBlockedHint}
                >
                  فتح التقارير
                </button>
              </>
            ) : (
              <>
                <Link className="oms-btn oms-btn-ghost" href="/app/workflows">
                  فتح مشروع سابق
                </Link>
                <Link className="oms-btn oms-btn-ghost" href="/app/reports">
                  فتح التقارير
                </Link>
              </>
            )}
          </div>
        </div>
      </section>

      <section className="cockpit-kpis">
        <article className="oms-kpi-card">
          <div className="oms-kpi-label">إجمالي التحليلات</div>
          <div className="oms-kpi-value">{reports.length}</div>
        </article>
        <article className="oms-kpi-card">
          <div className="oms-kpi-label">تقارير معتمدة</div>
          <div className="oms-kpi-value">{approvedCount}</div>
        </article>
        <article className="oms-kpi-card">
          <div className="oms-kpi-label">بانتظار الاعتماد</div>
          <div className="oms-kpi-value">{inReviewCount}</div>
        </article>
        <article className="oms-kpi-card">
          <div className="oms-kpi-label">مسودات قيد الإكمال</div>
          <div className="oms-kpi-value">{draftCount}</div>
        </article>
        <article className="oms-kpi-card">
          <div className="oms-kpi-label">آخر تحديث</div>
          <div className="oms-kpi-value cockpit-date">{lastDate}</div>
        </article>
      </section>

      <section className="cockpit-columns">
        <article className="oms-panel">
          <h2 className="oms-section-title">أولويات تنفيذية الآن</h2>
          <div className="cockpit-list">
            {priorities.map((item, idx) => (
              <div key={idx} className="cockpit-priority-card">
                <div>
                  <div className="cockpit-priority-title">{item.title}</div>
                  <div className="cockpit-priority-text">{item.description}</div>
                </div>
                {inGapMode && isReadinessBlockedHref(item.href) ? (
                  <button
                    type="button"
                    className={`${
                      item.tone === "warning" ? "oms-btn oms-btn-primary" : "oms-btn oms-btn-ghost"
                    } cockpit-action-disabled`}
                    disabled
                    title={quickActionBlockedHint}
                  >
                    {item.actionLabel}
                  </button>
                ) : (
                  <Link
                    href={inGapMode ? "/app/strategy/brief" : item.href}
                    className={item.tone === "warning" ? "oms-btn oms-btn-primary" : "oms-btn oms-btn-ghost"}
                  >
                    {item.actionLabel}
                  </Link>
                )}
              </div>
            ))}
          </div>
        </article>

        <article className="oms-panel">
          <h2 className="oms-section-title">آخر التقارير</h2>
          {recentReports.length === 0 ? (
            <div className="cockpit-empty">
              لا توجد تقارير بعد. ابدأ تحليل جديد ليظهر هنا موجز القرار التنفيذي.
            </div>
          ) : (
            <div className="cockpit-list">
              {recentReports.map((report) => (
                inGapMode ? (
                  <div key={report.id} className="cockpit-report-row cockpit-report-row-disabled" title={quickActionBlockedHint}>
                    <div>
                      <div className="cockpit-report-title">{report.title}</div>
                      <div className="cockpit-report-meta">الحالة: {report.status}</div>
                    </div>
                    <div className="cockpit-report-date">{report.date}</div>
                  </div>
                ) : (
                  <Link key={report.id} href={`/app/reports/${report.id}`} className="cockpit-report-row">
                    <div>
                      <div className="cockpit-report-title">{report.title}</div>
                      <div className="cockpit-report-meta">الحالة: {report.status}</div>
                    </div>
                    <div className="cockpit-report-date">{report.date}</div>
                  </Link>
                )
              ))}
            </div>
          )}
        </article>
      </section>

      <style>{`
        .cockpit-quick-start {
          margin-top: 12px;
          display: grid;
          gap: 8px;
          background: linear-gradient(145deg, rgba(20,33,58,0.92), rgba(14,24,41,0.86));
        }

        .cockpit-quick-start-text {
          color: var(--oms-text-muted);
          line-height: 1.75;
        }

        .cockpit-quick-actions {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
        }

        .cockpit-hero {
          background: linear-gradient(150deg, rgba(24,36,64,0.92), rgba(16,24,42,0.88));
        }

        .cockpit-hero-top {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          flex-wrap: wrap;
        }

        .cockpit-chip {
          display: inline-flex;
          min-height: 30px;
          padding: 0 10px;
          border-radius: 999px;
          border: 1px solid rgba(138, 160, 255, 0.32);
          align-items: center;
          font-size: 12px;
          font-weight: 800;
          color: var(--oms-text-faint);
          background: rgba(12, 20, 36, 0.76);
        }

        .cockpit-score {
          margin-top: 8px;
          font-size: 44px;
          line-height: 1;
          font-weight: 900;
        }

        .cockpit-subline {
          margin-top: 6px;
          color: var(--oms-text-muted);
          font-weight: 700;
        }

        .cockpit-actions {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
        }

        .cockpit-action-disabled {
          opacity: 0.58;
          cursor: not-allowed;
          border-color: rgba(244,126,126,0.42) !important;
          color: #ffb3b3 !important;
        }

        .cockpit-kpis {
          margin-top: 12px;
          display: grid;
          grid-template-columns: repeat(5, minmax(0, 1fr));
          gap: 10px;
        }

        .cockpit-date {
          font-size: 20px;
        }

        .cockpit-columns {
          margin-top: 12px;
          display: grid;
          grid-template-columns: minmax(0, 1.3fr) minmax(0, 1fr);
          gap: 10px;
        }

        .cockpit-list {
          margin-top: 10px;
          display: grid;
          gap: 8px;
        }

        .cockpit-priority-card {
          border: 1px solid var(--oms-border);
          border-radius: var(--oms-radius-md);
          background: var(--oms-bg-card);
          padding: 10px;
          display: grid;
          gap: 8px;
        }

        .cockpit-priority-title {
          font-weight: 800;
        }

        .cockpit-priority-text {
          margin-top: 4px;
          color: var(--oms-text-muted);
          line-height: 1.7;
        }

        .cockpit-empty {
          margin-top: 10px;
          border: 1px dashed var(--oms-border);
          border-radius: var(--oms-radius-md);
          padding: 12px;
          color: var(--oms-text-muted);
          line-height: 1.8;
          background: rgba(10, 16, 28, 0.55);
        }

        .cockpit-report-row {
          text-decoration: none;
          color: var(--oms-text);
          border: 1px solid var(--oms-border);
          border-radius: var(--oms-radius-md);
          padding: 10px;
          background: var(--oms-bg-card);
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
        }

        .cockpit-report-row-disabled {
          opacity: 0.6;
          cursor: not-allowed;
          border-color: rgba(244,126,126,0.36);
        }

        .cockpit-report-title {
          font-weight: 800;
        }

        .cockpit-report-meta {
          margin-top: 4px;
          color: var(--oms-text-muted);
          font-size: 13px;
        }

        .cockpit-report-date {
          font-size: 12px;
          color: var(--oms-text-faint);
          white-space: nowrap;
        }

        @media (max-width: 1080px) {
          .cockpit-kpis {
            grid-template-columns: repeat(3, minmax(0, 1fr));
          }

          .cockpit-columns {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 720px) {
          .cockpit-quick-actions {
            display: grid;
            grid-template-columns: 1fr;
          }

          .cockpit-hero-top {
            display: grid;
          }

          .cockpit-score {
            font-size: 34px;
          }

          .cockpit-actions {
            display: grid;
            grid-template-columns: 1fr;
          }

          .cockpit-kpis {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }

          .cockpit-date {
            font-size: 16px;
          }

          .cockpit-report-row {
            display: grid;
            gap: 6px;
          }

          .cockpit-report-date {
            white-space: normal;
          }
        }
      `}</style>
    </main>
  );
}


function isNoRisk(risks: string[]) {
  const first = risks[0]?.trim() ?? "";
  return first.startsWith("لا توجد مخاطر");
}

function resolveReadinessLabel(score: number) {
  if (score >= 70) return "جاهزية تشغيلية عالية";
  if (score >= 40) return "جاهزية متوسطة وتحتاج تسريع اعتماد";
  if (score > 0) return "جاهزية منخفضة وتتطلب إغلاق المسودات";
  return "لا توجد بيانات كافية بعد";
}

function buildPriorities(input: {
  reportsCount: number;
  draftCount: number;
  inReviewCount: number;
  openRiskCount: number;
}) {
  const items: PriorityItem[] = [];

  if (input.reportsCount === 0) {
    items.push({
      title: "لا يوجد تحليل منشور",
      description: "ابدأ أول تحليل لإنشاء خط قرار قابل للتنفيذ.",
      href: "/app/strategy",
      actionLabel: "ابدأ التحليل",
      tone: "warning",
    });
  }

  if (input.draftCount > 0) {
    items.push({
      title: `لديك ${input.draftCount} مسودة بحاجة إكمال`,
      description: "اكمل جمع المدخلات للوصول إلى قرار تنفيذي نهائي.",
      href: "/app/strategy",
      actionLabel: "إكمال المسودات",
      tone: "warning",
    });
  }

  if (input.inReviewCount > 0) {
    items.push({
      title: `${input.inReviewCount} تقارير بانتظار اعتماد`,
      description: "راجع المخرجات النهائية واعتمد الجاهز منها.",
      href: "/app/reports",
      actionLabel: "فتح قائمة الاعتماد",
      tone: "neutral",
    });
  }

  if (input.openRiskCount > 0) {
    items.push({
      title: `${input.openRiskCount} مشاريع تحمل مخاطر مفتوحة`,
      description: "راجع المخاطر والتوصيات قبل التصعيد التنفيذي.",
      href: "/app/reports",
      actionLabel: "مراجعة المخاطر",
      tone: "warning",
    });
  }

  if (items.length === 0) {
    items.push({
      title: "المسار التشغيلي مستقر",
      description: "استمر في توليد تحليلات جديدة مع الحفاظ على جودة الاعتماد.",
      href: "/app/strategy",
      actionLabel: "إنشاء تحليل جديد",
      tone: "success",
    });
  }

  return items.slice(0, 3);
}
