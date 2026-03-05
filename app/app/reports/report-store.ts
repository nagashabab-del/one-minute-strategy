export type StrategyReport = {
  id: string;
  title: string;
  date: string;
  status: "مسودة" | "مكتمل" | "معتمد";
  executiveDecision: string;
  advisorsHighlights: string[];
  risks: string[];
  recommendations: string[];
  regulatoryCompliance?: {
    readiness: "جاهز" | "جزئي" | "خطر";
    requiredCount: number;
    completedCount: number;
    pendingPaths: string[];
  };
};

type ProjectsRegistry = {
  activeProjectId: string;
  projects: Array<{
    id: string;
    name: string;
    updatedAt?: string;
    isArchived?: boolean;
  }>;
};

type AdvisorRecommendation = {
  recommendations?: string[];
  strategic_warning?: string;
};

type ProjectSnapshot = {
  project?: string;
  reportText?: string;
  advancedApproved?: boolean;
  analysis?: {
    executive_decision?: {
      decision?: string;
    };
    strategic_analysis?: {
      risks?: string[];
      top_3_upgrades?: string[];
    };
    advisor_recommendations?: Record<string, AdvisorRecommendation | undefined>;
  };
};

type BudgetCommitmentSnapshot = {
  path?: string;
  required?: boolean;
  status?: string;
  expiryDate?: string;
};

type BudgetSnapshot = {
  regulatoryCommitments?: BudgetCommitmentSnapshot[];
};

type PlanSnapshot = {
  regulatoryInsights?: {
    regulatoryRiskScore?: {
      level?: string;
    };
  };
};

const PROJECTS_REGISTRY_KEY = "oms_dashboard_projects_registry_v1";
const PROJECT_DATA_KEY_PREFIX = "oms_dashboard_project_data_v1_";
const BUDGET_TRACKER_PREFIX = "oms_exec_budget_tracker_v1_";
const PLAN_TRACKER_PREFIX = "oms_exec_plan_tracker_v1_";
const REGULATORY_PATH_LABELS: Record<string, string> = {
  municipality: "البلدية/الأمانة",
  civil_defense: "الدفاع المدني",
  gea: "الجهة المنظمة للمحتوى",
  traffic: "المرور",
  insurance: "التأمين",
};
const ADVISOR_LABELS: Record<string, string> = {
  financial_advisor: "المستشار المالي",
  regulatory_advisor: "المستشار التنظيمي",
  operations_advisor: "المستشار التشغيلي",
  marketing_advisor: "المستشار التسويقي",
  risk_advisor: "مستشار المخاطر",
};

function projectDataKey(projectId: string) {
  return `${PROJECT_DATA_KEY_PREFIX}${projectId}`;
}

function budgetTrackerKey(projectId: string) {
  return `${BUDGET_TRACKER_PREFIX}${projectId}`;
}

function planTrackerKey(projectId: string) {
  return `${PLAN_TRACKER_PREFIX}${projectId}`;
}

function safeParse<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function toIsoDate(value?: string): string {
  if (!value) return new Date().toISOString().slice(0, 10);
  const asDate = new Date(value);
  if (Number.isNaN(asDate.getTime())) return new Date().toISOString().slice(0, 10);
  return asDate.toISOString().slice(0, 10);
}

function deriveStatus(snapshot: ProjectSnapshot): StrategyReport["status"] {
  if (snapshot.advancedApproved) return "معتمد";
  if (snapshot.reportText?.trim() || snapshot.analysis?.executive_decision?.decision?.trim()) return "مكتمل";
  return "مسودة";
}

function deriveExecutiveDecision(snapshot: ProjectSnapshot): string {
  const decision = snapshot.analysis?.executive_decision?.decision?.trim();
  if (decision) return decision;

  const firstReportLine = snapshot.reportText
    ?.split("\n")
    .map((line) => line.trim())
    .find(Boolean);
  if (firstReportLine) return firstReportLine;

  return "لا يوجد قرار تنفيذي مولّد بعد.";
}

function deriveAdvisorHighlights(snapshot: ProjectSnapshot): string[] {
  const items = Object.entries(snapshot.analysis?.advisor_recommendations ?? {})
    .map(([key, rec]) => {
      if (!rec) return "";
      const advisorName = ADVISOR_LABELS[key] ?? key;
      const oneRec = rec.recommendations?.find((line) => line?.trim());
      if (oneRec?.trim()) return `${advisorName}: ${oneRec.trim()}`;
      if (rec.strategic_warning?.trim()) return `${advisorName}: ${rec.strategic_warning.trim()}`;
      return "";
    })
    .filter(Boolean);

  return items.length ? items : ["لا توجد ملاحظات مستشارين منشورة بعد."];
}

function deriveRisks(snapshot: ProjectSnapshot): string[] {
  const risks = (snapshot.analysis?.strategic_analysis?.risks ?? [])
    .map((line) => line?.trim())
    .filter(Boolean);
  return risks.length ? risks : ["لا توجد مخاطر مسجلة حاليًا."];
}

function deriveRecommendations(snapshot: ProjectSnapshot): string[] {
  const upgrades = (snapshot.analysis?.strategic_analysis?.top_3_upgrades ?? [])
    .map((line) => line?.trim())
    .filter(Boolean);

  if (upgrades.length) return upgrades;

  const recs = Object.values(snapshot.analysis?.advisor_recommendations ?? {})
    .flatMap((rec) => rec?.recommendations ?? [])
    .map((line) => line?.trim())
    .filter(Boolean);

  return recs.length ? recs.slice(0, 5) : ["لا توجد توصيات منشورة بعد."];
}

function deriveRegulatoryCompliance(projectId: string): StrategyReport["regulatoryCompliance"] | undefined {
  const budgetSnapshot = safeParse<BudgetSnapshot>(localStorage.getItem(budgetTrackerKey(projectId)), {});
  const planSnapshot = safeParse<PlanSnapshot>(localStorage.getItem(planTrackerKey(projectId)), {});
  const items = Array.isArray(budgetSnapshot.regulatoryCommitments) ? budgetSnapshot.regulatoryCommitments : [];
  if (items.length === 0) return undefined;

  const required = items.filter((item) => item.required);
  const completed = required.filter((item) => item.status === "مكتمل");
  const pending = required.filter((item) => item.status !== "مكتمل");
  const overdue = pending.filter((item) => {
    if (!item.expiryDate) return false;
    return item.expiryDate < new Date().toISOString().slice(0, 10);
  });
  const riskLevel = planSnapshot.regulatoryInsights?.regulatoryRiskScore?.level;

  const readiness: "جاهز" | "جزئي" | "خطر" =
    required.length === 0
      ? "جاهز"
      : overdue.length > 0 || (pending.length > 0 && riskLevel === "high")
        ? "خطر"
        : pending.length > 0
          ? "جزئي"
          : "جاهز";

  return {
    readiness,
    requiredCount: required.length,
    completedCount: completed.length,
    pendingPaths: pending
      .map((item) => (item.path ? REGULATORY_PATH_LABELS[item.path] ?? item.path : "مسار غير محدد"))
      .slice(0, 3),
  };
}

export function readReports(): StrategyReport[] {
  if (typeof window === "undefined") return [];

  const registry = safeParse<ProjectsRegistry>(localStorage.getItem(PROJECTS_REGISTRY_KEY), {
    activeProjectId: "",
    projects: [],
  });

  const reports = registry.projects
    .filter((project) => !project.isArchived)
    .map<StrategyReport | null>((project) => {
      const snapshot = safeParse<ProjectSnapshot>(localStorage.getItem(projectDataKey(project.id)), {});
      const hasAnyContent =
        !!snapshot.project?.trim() || !!snapshot.reportText?.trim() || !!snapshot.analysis?.executive_decision;

      if (!hasAnyContent) return null;

      return {
        id: project.id,
        title: snapshot.project?.trim() || project.name || "مشروع بدون اسم",
        date: toIsoDate(project.updatedAt),
        status: deriveStatus(snapshot),
        executiveDecision: deriveExecutiveDecision(snapshot),
        advisorsHighlights: deriveAdvisorHighlights(snapshot),
        risks: deriveRisks(snapshot),
        recommendations: deriveRecommendations(snapshot),
        regulatoryCompliance: deriveRegulatoryCompliance(project.id),
      };
    })
    .filter((item): item is StrategyReport => item !== null);

  return reports.sort((a, b) => b.date.localeCompare(a.date));
}

export function readReportById(id: string): StrategyReport | null {
  return readReports().find((report) => report.id === id) ?? null;
}

export function subscribeReportsChanges(callback: () => void) {
  if (typeof window === "undefined") return () => {};

  const onStorage = () => callback();
  const onFocus = () => callback();
  const onVisibilityChange = () => {
    if (document.visibilityState === "visible") callback();
  };

  window.addEventListener("storage", onStorage);
  window.addEventListener("focus", onFocus);
  document.addEventListener("visibilitychange", onVisibilityChange);

  return () => {
    window.removeEventListener("storage", onStorage);
    window.removeEventListener("focus", onFocus);
    document.removeEventListener("visibilitychange", onVisibilityChange);
  };
}

export function getReportsSignature(): string {
  if (typeof window === "undefined") return "server";

  const registryRaw = localStorage.getItem(PROJECTS_REGISTRY_KEY) ?? "";
  const registry = safeParse<ProjectsRegistry>(registryRaw, {
    activeProjectId: "",
    projects: [],
  });
  const parts: string[] = [registryRaw];

  for (const project of registry.projects) {
    if (!project?.id || project.isArchived) continue;
    parts.push(localStorage.getItem(projectDataKey(project.id)) ?? "");
    parts.push(localStorage.getItem(budgetTrackerKey(project.id)) ?? "");
    parts.push(localStorage.getItem(planTrackerKey(project.id)) ?? "");
  }

  return parts.join("::");
}

export function buildReportText(report: StrategyReport): string {
  const sections: string[] = [];
  sections.push(`One Minute Strategy`);
  sections.push(`====================`);
  sections.push(`عنوان التقرير: ${report.title}`);
  sections.push(`المعرّف: ${report.id}`);
  sections.push(`تاريخ التحديث: ${report.date}`);
  sections.push(`الحالة: ${report.status}`);
  sections.push("");
  sections.push("القرار التنفيذي");
  sections.push("---------------");
  sections.push(report.executiveDecision || "لا يوجد قرار تنفيذي مولّد بعد.");
  sections.push("");

  if (report.regulatoryCompliance) {
    sections.push("الالتزام التنظيمي");
    sections.push("---------------");
    sections.push(`الحالة: ${report.regulatoryCompliance.readiness}`);
    sections.push(
      `مستوى الإكمال: ${report.regulatoryCompliance.completedCount}/${report.regulatoryCompliance.requiredCount}`
    );
    sections.push(
      `المسارات المفتوحة: ${
        report.regulatoryCompliance.pendingPaths.length
          ? report.regulatoryCompliance.pendingPaths.join("، ")
          : "لا توجد"
      }`
    );
    sections.push("");
  }

  sections.push("أبرز ملاحظات المستشارين");
  sections.push("----------------------");
  for (const line of report.advisorsHighlights) {
    sections.push(`- ${line}`);
  }
  sections.push("");

  sections.push("التوصيات التنفيذية");
  sections.push("-----------------");
  for (const line of report.recommendations) {
    sections.push(`- ${line}`);
  }
  sections.push("");

  sections.push("المخاطر");
  sections.push("-------");
  for (const line of report.risks) {
    sections.push(`- ${line}`);
  }

  return sections.join("\n");
}

export function buildReportFileName(report: StrategyReport): string {
  const baseName = buildReportBaseName(report);
  return `oms-report-${baseName}.txt`;
}

export function buildReportWordFileName(report: StrategyReport): string {
  const baseName = buildReportBaseName(report);
  return `oms-report-${baseName}.doc`;
}

export function buildReportWordHtml(report: StrategyReport): string {
  const highlights = report.advisorsHighlights
    .map((line) => `<li>${escapeHtml(line)}</li>`)
    .join("");
  const recommendations = report.recommendations
    .map((line) => `<li>${escapeHtml(line)}</li>`)
    .join("");
  const risks = report.risks.map((line) => `<li>${escapeHtml(line)}</li>`).join("");
  const compliance = report.regulatoryCompliance
    ? `
      <section class="panel">
        <h2>الالتزام التنظيمي</h2>
        <p>الحالة: ${escapeHtml(report.regulatoryCompliance.readiness)}</p>
        <p>مستوى الإكمال: ${report.regulatoryCompliance.completedCount}/${report.regulatoryCompliance.requiredCount}</p>
        <p>المسارات المفتوحة: ${escapeHtml(
          report.regulatoryCompliance.pendingPaths.length
            ? report.regulatoryCompliance.pendingPaths.join("، ")
            : "لا توجد"
        )}</p>
      </section>
    `
    : "";

  return `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(report.title)}</title>
  <style>
    body {
      font-family: "Segoe UI", Tahoma, Arial, sans-serif;
      margin: 24px;
      color: #111827;
      line-height: 1.7;
      direction: rtl;
      text-align: right;
    }
    h1 { margin: 0 0 8px; font-size: 28px; }
    h2 { margin: 0 0 10px; font-size: 20px; }
    p { margin: 0 0 8px; }
    ul { margin: 0; padding-right: 20px; }
    li { margin-bottom: 6px; }
    .meta { color: #4b5563; margin-bottom: 14px; font-size: 14px; }
    .panel {
      border: 1px solid #d1d5db;
      border-radius: 10px;
      padding: 14px;
      margin-bottom: 12px;
      background: #ffffff;
    }
    .brand {
      font-size: 12px;
      color: #6b7280;
      margin-bottom: 6px;
    }
  </style>
</head>
<body>
  <div class="brand">One Minute Strategy</div>
  <h1>${escapeHtml(report.title)}</h1>
  <div class="meta">المعرّف: ${escapeHtml(report.id)} | التاريخ: ${escapeHtml(report.date)} | الحالة: ${escapeHtml(
    report.status
  )}</div>

  <section class="panel">
    <h2>القرار التنفيذي</h2>
    <p>${escapeHtml(report.executiveDecision || "لا يوجد قرار تنفيذي مولّد بعد.")}</p>
  </section>

  ${compliance}

  <section class="panel">
    <h2>أبرز ملاحظات المستشارين</h2>
    <ul>${highlights}</ul>
  </section>

  <section class="panel">
    <h2>التوصيات التنفيذية</h2>
    <ul>${recommendations}</ul>
  </section>

  <section class="panel">
    <h2>المخاطر</h2>
    <ul>${risks}</ul>
  </section>
</body>
</html>`;
}

export function buildReportsCsv(reports: StrategyReport[]): string {
  const header = [
    "المعرف",
    "العنوان",
    "التاريخ",
    "الحالة",
    "القرار التنفيذي",
    "عدد ملاحظات المستشارين",
    "عدد التوصيات",
    "عدد المخاطر",
    "حالة الامتثال",
    "الامتثال المكتمل",
    "الامتثال المطلوب",
    "المسارات المفتوحة",
  ];

  const rows = reports.map((report) => {
    const highlightsCount = report.advisorsHighlights.filter((line) => !line.startsWith("لا توجد")).length;
    const recommendationsCount = report.recommendations.filter((line) => !line.startsWith("لا توجد")).length;
    const risksCount = report.risks.filter((line) => !line.startsWith("لا توجد")).length;
    const complianceReady = report.regulatoryCompliance?.readiness ?? "غير متوفر";
    const complianceCompleted = String(report.regulatoryCompliance?.completedCount ?? 0);
    const complianceRequired = String(report.regulatoryCompliance?.requiredCount ?? 0);
    const pendingPaths = report.regulatoryCompliance?.pendingPaths.join(" | ") || "";

    return [
      report.id,
      report.title,
      report.date,
      report.status,
      report.executiveDecision,
      String(highlightsCount),
      String(recommendationsCount),
      String(risksCount),
      complianceReady,
      complianceCompleted,
      complianceRequired,
      pendingPaths,
    ];
  });

  const allRows = [header, ...rows];
  return allRows.map((row) => row.map(csvCell).join(",")).join("\n");
}

export function buildReportsCsvFileName(): string {
  const today = new Date().toISOString().slice(0, 10);
  return `oms-reports-${today}.csv`;
}

function buildReportBaseName(report: StrategyReport): string {
  const normalizedTitle = report.title
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[\\/:*?"<>|]/g, "")
    .slice(0, 48);
  const normalizedDate = (report.date || "").replace(/[^\d-]/g, "").slice(0, 10) || "date";
  return `${normalizedTitle || report.id}-${normalizedDate}`;
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function csvCell(value: string): string {
  const escaped = value.replaceAll('"', '""');
  return `"${escaped}"`;
}
