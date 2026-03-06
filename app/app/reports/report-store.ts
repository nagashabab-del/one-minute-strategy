import {
  BUDGET_TRACKER_PREFIX,
  PLAN_TRACKER_PREFIX,
  PROJECTS_REGISTRY_KEY,
  PROJECT_DATA_KEY_PREFIX,
  hydrateWorkspaceFromBackend,
  scheduleWorkspacePersist,
  subscribeWorkspaceBackendSync,
} from "../_lib/workspace-backend";

export type ReportType = "strategy" | "financial";

export type FinancialReportLine = {
  id: string;
  title: string;
  owner: string;
  plannedNet: number;
  actualNet: number;
  plannedVat: number;
  actualVat: number;
  plannedWithVat: number;
  actualWithVat: number;
  reserved: number;
  committed: number;
  available: number;
  variancePct: number | null;
};

export type FinancialReportPayload = {
  kpis: {
    plannedTotal: number;
    actualTotal: number;
    reservedTotal: number;
    committedTotal: number;
    remainingAfterCommitment: number;
    variancePct: number | null;
    plannedVatTotal: number;
    actualVatTotal: number;
    openAdvancesCount: number;
    overdueAdvances: number;
    settlementRate: number | null;
    openIncreaseRequests: number;
    plannedRevenue: number;
    actualRevenue: number;
    plannedProfitBeforeVat: number;
    actualProfitBeforeVat: number;
    plannedProfitAfterVat: number;
    actualProfitAfterVat: number;
  };
  composition: Array<{ label: string; value: number }>;
  trend: Array<{ label: string; planned: number; committed: number }>;
  lines: FinancialReportLine[];
};

export type StrategyReport = {
  id: string;
  projectId: string;
  reportType: ReportType;
  title: string;
  date: string;
  status: "مسودة" | "مكتمل" | "معتمد";
  executiveDecision: string;
  advisorsHighlights: string[];
  risks: string[];
  recommendations: string[];
  financial?: FinancialReportPayload;
  regulatoryCompliance?: {
    readiness: "جاهز" | "جزئي" | "خطر";
    requiredCount: number;
    completedCount: number;
    pendingPaths: string[];
  };
};

export type ReportExportAction = "txt" | "docx" | "pdf" | "csv" | "bundle" | "copy";
export type BundleExportAction = "txt" | "docx" | "pdf";
export type ReportExportStatus = "pending" | "success" | "error";
export const BUNDLE_EXPORT_ACTIONS: ReadonlyArray<BundleExportAction> = ["txt", "docx", "pdf"];

export class ReportExportError extends Error {
  code: string;
  details?: string;
  cause?: unknown;
  failedActions?: BundleExportAction[];

  constructor(
    code: string,
    message: string,
    options?: { details?: string; cause?: unknown; failedActions?: BundleExportAction[] }
  ) {
    super(message);
    this.name = "ReportExportError";
    this.code = code;
    this.details = options?.details;
    this.cause = options?.cause;
    this.failedActions = options?.failedActions;
  }
}

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

type BudgetLineSnapshot = {
  id?: string;
  title?: string;
  owner?: string;
  planned?: number;
  actual?: number;
  vatApplicable?: boolean;
  vatRate?: number;
};

type BudgetAdvanceSnapshot = {
  id?: string;
  lineId?: string;
  approvedAmount?: number;
  status?: string;
  dueDate?: string;
};

type BudgetIncreaseSnapshot = {
  status?: string;
};

type BudgetSnapshot = {
  lines?: BudgetLineSnapshot[];
  advances?: BudgetAdvanceSnapshot[];
  budgetIncreases?: BudgetIncreaseSnapshot[];
  plannedRevenue?: number;
  actualRevenue?: number;
  updatedAt?: string;
  regulatoryCommitments?: BudgetCommitmentSnapshot[];
};

type PlanSnapshot = {
  regulatoryInsights?: {
    regulatoryRiskScore?: {
      level?: string;
    };
  };
};

const EXPORT_ACTION_LABELS: Record<ReportExportAction, string> = {
  txt: "تصدير TXT",
  docx: "تصدير DOCX",
  pdf: "تصدير PDF",
  csv: "تصدير CSV",
  bundle: "تصدير الحزمة",
  copy: "نسخ التقرير",
};
const BUNDLE_ACTION_SHORT_LABELS: Record<BundleExportAction, string> = {
  txt: "TXT",
  docx: "DOCX",
  pdf: "PDF",
};

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

export function getReportExportPendingMessage(action: ReportExportAction): string {
  if (action === "copy") return "جاري نسخ التقرير للحافظة...";
  if (action === "bundle") return "جاري تجهيز الحزمة (TXT + DOCX + PDF)...";
  return `جاري تنفيذ ${EXPORT_ACTION_LABELS[action]}...`;
}

export function getReportExportSuccessMessage(action: ReportExportAction): string {
  if (action === "txt") return "تم تنزيل ملف TXT بنجاح.";
  if (action === "docx") return "تم تنزيل ملف DOCX بنجاح.";
  if (action === "pdf") return "تم تنزيل ملف PDF بنجاح.";
  if (action === "csv") return "تم تنزيل ملف CSV بنجاح.";
  if (action === "bundle") return "تم تنزيل الحزمة (TXT + DOCX + PDF).";
  return "تم نسخ محتوى التقرير للحافظة.";
}

export function formatBundleActions(actions: BundleExportAction[]): string {
  const normalizedActions = normalizeBundleFailedActions(actions);
  return normalizedActions.map((action) => BUNDLE_ACTION_SHORT_LABELS[action]).join(" + ");
}

export function getBundleRetryButtonLabel(actions: BundleExportAction[]): string {
  const formatted = formatBundleActions(actions);
  if (!formatted) return "إعادة المحاولة";
  return `إعادة (${formatted})`;
}

export function createBundlePartialError(failedActions: Array<ReportExportAction>): ReportExportError {
  const normalizedActions = normalizeBundleFailedActions(failedActions);
  return new ReportExportError("BUNDLE_PARTIAL", "Bundle export failed partially.", {
    details: formatBundleActions(normalizedActions),
    failedActions: normalizedActions,
  });
}

export function getBundleFailedActions(error: unknown): BundleExportAction[] {
  const exportError = toReportExportError(error);
  if (exportError.code !== "BUNDLE_PARTIAL") return [];
  return normalizeBundleFailedActions(exportError.failedActions ?? []);
}

export function toReportExportError(error: unknown, fallbackCode = "UNKNOWN"): ReportExportError {
  if (error instanceof ReportExportError) return error;
  if (error instanceof Error) {
    return new ReportExportError(fallbackCode, error.message || "Export failed.", { cause: error });
  }
  return new ReportExportError(fallbackCode, "Export failed.");
}

export function getReportExportErrorMessage(action: ReportExportAction, error: unknown): string {
  const exportError = toReportExportError(error);

  if (exportError.code === "BUNDLE_PARTIAL") {
    const failedActions = normalizeBundleFailedActions(exportError.failedActions ?? []);
    const failedLabel = formatBundleActions(failedActions);
    return failedLabel
      ? `فشل تصدير عناصر من الحزمة: ${failedLabel}.`
      : "فشل جزء من الحزمة. يمكنك إعادة المحاولة للعناصر الفاشلة فقط.";
  }
  if (exportError.code === "BUNDLE_RETRY_EMPTY") {
    return "لا توجد عناصر فاشلة لإعادة محاولتها ضمن الحزمة.";
  }
  if (exportError.code === "REPORT_NOT_FOUND") {
    return "لم يعد التقرير متوفرًا. حدّث الصفحة ثم أعد المحاولة.";
  }
  if (exportError.code === "CSV_EMPTY_FILTER") {
    return "لا توجد نتائج ضمن الفلتر الحالي لتصديرها.";
  }
  if (exportError.code === "ACTION_BUSY") {
    return "يوجد إجراء تصدير آخر قيد التنفيذ. انتظر اكتماله ثم أعد المحاولة.";
  }
  if (exportError.code === "ACTION_BLOCKED") {
    return "الإجراء غير متاح في الوضع الحالي.";
  }
  if (exportError.code === "BROWSER_ONLY") {
    return "هذا الإجراء متاح من المتصفح فقط.";
  }
  if (exportError.code === "LIBRARY_LOAD_FAILED") {
    return "تعذر تحميل مكوّنات التصدير. تحقق من الاتصال ثم أعد المحاولة.";
  }
  if (exportError.code === "PDF_SANDBOX_INIT_FAILED" || exportError.code === "PDF_CONTENT_MISSING") {
    return "تعذر تجهيز محتوى PDF للتصدير. أعد المحاولة.";
  }
  if (exportError.code === "PDF_RENDER_FAILED") {
    return "حدث خطأ أثناء توليد PDF. أعد المحاولة بعد لحظات.";
  }
  if (exportError.code === "DOWNLOAD_FAILED") {
    return "تعذر بدء التنزيل من المتصفح. تحقق من إعدادات الحظر ثم أعد المحاولة.";
  }
  if (exportError.code === "COPY_BLOCKED") {
    return "تعذر النسخ للحافظة. تأكد من صلاحية النسخ في المتصفح.";
  }
  if (exportError.code === "DOCX_BUILD_FAILED") {
    return "تعذر توليد ملف DOCX. أعد المحاولة.";
  }
  return `تعذر تنفيذ ${EXPORT_ACTION_LABELS[action]}.`;
}

function projectDataKey(projectId: string) {
  return `${PROJECT_DATA_KEY_PREFIX}${projectId}`;
}

function budgetTrackerKey(projectId: string) {
  return `${BUDGET_TRACKER_PREFIX}${projectId}`;
}

function planTrackerKey(projectId: string) {
  return `${PLAN_TRACKER_PREFIX}${projectId}`;
}

function financialReportId(projectId: string) {
  return `${projectId}__financial`;
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

function deriveStrategyStatus(snapshot: ProjectSnapshot): StrategyReport["status"] {
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

function positive(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, value);
}

function normalizeVatRate(value: unknown) {
  if (typeof value !== "number" || Number.isNaN(value)) return 15;
  return Math.max(0, Math.min(100, value));
}

function computeVatAmount(amount: number, line: BudgetLineSnapshot) {
  if (!line.vatApplicable) return 0;
  return (positive(amount) * normalizeVatRate(line.vatRate)) / 100;
}

function isReservedAdvance(item: BudgetAdvanceSnapshot) {
  return item.status === "معتمدة" || item.status === "مصروفة";
}

function isClosedAdvance(item: BudgetAdvanceSnapshot) {
  return item.status === "مسواة" || item.status === "ملغاة";
}

function isOverdueAdvance(item: BudgetAdvanceSnapshot) {
  if (isClosedAdvance(item)) return false;
  if (!item.dueDate) return false;
  return item.dueDate < new Date().toISOString().slice(0, 10);
}

function buildFinancialPayload(budgetSnapshot: BudgetSnapshot): FinancialReportPayload | null {
  const lines = Array.isArray(budgetSnapshot.lines) ? budgetSnapshot.lines : [];
  const advances = Array.isArray(budgetSnapshot.advances) ? budgetSnapshot.advances : [];
  const increases = Array.isArray(budgetSnapshot.budgetIncreases) ? budgetSnapshot.budgetIncreases : [];

  if (lines.length === 0 && advances.length === 0 && increases.length === 0) return null;

  const reservedByLine: Record<string, number> = {};
  for (const item of advances) {
    if (!isReservedAdvance(item) || !item.lineId) continue;
    reservedByLine[item.lineId] = (reservedByLine[item.lineId] ?? 0) + positive(item.approvedAmount ?? 0);
  }

  const lineRows: FinancialReportLine[] = lines.map((line, idx) => {
    const plannedNet = positive(line.planned ?? 0);
    const actualNet = positive(line.actual ?? 0);
    const plannedVat = computeVatAmount(plannedNet, line);
    const actualVat = computeVatAmount(actualNet, line);
    const plannedWithVat = plannedNet + plannedVat;
    const actualWithVat = actualNet + actualVat;
    const reserved = line.id ? reservedByLine[line.id] ?? 0 : 0;
    const committed = actualWithVat + reserved;
    const available = plannedWithVat - committed;
    const variancePct = plannedWithVat > 0 ? ((committed - plannedWithVat) / plannedWithVat) * 100 : null;

    return {
      id: line.id?.trim() || `line-${idx + 1}`,
      title: line.title?.trim() || `بند ${idx + 1}`,
      owner: line.owner?.trim() || "غير محدد",
      plannedNet,
      actualNet,
      plannedVat,
      actualVat,
      plannedWithVat,
      actualWithVat,
      reserved,
      committed,
      available,
      variancePct,
    };
  });

  const plannedTotal = lineRows.reduce((sum, row) => sum + row.plannedWithVat, 0);
  const actualTotal = lineRows.reduce((sum, row) => sum + row.actualWithVat, 0);
  const plannedVatTotal = lineRows.reduce((sum, row) => sum + row.plannedVat, 0);
  const actualVatTotal = lineRows.reduce((sum, row) => sum + row.actualVat, 0);
  const reservedTotal = lineRows.reduce((sum, row) => sum + row.reserved, 0);
  const committedTotal = actualTotal + reservedTotal;
  const remainingAfterCommitment = plannedTotal - committedTotal;
  const variancePct = plannedTotal > 0 ? ((committedTotal - plannedTotal) / plannedTotal) * 100 : null;
  const openAdvancesCount = advances.filter((item) => !isClosedAdvance(item)).length;
  const overdueAdvances = advances.filter((item) => isOverdueAdvance(item)).length;
  const settlementBaseCount = advances.filter((item) => item.status !== "ملغاة").length;
  const settlementRate =
    settlementBaseCount > 0
      ? (advances.filter((item) => item.status === "مسواة").length / settlementBaseCount) * 100
      : null;
  const openIncreaseRequests = increases.filter(
    (item) => item.status === "طلب جديد" || item.status === "تحت المراجعة" || item.status === "معتمد"
  ).length;
  const plannedRevenue = positive(budgetSnapshot.plannedRevenue ?? 0);
  const actualRevenue = positive(budgetSnapshot.actualRevenue ?? 0);
  const plannedNetTotal = lineRows.reduce((sum, row) => sum + row.plannedNet, 0);
  const actualNetTotal = lineRows.reduce((sum, row) => sum + row.actualNet, 0);
  const plannedProfitBeforeVat = plannedRevenue - plannedNetTotal;
  const actualProfitBeforeVat = actualRevenue - actualNetTotal;
  const plannedProfitAfterVat = plannedRevenue - plannedTotal;
  const actualProfitAfterVat = actualRevenue - actualTotal;

  const rankedByPlanned = [...lineRows].sort((a, b) => b.plannedWithVat - a.plannedWithVat).slice(0, 8);
  const trend = rankedByPlanned.map((row, idx) => ({
    label: row.title || `بند ${idx + 1}`,
    planned: row.plannedWithVat,
    committed: row.committed,
  }));

  const composition = [
    { label: "المصروف الفعلي", value: actualTotal },
    { label: "العهد المحجوزة", value: reservedTotal },
    { label: "المتاح", value: Math.max(0, remainingAfterCommitment) },
  ].filter((item) => item.value > 0);

  return {
    kpis: {
      plannedTotal,
      actualTotal,
      reservedTotal,
      committedTotal,
      remainingAfterCommitment,
      variancePct,
      plannedVatTotal,
      actualVatTotal,
      openAdvancesCount,
      overdueAdvances,
      settlementRate,
      openIncreaseRequests,
      plannedRevenue,
      actualRevenue,
      plannedProfitBeforeVat,
      actualProfitBeforeVat,
      plannedProfitAfterVat,
      actualProfitAfterVat,
    },
    composition,
    trend,
    lines: lineRows,
  };
}

function deriveFinancialStatus(snapshot: ProjectSnapshot, financial: FinancialReportPayload): StrategyReport["status"] {
  if (snapshot.advancedApproved && financial.lines.length > 0) return "معتمد";
  if (financial.lines.length > 0 || financial.kpis.openAdvancesCount > 0) return "مكتمل";
  return "مسودة";
}

function deriveFinancialDecision(financial: FinancialReportPayload): string {
  const varianceLabel =
    financial.kpis.variancePct === null ? "غير متاح" : `${financial.kpis.variancePct.toFixed(1)}%`;
  const remaining = financial.kpis.remainingAfterCommitment;
  const remainingLabel =
    remaining < 0 ? "يوجد عجز تشغيلي" : remaining === 0 ? "لا يوجد هامش متبقٍ" : "يوجد هامش متبقٍ";

  return `الوضع المالي الحالي يوضح التزامًا قدره ${Math.round(
    financial.kpis.committedTotal
  )} مقابل مخطط ${Math.round(financial.kpis.plannedTotal)} بانحراف ${varianceLabel}. ${remainingLabel}.`;
}

function deriveFinancialHighlights(financial: FinancialReportPayload): string[] {
  const topLine = [...financial.lines].sort((a, b) => b.committed - a.committed)[0];
  const items = [
    `إجمالي المخطط (شامل الضريبة): ${Math.round(financial.kpis.plannedTotal)}`,
    `إجمالي الالتزام الفعلي + العهد: ${Math.round(financial.kpis.committedTotal)}`,
    `العهد المفتوحة: ${financial.kpis.openAdvancesCount} (المتأخرة: ${financial.kpis.overdueAdvances})`,
    topLine ? `أعلى بند صرفًا: ${topLine.title} بقيمة ${Math.round(topLine.committed)}` : "",
  ].filter(Boolean);
  return items.length ? items : ["لا توجد مؤشرات مالية منشورة بعد."];
}

function deriveFinancialRisks(financial: FinancialReportPayload): string[] {
  const riskyLines = financial.lines.filter((line) => (line.variancePct ?? 0) > 10).slice(0, 3);
  const items: string[] = [];
  if (financial.kpis.remainingAfterCommitment < 0) {
    items.push("تجاوز الالتزامات للمخطط المعتمد (عجز تشغيلي).");
  }
  if (financial.kpis.overdueAdvances > 0) {
    items.push(`يوجد ${financial.kpis.overdueAdvances} عهدة متأخرة عن التسوية.`);
  }
  for (const line of riskyLines) {
    items.push(`انحراف مرتفع في بند ${line.title} بمقدار ${line.variancePct?.toFixed(1)}%.`);
  }
  return items.length ? items : ["لا توجد مخاطر مالية حرجة حاليًا."];
}

function deriveFinancialRecommendations(financial: FinancialReportPayload): string[] {
  const items: string[] = [];
  if (financial.kpis.remainingAfterCommitment < 0) {
    items.push("تجميد المصروفات غير الحرجة وإعادة توزيع البنود قبل أي اعتماد إضافي.");
  } else {
    items.push("الاستمرار في المراقبة الأسبوعية مع الحفاظ على هامش المتاح لكل بند.");
  }
  if (financial.kpis.overdueAdvances > 0) {
    items.push("إغلاق العهد المتأخرة بخطة تسوية زمنية وربط الصرف القادم بالتسوية.");
  }
  if (financial.kpis.openIncreaseRequests > 0) {
    items.push("ترتيب أولويات طلبات رفع الميزانية وربط كل طلب بأثره المالي المتوقع.");
  }
  return items;
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
  void hydrateWorkspaceFromBackend();
  scheduleWorkspacePersist();

  const registry = safeParse<ProjectsRegistry>(localStorage.getItem(PROJECTS_REGISTRY_KEY), {
    activeProjectId: "",
    projects: [],
  });

  const reports = registry.projects
    .filter((project) => !project.isArchived)
    .flatMap<StrategyReport>((project) => {
      const snapshot = safeParse<ProjectSnapshot>(localStorage.getItem(projectDataKey(project.id)), {});
      const budgetSnapshot = safeParse<BudgetSnapshot>(localStorage.getItem(budgetTrackerKey(project.id)), {});
      const baseTitle = snapshot.project?.trim() || project.name || "مشروع بدون اسم";
      const strategyDate = toIsoDate(project.updatedAt);
      const financialDate = toIsoDate(budgetSnapshot.updatedAt || project.updatedAt);
      const regulatoryCompliance = deriveRegulatoryCompliance(project.id);
      const records: StrategyReport[] = [];

      const hasStrategyContent =
        !!snapshot.project?.trim() || !!snapshot.reportText?.trim() || !!snapshot.analysis?.executive_decision;
      if (hasStrategyContent) {
        records.push({
          id: project.id,
          projectId: project.id,
          reportType: "strategy",
          title: baseTitle,
          date: strategyDate,
          status: deriveStrategyStatus(snapshot),
          executiveDecision: deriveExecutiveDecision(snapshot),
          advisorsHighlights: deriveAdvisorHighlights(snapshot),
          risks: deriveRisks(snapshot),
          recommendations: deriveRecommendations(snapshot),
          regulatoryCompliance,
        });
      }

      const financialPayload = buildFinancialPayload(budgetSnapshot);
      if (financialPayload) {
        records.push({
          id: financialReportId(project.id),
          projectId: project.id,
          reportType: "financial",
          title: `${baseTitle} · تقرير مالي تنفيذي`,
          date: financialDate,
          status: deriveFinancialStatus(snapshot, financialPayload),
          executiveDecision: deriveFinancialDecision(financialPayload),
          advisorsHighlights: deriveFinancialHighlights(financialPayload),
          risks: deriveFinancialRisks(financialPayload),
          recommendations: deriveFinancialRecommendations(financialPayload),
          financial: financialPayload,
          regulatoryCompliance,
        });
      }

      return records;
    });

  return reports.sort((a, b) => b.date.localeCompare(a.date));
}

export function readReportById(id: string): StrategyReport | null {
  return readReports().find((report) => report.id === id) ?? null;
}

export function subscribeReportsChanges(callback: () => void) {
  if (typeof window === "undefined") return () => {};
  void hydrateWorkspaceFromBackend();

  const onStorage = () => callback();
  const onFocus = () => callback();
  const onBackendSync = () => callback();
  const onVisibilityChange = () => {
    if (document.visibilityState === "visible") callback();
  };

  window.addEventListener("storage", onStorage);
  window.addEventListener("focus", onFocus);
  document.addEventListener("visibilitychange", onVisibilityChange);
  const unsubscribeBackendSync = subscribeWorkspaceBackendSync(onBackendSync);

  return () => {
    window.removeEventListener("storage", onStorage);
    window.removeEventListener("focus", onFocus);
    document.removeEventListener("visibilitychange", onVisibilityChange);
    unsubscribeBackendSync();
  };
}

export function getReportsSignature(): string {
  if (typeof window === "undefined") return "server";
  scheduleWorkspacePersist();

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
  sections.push(`النوع: ${report.reportType === "financial" ? "مالي" : "استراتيجي"}`);
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

  if (report.reportType === "financial" && report.financial) {
    sections.push("");
    sections.push("ملخص مالي");
    sections.push("---------");
    sections.push(`إجمالي المخطط: ${Math.round(report.financial.kpis.plannedTotal)}`);
    sections.push(`إجمالي الالتزام: ${Math.round(report.financial.kpis.committedTotal)}`);
    sections.push(`المتاح: ${Math.round(report.financial.kpis.remainingAfterCommitment)}`);
    sections.push(
      `الانحراف: ${
        report.financial.kpis.variancePct === null ? "غير متاح" : `${report.financial.kpis.variancePct.toFixed(1)}%`
      }`
    );
    sections.push(`العهد المفتوحة: ${report.financial.kpis.openAdvancesCount}`);
    sections.push("");
    sections.push("بنود الميزانية (أعلى 10)");
    sections.push("----------------------");
    for (const row of report.financial.lines.slice(0, 10)) {
      const variance = row.variancePct === null ? "—" : `${row.variancePct.toFixed(1)}%`;
      sections.push(
        `- ${row.title} | مخطط: ${Math.round(row.plannedWithVat)} | التزام: ${Math.round(row.committed)} | متاح: ${Math.round(row.available)} | انحراف: ${variance}`
      );
    }
  }

  return sections.join("\n");
}

export function buildReportFileName(report: StrategyReport): string {
  const baseName = buildReportBaseName(report);
  return `oms-report-${baseName}.txt`;
}

export function buildReportWordFileName(report: StrategyReport): string {
  return buildReportDocxFileName(report);
}

export function buildReportDocxFileName(report: StrategyReport): string {
  const baseName = buildReportBaseName(report);
  return `oms-report-${baseName}.docx`;
}

export async function buildReportDocxBlob(report: StrategyReport): Promise<Blob> {
  try {
    const { AlignmentType, Document, HeadingLevel, Packer, Paragraph, TextRun } = await import("docx");

    const heading = (title: string) =>
      new Paragraph({
        heading: HeadingLevel.HEADING_2,
        alignment: AlignmentType.RIGHT,
        bidirectional: true,
        spacing: { before: 260, after: 110 },
        children: [new TextRun({ text: title, bold: true, size: 26 })],
      });
    const body = (text: string) =>
      new Paragraph({
        alignment: AlignmentType.RIGHT,
        bidirectional: true,
        spacing: { after: 110 },
        children: [new TextRun({ text, size: 24 })],
      });
    const bullet = (text: string) =>
      new Paragraph({
        alignment: AlignmentType.RIGHT,
        bidirectional: true,
        spacing: { after: 90 },
        bullet: { level: 0 },
        children: [new TextRun({ text, size: 24 })],
      });
    const compliance = report.regulatoryCompliance
      ? [
          heading("الالتزام التنظيمي"),
          body(`الحالة: ${report.regulatoryCompliance.readiness}`),
          body(
            `مستوى الإكمال: ${report.regulatoryCompliance.completedCount}/${report.regulatoryCompliance.requiredCount}`
          ),
          body(
            `المسارات المفتوحة: ${
              report.regulatoryCompliance.pendingPaths.length
                ? report.regulatoryCompliance.pendingPaths.join("، ")
                : "لا توجد"
            }`
          ),
        ]
      : [];
    const financialSection =
      report.reportType === "financial" && report.financial
        ? [
            heading("ملخص مالي"),
            body(`إجمالي المخطط: ${Math.round(report.financial.kpis.plannedTotal)}`),
            body(`إجمالي الالتزام: ${Math.round(report.financial.kpis.committedTotal)}`),
            body(`المتاح: ${Math.round(report.financial.kpis.remainingAfterCommitment)}`),
            body(
              `الانحراف: ${
                report.financial.kpis.variancePct === null
                  ? "غير متاح"
                  : `${report.financial.kpis.variancePct.toFixed(1)}%`
              }`
            ),
            body(`العهد المفتوحة: ${report.financial.kpis.openAdvancesCount}`),
            heading("بنود الميزانية (أعلى 10)"),
            ...report.financial.lines.slice(0, 10).map((row) =>
              bullet(
                `${row.title} | مخطط: ${Math.round(row.plannedWithVat)} | التزام: ${Math.round(
                  row.committed
                )} | متاح: ${Math.round(row.available)}`
              )
            ),
          ]
        : [];

    const doc = new Document({
      creator: "One Minute Strategy",
      title: report.title,
      description: `Strategy report ${report.id}`,
      sections: [
        {
          children: [
            new Paragraph({
              alignment: AlignmentType.RIGHT,
              bidirectional: true,
              spacing: { after: 90 },
              children: [new TextRun({ text: "One Minute Strategy", bold: true, size: 22 })],
            }),
            new Paragraph({
              alignment: AlignmentType.RIGHT,
              bidirectional: true,
              spacing: { after: 110 },
              children: [new TextRun({ text: report.title, bold: true, size: 38 })],
            }),
            body(`المعرّف: ${report.id}`),
            body(`النوع: ${report.reportType === "financial" ? "مالي" : "استراتيجي"}`),
            body(`تاريخ التحديث: ${report.date}`),
            body(`الحالة: ${report.status}`),
            heading("القرار التنفيذي"),
            body(report.executiveDecision || "لا يوجد قرار تنفيذي مولّد بعد."),
            ...financialSection,
            ...compliance,
            heading("أبرز ملاحظات المستشارين"),
            ...report.advisorsHighlights.map((line) => bullet(line)),
            heading("التوصيات التنفيذية"),
            ...report.recommendations.map((line) => bullet(line)),
            heading("المخاطر"),
            ...report.risks.map((line) => bullet(line)),
          ],
        },
      ],
    });

    return Packer.toBlob(doc);
  } catch (error) {
    throw toReportExportError(error, "DOCX_BUILD_FAILED");
  }
}

export function buildReportPdfFileName(report: StrategyReport): string {
  const baseName = buildReportBaseName(report);
  return `oms-report-${baseName}.pdf`;
}

export async function buildReportPdfBlob(report: StrategyReport): Promise<Blob> {
  if (typeof window === "undefined" || typeof document === "undefined") {
    throw new ReportExportError("BROWSER_ONLY", "PDF export is available in browser only.");
  }

  let html2canvas: (typeof import("html2canvas"))["default"];
  let jsPDFCtor: (typeof import("jspdf"))["jsPDF"];
  try {
    const imports = await Promise.all([import("html2canvas"), import("jspdf")]);
    html2canvas = imports[0].default;
    jsPDFCtor = imports[1].jsPDF;
  } catch (error) {
    throw toReportExportError(error, "LIBRARY_LOAD_FAILED");
  }

  const pdfWidth = 794;
  const pdfHeight = 1123;
  const iframe = document.createElement("iframe");
  iframe.style.position = "fixed";
  iframe.style.left = "-99999px";
  iframe.style.top = "0";
  iframe.style.width = `${pdfWidth}px`;
  iframe.style.height = `${pdfHeight}px`;
  iframe.style.opacity = "0";

  document.body.appendChild(iframe);
  try {
    const html = buildReportPdfHtml(report);
    const doc = iframe.contentDocument;
    if (!doc) throw new ReportExportError("PDF_SANDBOX_INIT_FAILED", "Cannot initialize PDF sandbox.");
    doc.open();
    doc.write(html);
    doc.close();
    await waitForMs(90);
    const body = doc.body;
    if (!body) throw new ReportExportError("PDF_CONTENT_MISSING", "No report content for PDF export.");

    let canvas: HTMLCanvasElement;
    try {
      canvas = await html2canvas(body, {
        scale: 2.4,
        backgroundColor: "#ffffff",
        useCORS: true,
        width: pdfWidth,
        windowWidth: Math.max(body.scrollWidth, pdfWidth),
        windowHeight: body.scrollHeight,
        scrollX: 0,
        scrollY: 0,
      });
    } catch (error) {
      throw toReportExportError(error, "PDF_RENDER_FAILED");
    }

    const imageData = canvas.toDataURL("image/png");
    try {
      const pdf = new jsPDFCtor({ orientation: "p", unit: "pt", format: "a4" });
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 28;
      const imageWidth = pageWidth - margin * 2;
      const imageHeight = (canvas.height * imageWidth) / canvas.width;

      let heightLeft = imageHeight;
      let yPosition = 0;
      pdf.addImage(imageData, "PNG", margin, yPosition + margin, imageWidth, imageHeight, undefined, "FAST");
      heightLeft -= pageHeight;

      while (heightLeft > 0) {
        yPosition = heightLeft - imageHeight;
        pdf.addPage();
        pdf.addImage(imageData, "PNG", margin, yPosition + margin, imageWidth, imageHeight, undefined, "FAST");
        heightLeft -= pageHeight;
      }

      return pdf.output("blob");
    } catch (error) {
      throw toReportExportError(error, "PDF_RENDER_FAILED");
    }
  } finally {
    document.body.removeChild(iframe);
  }
}

export function buildReportWordHtml(report: StrategyReport): string {
  return buildReportHtml(report, {
    bodyMargin: 24,
    panelMarginBottom: 12,
    headingOneSize: 28,
    headingTwoSize: 20,
    lineHeight: 1.7,
    fontSize: 16,
  });
}

function buildReportPdfHtml(report: StrategyReport): string {
  return buildReportHtml(report, {
    bodyMargin: 18,
    panelMarginBottom: 10,
    headingOneSize: 24,
    headingTwoSize: 18,
    lineHeight: 1.6,
    fontSize: 14,
  });
}

function buildReportHtml(
  report: StrategyReport,
  options: {
    bodyMargin: number;
    panelMarginBottom: number;
    headingOneSize: number;
    headingTwoSize: number;
    lineHeight: number;
    fontSize: number;
  }
): string {
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
  const financial =
    report.reportType === "financial" && report.financial
      ? `
      <section class="panel">
        <h2>ملخص مالي</h2>
        <p>إجمالي المخطط: ${Math.round(report.financial.kpis.plannedTotal)}</p>
        <p>إجمالي الالتزام: ${Math.round(report.financial.kpis.committedTotal)}</p>
        <p>المتاح: ${Math.round(report.financial.kpis.remainingAfterCommitment)}</p>
        <p>الانحراف: ${
          report.financial.kpis.variancePct === null ? "غير متاح" : `${report.financial.kpis.variancePct.toFixed(1)}%`
        }</p>
      </section>

      <section class="panel">
        <h2>بنود الميزانية (أعلى 10)</h2>
        <ul>
          ${report.financial.lines
            .slice(0, 10)
            .map(
              (row) =>
                `<li>${escapeHtml(row.title)} | مخطط: ${Math.round(row.plannedWithVat)} | التزام: ${Math.round(
                  row.committed
                )} | متاح: ${Math.round(row.available)}</li>`
            )
            .join("")}
        </ul>
      </section>
    `
      : "";

  return `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(report.title)}</title>
  <style>
    * { box-sizing: border-box; }
    body {
      font-family: "Segoe UI", Tahoma, Arial, sans-serif;
      margin: ${options.bodyMargin}px;
      color: #111827;
      line-height: ${options.lineHeight};
      font-size: ${options.fontSize}px;
      direction: rtl;
      text-align: right;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    h1 { margin: 0 0 8px; font-size: ${options.headingOneSize}px; }
    h2 { margin: 0 0 10px; font-size: ${options.headingTwoSize}px; page-break-after: avoid; }
    p { margin: 0 0 8px; }
    ul { margin: 0; padding-right: 20px; }
    li { margin-bottom: 6px; page-break-inside: avoid; }
    .meta { color: #4b5563; margin-bottom: 14px; font-size: 14px; }
    .panel {
      border: 1px solid #d1d5db;
      border-radius: 10px;
      padding: 14px;
      margin-bottom: ${options.panelMarginBottom}px;
      background: #ffffff;
      page-break-inside: avoid;
    }
    .brand {
      font-size: 12px;
      color: #6b7280;
      margin-bottom: 6px;
    }
    @media print {
      body { margin: 12mm; }
      .panel { page-break-inside: avoid; }
    }
  </style>
</head>
<body>
  <div class="brand">One Minute Strategy</div>
  <h1>${escapeHtml(report.title)}</h1>
  <div class="meta">المعرّف: ${escapeHtml(report.id)} | النوع: ${
    report.reportType === "financial" ? "مالي" : "استراتيجي"
  } | التاريخ: ${escapeHtml(report.date)} | الحالة: ${escapeHtml(report.status)}</div>

  <section class="panel">
    <h2>القرار التنفيذي</h2>
    <p>${escapeHtml(report.executiveDecision || "لا يوجد قرار تنفيذي مولّد بعد.")}</p>
  </section>

  ${compliance}
  ${financial}

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
    "نوع التقرير",
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
    "المخطط المالي",
    "الالتزام المالي",
    "المتاح المالي",
    "الانحراف المالي",
  ];

  const rows = reports.map((report) => {
    const highlightsCount = report.advisorsHighlights.filter((line) => !line.startsWith("لا توجد")).length;
    const recommendationsCount = report.recommendations.filter((line) => !line.startsWith("لا توجد")).length;
    const risksCount = report.risks.filter((line) => !line.startsWith("لا توجد")).length;
    const complianceReady = report.regulatoryCompliance?.readiness ?? "غير متوفر";
    const complianceCompleted = String(report.regulatoryCompliance?.completedCount ?? 0);
    const complianceRequired = String(report.regulatoryCompliance?.requiredCount ?? 0);
    const pendingPaths = report.regulatoryCompliance?.pendingPaths.join(" | ") || "";
    const plannedTotal =
      report.reportType === "financial" && report.financial
        ? String(Math.round(report.financial.kpis.plannedTotal))
        : "";
    const committedTotal =
      report.reportType === "financial" && report.financial
        ? String(Math.round(report.financial.kpis.committedTotal))
        : "";
    const remaining =
      report.reportType === "financial" && report.financial
        ? String(Math.round(report.financial.kpis.remainingAfterCommitment))
        : "";
    const variance =
      report.reportType === "financial" && report.financial
        ? report.financial.kpis.variancePct === null
          ? ""
          : report.financial.kpis.variancePct.toFixed(1)
        : "";

    return [
      report.id,
      report.reportType === "financial" ? "مالي" : "استراتيجي",
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
      plannedTotal,
      committedTotal,
      remaining,
      variance,
    ];
  });

  const allRows = [header, ...rows];
  return allRows.map((row) => row.map(csvCell).join(",")).join("\n");
}

export function buildReportsCsvFileName(): string {
  const today = new Date().toISOString().slice(0, 10);
  return `oms-report-portfolio-${today}-mixed.csv`;
}

function buildReportBaseName(report: StrategyReport): string {
  const normalizedTitle = normalizeFileToken(report.title, 48);
  const normalizedId = normalizeFileToken(report.id, 24);
  const normalizedDate = (report.date || "").replace(/[^\d-]/g, "").slice(0, 10) || "date";
  const status = statusSlug(report.status);
  return `${normalizedTitle || normalizedId || "project"}-${normalizedDate}-${status}`;
}

function normalizeBundleFailedActions(actions: Array<ReportExportAction | BundleExportAction>): BundleExportAction[] {
  const filtered = actions.filter((action): action is BundleExportAction =>
    action === "txt" || action === "docx" || action === "pdf"
  );
  return Array.from(new Set(filtered));
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

function statusSlug(status: StrategyReport["status"]): string {
  if (status === "معتمد") return "approved";
  if (status === "مكتمل") return "completed";
  return "draft";
}

function normalizeFileToken(value: string, maxLength: number): string {
  const normalized = value
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[\\/:*?"<>|]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-+/, "")
    .replace(/-+$/, "");
  return normalized.slice(0, maxLength);
}

function waitForMs(ms: number) {
  return new Promise<void>((resolve) => {
    if (typeof window === "undefined") {
      resolve();
      return;
    }
    window.setTimeout(resolve, ms);
  });
}
