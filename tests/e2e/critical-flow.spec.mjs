import { expect, test } from "@playwright/test";

const PROJECTS_REGISTRY_KEY = "oms_dashboard_projects_registry_v1";
const PROJECT_DATA_KEY_PREFIX = "oms_dashboard_project_data_v1_";
const BUDGET_TRACKER_PREFIX = "oms_exec_budget_tracker_v1_";
const PLAN_TRACKER_PREFIX = "oms_exec_plan_tracker_v1_";
const FIRST_RUN_ONBOARDING_KEY = "oms_first_run_onboarding_v1";

const projectId = "project-e2e-1";
const projectTitle = "مشروع الاختبار";
const executiveDecision = "جاهز للتنفيذ بعد الإطلاق التجريبي";

const registrySnapshot = {
  activeProjectId: projectId,
  projects: [
    {
      id: projectId,
      name: projectTitle,
      updatedAt: "2026-03-06T10:00:00.000Z",
      isArchived: false,
    },
  ],
};

const projectSnapshot = {
  project: projectTitle,
  eventType: "مؤتمر",
  venueType: "قاعة مغلقة",
  startAt: "2026-03-10T19:00",
  endAt: "2026-03-10T22:00",
  budget: "150000",
  scopeSite: "منصة رئيسية مع منطقة استقبال",
  scopeTechnical: "صوت وإضاءة وشاشات عرض",
  scopeProgram: "جلسة افتتاح + عروض خبراء + ختام",
  reportText: "تقرير تنفيذي أولي للمراجعة.",
  advancedApproved: true,
  analysis: {
    executive_decision: {
      decision: executiveDecision,
    },
    strategic_analysis: {
      risks: ["تذبذب الطلب خلال أول شهرين."],
      top_3_upgrades: ["تنشيط المبيعات الرقمية", "تحسين دورة التحصيل"],
    },
    advisor_recommendations: {
      financial_advisor: {
        recommendations: ["ضبط سقف الائتمان للعملاء الرئيسيين."],
      },
      operations_advisor: {
        strategic_warning: "يلزم توحيد إجراءات التشغيل قبل التوسع.",
      },
    },
  },
};

const budgetSnapshot = {
  regulatoryCommitments: [
    {
      path: "municipality",
      required: true,
      status: "مكتمل",
      expiryDate: "2026-12-31",
    },
  ],
};

const planSnapshot = {
  regulatoryInsights: {
    regulatoryRiskScore: {
      level: "low",
    },
  },
};

test.beforeEach(async ({ page }) => {
  await page.addInitScript(
    ({
      onboardingKey,
      registryKey,
      projectKey,
      budgetKey,
      planKey,
      registry,
      project,
      budget,
      plan,
    }) => {
      window.localStorage.clear();
      window.localStorage.setItem(
        onboardingKey,
        JSON.stringify({
          version: 1,
          completedAt: "2026-03-06T00:00:00.000Z",
          skipped: true,
        })
      );
      window.localStorage.setItem(registryKey, JSON.stringify(registry));
      window.localStorage.setItem(projectKey, JSON.stringify(project));
      window.localStorage.setItem(budgetKey, JSON.stringify(budget));
      window.localStorage.setItem(planKey, JSON.stringify(plan));
    },
    {
      onboardingKey: FIRST_RUN_ONBOARDING_KEY,
      registryKey: PROJECTS_REGISTRY_KEY,
      projectKey: `${PROJECT_DATA_KEY_PREFIX}${projectId}`,
      budgetKey: `${BUDGET_TRACKER_PREFIX}${projectId}`,
      planKey: `${PLAN_TRACKER_PREFIX}${projectId}`,
      registry: registrySnapshot,
      project: projectSnapshot,
      budget: budgetSnapshot,
      plan: planSnapshot,
    }
  );
});

test("critical flow: reports list opens details with seeded workspace", async ({ page }) => {
  await page.goto("/app/reports");

  await expect(page.getByRole("heading", { name: "التقارير" })).toBeVisible();
  const reportCard = page.locator("article.reports-card").filter({ hasText: projectTitle });
  await expect(reportCard).toBeVisible();
  await expect(reportCard).toContainText("معتمد");

  await reportCard.getByRole("link", { name: "فتح التقرير" }).click();

  await expect(page).toHaveURL(new RegExp(`/app/reports/${projectId}$`));
  await expect(page.getByRole("heading", { name: projectTitle })).toBeVisible();
  await expect(page.getByText(executiveDecision)).toBeVisible();
  await expect(page.getByRole("button", { name: "تصدير Word (.docx)" })).toBeEnabled();
});

test("critical flow: missing report route shows recovery action", async ({ page }) => {
  await page.goto("/app/reports/does-not-exist");

  await expect(page.getByRole("heading", { name: "التقرير غير موجود" })).toBeVisible();
  const backToReports = page.getByRole("link", { name: "رجوع إلى التقارير" });
  await expect(backToReports).toBeVisible();
  await backToReports.click();
  await expect(page).toHaveURL(/\/app\/reports$/);
});
