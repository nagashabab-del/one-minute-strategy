"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import FirstRunOnboardingWizard from "./_components/first-run-onboarding-wizard";
import StrategyReadinessBanner, { useStrategyReadinessMode } from "./_components/strategy-readiness-banner";
import {
  isReadinessActionBlocked,
  resolveReadinessBlockedHint,
  resolveReadinessNavigationHref,
} from "./_lib/readiness-actions";
import {
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

const PROJECTS_HUB_HREF = "/app/strategy/workspace?entry=projects";
const NEW_PROJECT_HUB_HREF = "/app/strategy/workspace?entry=projects&create=1";

export default function DashboardPage() {
  const router = useRouter();
  const [isNavigating, startNavigation] = useTransition();
  const [navigationHint, setNavigationHint] = useState("");
  const readiness = useStrategyReadinessMode();
  const inGapMode = readiness.mode === "gap";
  const quickStart = resolveQuickStartForReadiness(readiness.mode);
  const quickActionBlockedHint = resolveReadinessBlockedHint(inGapMode);
  const [needsFirstRunOnboarding, setNeedsFirstRunOnboarding] = useState<boolean>(() =>
    shouldShowFirstRunOnboarding()
  );
  const [showFirstRunOnboarding, setShowFirstRunOnboarding] = useState(false);
  const reports = useMemo(() => readReports(), []);
  const approvedCount = reports.filter((item) => item.status === "معتمد").length;
  const completedCount = reports.filter((item) => item.status === "مكتمل").length;
  const draftCount = reports.filter((item) => item.status === "مسودة").length;
  const inReviewCount = Math.max(completedCount - approvedCount, 0);
  const openRiskCount = reports.filter((item) => !isNoRisk(item.risks)).length;
  const lastDate = reports[0]?.date ?? "—";
  const recentReports = reports.slice(0, 3);

  const priorities = buildPriorities({
    reportsCount: reports.length,
    draftCount,
    inReviewCount,
    openRiskCount,
  });
  const nextPriority = priorities[0] ?? null;
  const additionalPriorities = priorities.slice(1);

  const closeOnboarding = (skipped: boolean) => {
    completeFirstRunOnboarding(skipped);
    setNeedsFirstRunOnboarding(false);
    setShowFirstRunOnboarding(false);
  };

  const navigateWithFeedback = (href: string, label: string) => {
    setNavigationHint(`جاري الانتقال إلى ${label}...`);
    startNavigation(() => {
      router.push(href);
    });
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

      {needsFirstRunOnboarding && !showFirstRunOnboarding ? (
        <section className="oms-panel cockpit-onboarding-hint">
          <div>
            <h2 className="oms-section-title">جولة تعريفية سريعة</h2>
            <p className="cockpit-quick-start-text">
              الجولة التعريفية اختيارية. يمكنك تشغيلها الآن أو تجاوزها والبدء مباشرة.
            </p>
          </div>
          <div className="cockpit-onboarding-actions">
            <button
              type="button"
              className="oms-btn oms-btn-primary"
              onClick={() => setShowFirstRunOnboarding(true)}
            >
              بدء الجولة التعريفية
            </button>
            <button
              type="button"
              className="oms-btn oms-btn-ghost"
              onClick={() => closeOnboarding(true)}
            >
              تخطي الآن
            </button>
          </div>
        </section>
      ) : null}

      <section className="oms-panel cockpit-quick-start">
        <h2 className="oms-section-title">ابدأ الآن</h2>
        <p className="cockpit-quick-start-text">
          اختر مسارك مباشرة: أنشئ مشروعًا جديدًا أو افتح مشروعًا سابقًا من الأرشيف.
        </p>
        <div className="cockpit-quick-actions">
          <button
            type="button"
            className="oms-btn oms-btn-primary"
            disabled={isNavigating}
            onClick={() => navigateWithFeedback(NEW_PROJECT_HUB_HREF, "مشروع جديد")}
          >
            مشروع جديد
          </button>
          <button
            type="button"
            className="oms-btn oms-btn-ghost"
            disabled={isNavigating}
            onClick={() => navigateWithFeedback(PROJECTS_HUB_HREF, "فتح مشروع سابق")}
          >
            فتح مشروع سابق
          </button>
        </div>
      </section>

      {isNavigating ? (
        <div className="cockpit-nav-loading" role="status" aria-live="polite" aria-atomic="true">
          <span className="cockpit-nav-loading-spinner" aria-hidden="true" />
          <span>{navigationHint || "جاري الانتقال..."}</span>
        </div>
      ) : null}

      <StrategyReadinessBanner contextLabel="نظرة عامة" />

      <section className="oms-panel cockpit-next-action">
        <div className="cockpit-next-action-head">
          <div>
            <div className="cockpit-chip">الإجراء التالي</div>
            <h2 className="oms-section-title" style={{ marginTop: 10 }}>
              {nextPriority?.title ?? "ابدأ المسار التنفيذي"}
            </h2>
            <p className="cockpit-next-action-text">
              {nextPriority?.description ?? "حدد أول خطوة تشغيلية ثم تابع التنفيذ بثبات."}
            </p>
          </div>
          <div className="cockpit-next-action-controls">
            {nextPriority && isReadinessActionBlocked(inGapMode, nextPriority.href) ? (
              <button
                type="button"
                className="oms-btn oms-btn-primary cockpit-action-disabled"
                disabled
                title={quickActionBlockedHint}
              >
                {nextPriority.actionLabel}
              </button>
            ) : (
              <button
                type="button"
                className="oms-btn oms-btn-primary"
                disabled={isNavigating}
                onClick={() =>
                  navigateWithFeedback(
                    nextPriority
                      ? resolveReadinessNavigationHref(inGapMode, nextPriority.href)
                      : quickStart.href,
                    nextPriority?.actionLabel ?? quickStart.label
                  )
                }
              >
                {nextPriority?.actionLabel ?? quickStart.label}
              </button>
            )}
            {inGapMode ? (
              <button
                type="button"
                className="oms-btn oms-btn-ghost cockpit-action-disabled"
                disabled
                title={quickActionBlockedHint}
              >
                فتح التقارير
              </button>
            ) : (
              <button
                type="button"
                className="oms-btn oms-btn-ghost"
                disabled={isNavigating}
                onClick={() => navigateWithFeedback("/app/reports", "فتح التقارير")}
              >
                فتح التقارير
              </button>
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
          <h2 className="oms-section-title">أولويات إضافية</h2>
          {additionalPriorities.length === 0 ? (
            <div className="cockpit-empty">
              <p>لا توجد أولويات إضافية الآن. يمكنك متابعة التنفيذ من الإجراء التالي.</p>
              <div className="cockpit-empty-actions">
                <button
                  type="button"
                  className="oms-btn oms-btn-primary"
                  disabled={isNavigating}
                  onClick={() => navigateWithFeedback(quickStart.href, quickStart.label)}
                >
                  {quickStart.label}
                </button>
                {inGapMode ? (
                  <button
                    type="button"
                    className="oms-btn oms-btn-ghost cockpit-action-disabled"
                    disabled
                    title={quickActionBlockedHint}
                  >
                    فتح التقارير
                  </button>
                ) : (
                  <button
                    type="button"
                    className="oms-btn oms-btn-ghost"
                    disabled={isNavigating}
                    onClick={() => navigateWithFeedback("/app/reports", "فتح التقارير")}
                  >
                    فتح التقارير
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="cockpit-list">
              {additionalPriorities.map((item, idx) => (
                <div key={idx} className="cockpit-priority-card">
                  <div>
                    <div className="cockpit-priority-title">{item.title}</div>
                    <div className="cockpit-priority-text">{item.description}</div>
                  </div>
                  {isReadinessActionBlocked(inGapMode, item.href) ? (
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
                    <button
                      type="button"
                      className={item.tone === "warning" ? "oms-btn oms-btn-primary" : "oms-btn oms-btn-ghost"}
                      disabled={isNavigating}
                      onClick={() =>
                        navigateWithFeedback(
                          resolveReadinessNavigationHref(inGapMode, item.href),
                          item.actionLabel
                        )
                      }
                    >
                      {item.actionLabel}
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </article>

        <article className="oms-panel">
          <h2 className="oms-section-title">آخر التقارير</h2>
          {recentReports.length === 0 ? (
            <div className="cockpit-empty">
              <p>لا توجد تقارير بعد. ابدأ تحليل جديد ليظهر هنا موجز القرار التنفيذي.</p>
              <div className="cockpit-empty-actions">
                <button
                  type="button"
                  className="oms-btn oms-btn-primary"
                  disabled={isNavigating}
                  onClick={() => navigateWithFeedback(NEW_PROJECT_HUB_HREF, "ابدأ تحليل جديد")}
                >
                  ابدأ تحليل جديد
                </button>
                <button
                  type="button"
                  className="oms-btn oms-btn-ghost"
                  disabled={isNavigating}
                  onClick={() => navigateWithFeedback(PROJECTS_HUB_HREF, "فتح مشروع سابق")}
                >
                  فتح مشروع سابق
                </button>
              </div>
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

        .cockpit-onboarding-hint {
          margin-top: 12px;
          display: grid;
          gap: 10px;
          background: linear-gradient(145deg, rgba(26,35,59,0.92), rgba(16,24,42,0.88));
        }

        .cockpit-onboarding-actions {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
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

        .cockpit-nav-loading {
          margin-top: 10px;
          border-radius: var(--oms-radius-md);
          border: 1px solid rgba(174,128,255,0.45);
          background: rgba(34,16,64,0.45);
          padding: 10px 12px;
          display: inline-flex;
          align-items: center;
          gap: 8px;
          color: #e2d6ff;
          font-size: 13px;
          font-weight: 700;
        }

        .cockpit-nav-loading-spinner {
          width: 12px;
          height: 12px;
          border-radius: 999px;
          border: 2px solid rgba(214,196,255,0.28);
          border-top-color: #cdb2ff;
          animation: cockpitSpin 0.9s linear infinite;
        }

        .cockpit-next-action {
          background: linear-gradient(150deg, rgba(24,36,64,0.92), rgba(16,24,42,0.88));
        }

        .cockpit-next-action-head {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          flex-wrap: wrap;
        }

        .cockpit-next-action-text {
          margin: 8px 0 0;
          color: var(--oms-text-muted);
          line-height: 1.8;
        }

        .cockpit-next-action-controls {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
        }

        .cockpit-next-action-controls .oms-btn-primary {
          min-width: 210px;
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

        .cockpit-empty p {
          margin: 0;
        }

        .cockpit-empty-actions {
          margin-top: 10px;
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
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

        @keyframes cockpitSpin {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
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
          .cockpit-onboarding-actions {
            display: grid;
            grid-template-columns: 1fr;
          }

          .cockpit-quick-actions {
            display: grid;
            grid-template-columns: 1fr;
          }

          .cockpit-next-action-head {
            display: grid;
          }

          .cockpit-next-action-controls {
            display: grid;
            grid-template-columns: 1fr;
          }

          .cockpit-next-action-controls .oms-btn-primary {
            min-width: 0;
            min-height: 46px;
          }

          .cockpit-empty-actions {
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
      href: NEW_PROJECT_HUB_HREF,
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
