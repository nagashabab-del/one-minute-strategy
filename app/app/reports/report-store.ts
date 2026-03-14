import {
  BUDGET_TRACKER_PREFIX,
  PLAN_TRACKER_PREFIX,
  PROJECTS_REGISTRY_KEY,
  PROJECT_DATA_KEY_PREFIX,
  hydrateWorkspaceFromBackend,
  scheduleWorkspacePersist,
  subscribeWorkspaceBackendSync,
} from "../_lib/workspace-backend";
import {
  DEFAULT_READINESS_PROFILES,
  EXEC_SETTINGS_STORAGE_KEY,
  normalizeReadinessProfiles,
  type ReadinessProfileConfig,
  type ReadinessProfileId,
} from "../_lib/exec-settings";

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

export type ReportDetailSection = {
  title: string;
  lines: string[];
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
  detailedSections?: ReportDetailSection[];
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

type ScopeFrameworkSnapshot = {
  axisId?: string;
  enabled?: boolean;
  inScope?: string;
  outOfScope?: string;
  assumptions?: string;
  constraints?: string;
};

type BoqItemSnapshot = {
  category?: string;
  item?: string;
  qty?: string | number;
  unitCost?: string | number;
  unitSellPrice?: string | number;
  ownerRoleId?: string;
};

type OrgRoleSnapshot = {
  id?: string;
  title?: string;
  enabled?: boolean;
  assignee?: string;
  responsibilities?: string[];
  kpis?: string[];
};

type ActionTaskSnapshot = {
  phase?: string;
  stream?: string;
  task?: string;
  owner?: string;
  dueDate?: string;
  status?: string;
};

type LiveRiskSnapshot = {
  title?: string;
  probability?: string;
  impact?: string;
  owner?: string;
  mitigation?: string;
  reviewDate?: string;
  status?: string;
};

type ChangeRequestSnapshot = {
  title?: string;
  status?: string;
  impactTime?: string;
  impactCost?: string;
  createdAt?: string;
};

type ProjectSnapshot = {
  eventType?: string;
  mode?: string;
  venueType?: string;
  budget?: string;
  project?: string;
  stage?: string;
  userRole?: string;
  deliveryTrack?: string;
  commissioningDate?: string;
  projectStartDate?: string;
  startAt?: string;
  endAt?: string;
  scopeSite?: string;
  scopeTechnical?: string;
  scopeProgram?: string;
  scopeCeremony?: string;
  scopeFramework?: ScopeFrameworkSnapshot[];
  executionStrategy?: string;
  qualityStandards?: string;
  riskManagement?: string;
  responseSla?: string;
  closureRemovalHours?: string;
  boqItems?: BoqItemSnapshot[];
  orgRoles?: OrgRoleSnapshot[];
  actionTrackerItems?: ActionTaskSnapshot[];
  liveRiskItems?: LiveRiskSnapshot[];
  baselineFreeze?: {
    frozenAt?: string;
    note?: string;
  } | null;
  changeRequests?: ChangeRequestSnapshot[];
  advancedPlanText?: string;
  managementBriefText?: string;
  fieldChecklistText?: string;
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
  holder?: string;
  purpose?: string;
  requestedAmount?: number;
  approvedAmount?: number;
  settledAmount?: number;
  status?: string;
  dueDate?: string;
  updatedAt?: string;
};

type BudgetIncreaseSnapshot = {
  lineId?: string;
  requestedBy?: string;
  requestedAmount?: number;
  approvedAmount?: number;
  reason?: string;
  status?: string;
  notes?: string;
  requestedAt?: string;
  reviewedAt?: string;
  reviewedBy?: string;
  updatedAt?: string;
};

type BudgetAuditEntrySnapshot = {
  action?: string;
  details?: string;
  actorLabel?: string;
  createdAt?: string;
};

type BudgetSnapshot = {
  lines?: BudgetLineSnapshot[];
  advances?: BudgetAdvanceSnapshot[];
  budgetIncreases?: BudgetIncreaseSnapshot[];
  plannedRevenue?: number;
  actualRevenue?: number;
  auditTrail?: BudgetAuditEntrySnapshot[];
  updatedAt?: string;
  regulatoryCommitments?: BudgetCommitmentSnapshot[];
};

type PlanTaskSnapshot = {
  title?: string;
  owner?: string;
  phase?: string;
  status?: string;
  progress?: number;
  dueDate?: string;
  critical?: boolean;
  inactive?: boolean;
};

type PlanRiskSnapshot = {
  taskTitle?: string;
  severity?: string;
  state?: string;
  reason?: string;
  updatedAt?: string;
};

type PlanSnapshot = {
  tasks?: PlanTaskSnapshot[];
  risks?: PlanRiskSnapshot[];
  regulatoryInsights?: {
    regulatoryRiskScore?: {
      level?: string;
      score0To100?: number;
    };
    minimumLeadTimeWeeks?: {
      min?: number;
      max?: number;
    };
    requiredPaths?: string[];
    notesAr?: string[];
    alertsAr?: Array<{
      title?: string;
      message?: string;
    }>;
  };
  updatedAt?: string;
};
type VarianceTone = "good" | "warn" | "risk" | "neutral";

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
const SCOPE_AXIS_LABELS: Record<string, string> = {
  site_setup: "الموقع والبنية",
  technical_setup: "التجهيزات الفنية",
  program_execution: "تشغيل البرنامج",
  ceremony_documentation: "التغطية والتوثيق",
  operations_logistics: "التشغيل واللوجستيات",
  marketing_communication: "التسويق والاتصال",
  permits_compliance: "التصاريح والامتثال",
};
const STAGE_LABELS: Record<string, string> = {
  welcome: "الانطلاق",
  projects_hub: "مركز المشاريع",
  init: "تهيئة المشروع",
  round1: "الجولة الأولى",
  round2: "التدقيق",
  dialogue: "الحوار",
  addition: "إضافة قبل التحليل",
  done: "النتائج",
  advanced_scope: "المتقدم: النطاق",
  advanced_boq: "المتقدم: جدول الكميات",
  advanced_plan: "المتقدم: الخطة",
  final_addition: "الاستشارة الختامية",
  final_done: "القرار النهائي",
};
const MIN_APPROVAL_TIMELINE_PCT = 35;

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

type ApprovalGateState = {
  eligible: boolean;
  baselineFrozen: boolean;
  complianceReady: boolean;
  complianceTracked: boolean;
  timelineReady: boolean;
  timelineCompletionPct: number | null;
  activeTimelineTasks: number;
  completedTimelineTasks: number;
  budgetReady: boolean;
  scopeReady: boolean;
  risksReady: boolean;
  tasksReady: boolean;
  readinessCompletionPct: number;
  profileId: "conference" | "operational" | "technical" | "default";
  profileLabel: string;
  conditionalThresholdPct: number;
  readinessAxes: Array<{
    key: string;
    label: string;
    completionPct: number;
    weightPct: number;
    weightedScore: number;
    status: "مكتمل" | "جزئي" | "غير مكتمل";
    reason: string;
    blocking: boolean;
  }>;
  decisionMatrix: {
    status: "جاهز" | "جاهز بشروط" | "غير جاهز";
    summary: string;
    actions: string[];
  };
  first72hPlan: Array<{
    windowLabel: string;
    owner: string;
    task: string;
    dueLabel: string;
  }>;
  blockers: string[];
};

type ReadinessProfileDefinition = ReadinessProfileConfig & { id: ReadinessProfileId };

function resolveReadinessProfileId(snapshot: ProjectSnapshot): ReadinessProfileId {
  const haystack = [
    cleanText(snapshot.eventType),
    cleanText(snapshot.mode),
    cleanText(snapshot.project),
    cleanText(snapshot.venueType),
  ]
    .join(" ")
    .toLowerCase();

  const hasAny = (tokens: string[]) => tokens.some((token) => haystack.includes(token));
  if (hasAny(["مؤتمر", "معرض", "فعالية", "قمة", "ملتقى", "ندوة", "event", "conference", "expo"])) {
    return "conference";
  }
  if (hasAny(["تقني", "تقنية", "رقمي", "digital", "software", "app", "system", "منصة", "it", "cyber"])) {
    return "technical";
  }
  if (hasAny(["تشغيل", "تشغيلي", "عمليات", "ميداني", "لوجستي", "operation", "operations"])) {
    return "operational";
  }
  return "default";
}

function resolveReadinessProfile(snapshot: ProjectSnapshot): ReadinessProfileDefinition {
  const profileId = resolveReadinessProfileId(snapshot);
  let profiles = DEFAULT_READINESS_PROFILES;
  if (typeof window !== "undefined") {
    const raw = localStorage.getItem(EXEC_SETTINGS_STORAGE_KEY);
    const parsed = safeParse<{ readinessProfiles?: Partial<Record<ReadinessProfileId, Partial<ReadinessProfileConfig>>> }>(
      raw,
      {}
    );
    profiles = normalizeReadinessProfiles(parsed.readinessProfiles);
  }
  const selected = profiles[profileId] ?? profiles.default;
  return {
    id: profileId,
    label: selected.label,
    conditionalThresholdPct: selected.conditionalThresholdPct,
    weights: selected.weights,
  };
}

function readinessStatusFromPct(value: number): "مكتمل" | "جزئي" | "غير مكتمل" {
  if (value >= 99.5) return "مكتمل";
  if (value >= 50) return "جزئي";
  return "غير مكتمل";
}

function addHoursLabel(hours: number): string {
  const base = new Date();
  base.setHours(base.getHours() + hours);
  const y = base.getFullYear();
  const m = `${base.getMonth() + 1}`.padStart(2, "0");
  const d = `${base.getDate()}`.padStart(2, "0");
  const hh = `${base.getHours()}`.padStart(2, "0");
  const mm = `${base.getMinutes()}`.padStart(2, "0");
  return `${y}-${m}-${d} ${hh}:${mm}`;
}

function resolveRoleOwner(snapshot: ProjectSnapshot, needles: string[]): string {
  const roles = Array.isArray(snapshot.orgRoles) ? snapshot.orgRoles.filter((role) => role?.enabled) : [];
  for (const role of roles) {
    const title = cleanText(role?.title).toLowerCase();
    if (!title) continue;
    if (needles.some((needle) => title.includes(needle))) {
      return cleanText(role?.assignee) || cleanText(role?.title) || "مدير المشروع";
    }
  }
  const firstEnabled = roles[0];
  return cleanText(firstEnabled?.assignee) || cleanText(firstEnabled?.title) || "مدير المشروع";
}

function evaluateApprovalGate(
  snapshot: ProjectSnapshot,
  budgetSnapshot: BudgetSnapshot,
  planSnapshot: PlanSnapshot,
  regulatoryCompliance?: StrategyReport["regulatoryCompliance"]
): ApprovalGateState {
  const readinessProfile = resolveReadinessProfile(snapshot);
  const planTasks = Array.isArray(planSnapshot.tasks) ? planSnapshot.tasks : [];
  const actionTasks = Array.isArray(snapshot.actionTrackerItems) ? snapshot.actionTrackerItems : [];
  const liveRisks = Array.isArray(snapshot.liveRiskItems) ? snapshot.liveRiskItems : [];
  const boqItems = Array.isArray(snapshot.boqItems) ? snapshot.boqItems : [];
  const budgetLines = Array.isArray(budgetSnapshot.lines) ? budgetSnapshot.lines : [];
  const analysisRisks = snapshot.analysis?.strategic_analysis?.risks ?? [];
  const declaredBudget = numberFromUnknown(snapshot.budget);
  const budgetLinesPlanned = budgetLines.reduce((sum, line) => sum + positive(line.planned ?? 0), 0);
  const boqStructuredCount = boqItems.filter((item) => cleanText(item.item)).length;
  const risksCount = liveRisks.filter((risk) => cleanText(risk.title)).length + analysisRisks.filter((line) => cleanText(line)).length;
  const activeTimelineTasks = planTasks.filter((task) => !task.inactive).length;
  const completedTimelineTasks = planTasks.filter((task) => !task.inactive && cleanText(task.status) === "مكتملة").length;
  const timelineCompletionPct =
    activeTimelineTasks > 0 ? (completedTimelineTasks / activeTimelineTasks) * 100 : null;
  const timelineReady = timelineCompletionPct !== null && timelineCompletionPct >= MIN_APPROVAL_TIMELINE_PCT;
  const tasksCount = actionTasks.filter((task) => cleanText(task.task)).length + activeTimelineTasks;
  const budgetReady = declaredBudget > 0 || budgetLinesPlanned > 0;
  const scopeReady = boqStructuredCount > 0;
  const risksReady = risksCount > 0;
  const tasksReady = tasksCount > 0;
  const baselineFrozen = Boolean(snapshot.baselineFreeze);
  const complianceTracked = Boolean(regulatoryCompliance && regulatoryCompliance.requiredCount > 0);
  const complianceReady = complianceTracked && regulatoryCompliance?.readiness === "جاهز";

  const readinessAxes: ApprovalGateState["readinessAxes"] = [
    {
      key: "budget",
      label: "الميزانية والتمثيل المالي",
      completionPct: budgetReady ? 100 : 0,
      weightPct: readinessProfile.weights.budget,
      weightedScore: 0,
      status: readinessStatusFromPct(budgetReady ? 100 : 0),
      reason: budgetReady ? "تم ربط ميزانية مرجعية أو بنود مالية فعّالة." : "لا توجد ميزانية مرجعية أو بنود مالية كافية.",
      blocking: !budgetReady,
    },
    {
      key: "scope",
      label: "بنود النطاق وجدول الكميات",
      completionPct: scopeReady ? 100 : 0,
      weightPct: readinessProfile.weights.scope,
      weightedScore: 0,
      status: readinessStatusFromPct(scopeReady ? 100 : 0),
      reason: scopeReady ? `تم تسجيل ${boqStructuredCount} بند نطاق/كمية.` : "لا توجد بنود نطاق معتمدة في جدول الكميات.",
      blocking: !scopeReady,
    },
    {
      key: "risks",
      label: "سجل المخاطر",
      completionPct: risksReady ? 100 : 0,
      weightPct: readinessProfile.weights.risks,
      weightedScore: 0,
      status: readinessStatusFromPct(risksReady ? 100 : 0),
      reason: risksReady ? `تم توثيق ${risksCount} مدخل خطر للتحليل.` : "لا يوجد سجل مخاطر فعّال لدعم القرار النهائي.",
      blocking: !risksReady,
    },
    {
      key: "tasks",
      label: "خطة المهام والتنفيذ",
      completionPct: tasksReady ? 100 : 0,
      weightPct: readinessProfile.weights.tasks,
      weightedScore: 0,
      status: readinessStatusFromPct(tasksReady ? 100 : 0),
      reason: tasksReady ? `تم ربط ${tasksCount} مهمة تنفيذية/زمنية.` : "لا توجد مهام تشغيلية فعالة مرتبطة بخطة التنفيذ.",
      blocking: !tasksReady,
    },
    {
      key: "compliance",
      label: "الالتزام التنظيمي",
      completionPct: complianceReady ? 100 : complianceTracked ? 50 : 0,
      weightPct: readinessProfile.weights.compliance,
      weightedScore: 0,
      status: readinessStatusFromPct(complianceReady ? 100 : complianceTracked ? 50 : 0),
      reason: complianceReady
        ? "المسارات التنظيمية المطلوبة بحالة جاهز."
        : complianceTracked
          ? "المسارات التنظيمية موثقة لكن ما زالت بحاجة إقفال."
          : "لا يوجد توثيق لمسارات الالتزام التنظيمي المطلوبة.",
      blocking: !complianceReady,
    },
    {
      key: "approval_gate",
      label: "بوابة الاعتماد الأساسية",
      completionPct: baselineFrozen && timelineReady ? 100 : baselineFrozen || timelineReady ? 50 : 0,
      weightPct: readinessProfile.weights.approval_gate,
      weightedScore: 0,
      status: readinessStatusFromPct(baselineFrozen && timelineReady ? 100 : baselineFrozen || timelineReady ? 50 : 0),
      reason:
        baselineFrozen && timelineReady
          ? "تجميد خط الأساس وتقدم الجدول الزمني ضمن حد الاعتماد."
          : !baselineFrozen && !timelineReady
            ? "لا يوجد تجميد خط أساس وتقدم الجدول الزمني أقل من الحد الأدنى."
            : baselineFrozen
              ? "الجدول الزمني دون الحد الأدنى لاعتماد القرار."
              : "خط الأساس غير مجمد حتى الآن.",
      blocking: !(baselineFrozen && timelineReady),
    },
  ].map((axis) => ({
    ...axis,
    weightedScore: (axis.completionPct * axis.weightPct) / 100,
  }));
  const totalWeight = readinessAxes.reduce((sum, axis) => sum + axis.weightPct, 0);
  const readinessCompletionPct =
    totalWeight > 0
      ? readinessAxes.reduce((sum, axis) => sum + axis.weightedScore, 0)
      : readinessAxes.length > 0
        ? readinessAxes.reduce((sum, axis) => sum + axis.completionPct, 0) / readinessAxes.length
        : 0;

  const blockers: string[] = [];
  if (!baselineFrozen) {
    blockers.push("خط الأساس غير مجمّد");
  }
  if (!timelineReady) {
    if (timelineCompletionPct === null) {
      blockers.push("لا توجد مهام فعالة في الخطة الزمنية");
    } else {
      blockers.push(
        `نسبة إنجاز الخطة الزمنية أقل من ${MIN_APPROVAL_TIMELINE_PCT}% (الحالي ${timelineCompletionPct.toFixed(1)}%)`
      );
    }
  }
  if (!budgetReady) {
    blockers.push("الميزانية غير مكتملة (لا توجد ميزانية مرجعية أو بنود مالية فعّالة)");
  }
  if (!scopeReady) {
    blockers.push("بنود النطاق غير مكتملة (جدول الكميات فارغ)");
  }
  if (!risksReady) {
    blockers.push("سجل المخاطر غير مكتمل");
  }
  if (!tasksReady) {
    blockers.push("خطة المهام غير مكتملة");
  }
  if (!complianceTracked) {
    blockers.push("لا يوجد توثيق لمسارات الالتزام التنظيمي");
  } else if (!complianceReady) {
    blockers.push("الجاهزية التنظيمية ليست بحالة جاهز");
  }

  const decisionMatrix: ApprovalGateState["decisionMatrix"] =
    blockers.length === 0
      ? {
          status: "جاهز",
          summary: "المشروع مستوفٍ لمتطلبات القرار النهائي ويمكن رفعه للاعتماد التنفيذي.",
          actions: [
            "اعتماد القرار النهائي وتثبيت نسخة التقرير التنفيذي.",
            "إصدار أمر بدء التنفيذ وربط المتابعة اليومية بالمؤشرات المعتمدة.",
            "تفعيل آلية مراقبة الانحراف وإغلاق التغييرات الطارئة خلال 24 ساعة.",
          ],
        }
      : readinessCompletionPct >= readinessProfile.conditionalThresholdPct
        ? {
            status: "جاهز بشروط",
            summary: "المشروع قريب من الاعتماد لكن توجد فجوات يجب إغلاقها قبل إصدار القرار النهائي.",
            actions: [
              "إغلاق العوائق الحرجة المدرجة في البوابة خلال نافذة 72 ساعة.",
              "إعادة احتساب الجاهزية بعد إقفال المتطلبات التنظيمية والمهام الناقصة.",
              "عدم إعلان القرار النهائي حتى تتحول البوابة إلى مستوفية.",
            ],
          }
        : {
            status: "غير جاهز",
            summary: "لا يمكن اعتماد القرار النهائي حاليًا لأن الجاهزية أقل من الحد المطلوب.",
            actions: [
              "إيقاف اعتماد القرار النهائي مؤقتًا وربط التنفيذ بخطة إغلاق واضحة.",
              "استكمال البيانات الأساسية (الميزانية/النطاق/المخاطر/المهام/التنظيم).",
              "إعادة تشغيل جلسة القرار بعد تحقق كل المحاور الأساسية.",
            ],
          };

  const first72PlanSeed: Array<{ owner: string; task: string }> = [];
  if (!budgetReady) {
    first72PlanSeed.push({
      owner: resolveRoleOwner(snapshot, ["مالي", "finance", "financial"]),
      task: "استكمال خط الميزانية المرجعي وربطه ببنود التنفيذ والربحية.",
    });
  }
  if (!scopeReady) {
    first72PlanSeed.push({
      owner: resolveRoleOwner(snapshot, ["تشغيل", "operations", "operation"]),
      task: "اعتماد بنود النطاق وجدول الكميات مع ربط كل بند بمالك ومسؤول تسليم.",
    });
  }
  if (!risksReady) {
    first72PlanSeed.push({
      owner: resolveRoleOwner(snapshot, ["مخاطر", "risk"]),
      task: "إنشاء سجل مخاطر تشغيلي وتحديد احتمالية/تأثير وخطة معالجة لكل خطر.",
    });
  }
  if (!tasksReady) {
    first72PlanSeed.push({
      owner: resolveRoleOwner(snapshot, ["مدير", "project", "operations"]),
      task: "بناء خطة مهام تفصيلية مع تواريخ مستهدفة ومسؤول مباشر لكل مهمة.",
    });
  }
  if (!complianceTracked || !complianceReady) {
    first72PlanSeed.push({
      owner: resolveRoleOwner(snapshot, ["تنظيم", "امتثال", "compliance", "regulatory"]),
      task: "تثبيت مسارات الالتزام التنظيمي وإقفال المعلّق قبل موعد الاعتماد النهائي.",
    });
  }
  if (!baselineFrozen) {
    first72PlanSeed.push({
      owner: resolveRoleOwner(snapshot, ["مدير", "project"]),
      task: "تجميد خط الأساس وإصدار نسخة معتمدة للنطاق والزمن والميزانية.",
    });
  }
  if (!timelineReady) {
    first72PlanSeed.push({
      owner: resolveRoleOwner(snapshot, ["مدير", "project", "operations"]),
      task: `رفع إنجاز الخطة الزمنية إلى ${MIN_APPROVAL_TIMELINE_PCT}% كحد أدنى لاعتماد القرار.`,
    });
  }
  if (first72PlanSeed.length === 0) {
    first72PlanSeed.push(
      {
        owner: resolveRoleOwner(snapshot, ["مدير", "project"]),
        task: "إطلاق اجتماع تشغيل يومي لضبط التنفيذ والانحرافات الحرجة.",
      },
      {
        owner: resolveRoleOwner(snapshot, ["مالي", "finance", "financial"]),
        task: "مراقبة التدفق المالي اليومي وربط أي صرف بحدود الميزانية المعتمدة.",
      },
      {
        owner: resolveRoleOwner(snapshot, ["تشغيل", "operations"]),
        task: "تشغيل خطة الاستعداد الميداني والتحقق من جاهزية الفرق.",
      }
    );
  }
  const windows = ["0-24 ساعة", "24-48 ساعة", "48-72 ساعة"];
  const first72hPlan = first72PlanSeed.slice(0, 6).map((item, idx) => ({
    windowLabel: windows[idx % windows.length],
    owner: item.owner,
    task: item.task,
    dueLabel: addHoursLabel((idx % 3 === 0 ? 24 : idx % 3 === 1 ? 48 : 72)),
  }));

  return {
    eligible: blockers.length === 0,
    baselineFrozen,
    complianceReady,
    complianceTracked,
    timelineReady,
    timelineCompletionPct,
    activeTimelineTasks,
    completedTimelineTasks,
    budgetReady,
    scopeReady,
    risksReady,
    tasksReady,
    readinessCompletionPct,
    profileId: readinessProfile.id,
    profileLabel: readinessProfile.label,
    conditionalThresholdPct: readinessProfile.conditionalThresholdPct,
    readinessAxes,
    decisionMatrix,
    first72hPlan,
    blockers,
  };
}

function deriveStrategyStatus(snapshot: ProjectSnapshot, approvalGate: ApprovalGateState): StrategyReport["status"] {
  if (snapshot.advancedApproved && approvalGate.eligible) return "معتمد";
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

function deriveFinancialStatus(
  snapshot: ProjectSnapshot,
  financial: FinancialReportPayload,
  approvalGate: ApprovalGateState
): StrategyReport["status"] {
  const hasActivity =
    financial.kpis.actualTotal > 0 ||
    financial.kpis.reservedTotal > 0 ||
    financial.kpis.actualRevenue > 0 ||
    financial.kpis.openAdvancesCount > 0;
  if (snapshot.advancedApproved && financial.lines.length > 0 && hasActivity && approvalGate.eligible) return "معتمد";
  if (financial.lines.length > 0 || financial.kpis.openAdvancesCount > 0) return "مكتمل";
  return "مسودة";
}

function deriveFinancialDecision(financial: FinancialReportPayload): string {
  const hasActivity =
    financial.kpis.actualTotal > 0 ||
    financial.kpis.reservedTotal > 0 ||
    financial.kpis.actualRevenue > 0 ||
    financial.kpis.openAdvancesCount > 0;
  if (!hasActivity) {
    return `لا توجد حركة مالية فعلية بعد. التقرير الحالي يعكس خط الأساس المالي بمخطط ${Math.round(
      financial.kpis.plannedTotal
    )} قبل تسجيل أي صرف أو تحصيل.`;
  }

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
  const hasActivity =
    financial.kpis.actualTotal > 0 ||
    financial.kpis.reservedTotal > 0 ||
    financial.kpis.actualRevenue > 0 ||
    financial.kpis.openAdvancesCount > 0;
  const topLine = [...financial.lines].sort((a, b) => b.committed - a.committed)[0];
  const topLineText =
    topLine && topLine.committed > 0
      ? `أعلى بند صرفًا: ${topLine.title} بقيمة ${Math.round(topLine.committed)}`
      : "أعلى بند صرفًا: لا يوجد صرف فعلي مسجل بعد.";
  const items = [
    `إجمالي المخطط (شامل الضريبة): ${Math.round(financial.kpis.plannedTotal)}`,
    `إجمالي الالتزام الفعلي + العهد: ${Math.round(financial.kpis.committedTotal)}`,
    `العهد المفتوحة: ${financial.kpis.openAdvancesCount} (المتأخرة: ${financial.kpis.overdueAdvances})`,
    topLineText,
  ].filter(Boolean);
  if (!hasActivity) {
    items.unshift("لا توجد حركة صرف أو عهد أو تحصيل فعلي حتى الآن.");
  }
  return items.length ? items : ["لا توجد مؤشرات مالية منشورة بعد."];
}

function deriveFinancialRisks(financial: FinancialReportPayload): string[] {
  const hasActivity =
    financial.kpis.actualTotal > 0 ||
    financial.kpis.reservedTotal > 0 ||
    financial.kpis.actualRevenue > 0 ||
    financial.kpis.openAdvancesCount > 0;
  if (!hasActivity) {
    return ["لا يمكن تقييم مخاطر الانحراف المالي قبل تسجيل أول حركة صرف/عهد/إيراد فعلية."];
  }

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
  const hasActivity =
    financial.kpis.actualTotal > 0 ||
    financial.kpis.reservedTotal > 0 ||
    financial.kpis.actualRevenue > 0 ||
    financial.kpis.openAdvancesCount > 0;
  if (!hasActivity) {
    return [
      "بدء أول دورة مالية فعلية: اعتماد عهدة تشغيلية وربطها بخطة الصرف اليومية.",
      "تسجيل خط الإيراد المستهدف فعليًا قبل جلسة القرار النهائي لضبط الربحية المتوقعة.",
      "إعادة تشغيل التقرير بعد إدخال أول حركة مالية حتى تصبح مؤشرات الانحراف قابلة للحكم.",
    ];
  }

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

function cleanText(value?: string): string {
  return typeof value === "string" ? value.trim() : "";
}

function oneLine(value?: string, maxLength = 180): string {
  const normalized = cleanText(value).replace(/\s+/g, " ");
  if (!normalized) return "";
  if (normalized.length <= maxLength) return normalized;
  return `${normalized.slice(0, maxLength - 1).trimEnd()}…`;
}

function stageLabel(value?: string): string {
  const stage = cleanText(value);
  if (!stage) return "غير محدد";
  return STAGE_LABELS[stage] ?? stage;
}

function numberFromUnknown(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value !== "string") return 0;
  const normalized = value.replace(/[^\d.-]/g, "").trim();
  if (!normalized) return 0;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatAmount(value: number): string {
  if (!Number.isFinite(value)) return "0";
  return Math.round(value).toLocaleString("en-US");
}

function formatSignedCurrencyValue(value: number): string {
  const safe = Number.isFinite(value) ? value : 0;
  const sign = safe < 0 ? "-" : safe > 0 ? "+" : "";
  return `${sign}${formatAmount(Math.abs(safe))}`;
}

function formatPercent(value: number | null, digits = 1): string {
  if (value === null || !Number.isFinite(value)) return "غير متاح";
  return `${value.toFixed(digits)}%`;
}

function varianceToneFromValue(value: number | null): VarianceTone {
  if (value === null || !Number.isFinite(value)) return "neutral";
  const abs = Math.abs(value);
  if (abs <= 5) return "good";
  if (abs <= 15) return "warn";
  return "risk";
}

function varianceToneLabel(value: number | null): string {
  const tone = varianceToneFromValue(value);
  if (tone === "good") return "منخفض";
  if (tone === "warn") return "متوسط";
  if (tone === "risk") return "مرتفع";
  return "غير متاح";
}

function varianceToneHex(tone: VarianceTone): string {
  if (tone === "good") return "147D64";
  if (tone === "warn") return "9A6700";
  if (tone === "risk") return "B42318";
  return "475467";
}

function varianceToneFromLine(line: string): VarianceTone | null {
  if (!/انحراف/.test(line)) return null;
  const match = line.match(/(-?\d+(?:\.\d+)?)%/);
  if (!match) return null;
  const value = Number(match[1]);
  if (!Number.isFinite(value)) return null;
  return varianceToneFromValue(value);
}

function varianceLegendLines(): string[] {
  return [
    "منخفض: الانحراف حتى 5%.",
    "متوسط: الانحراف أكبر من 5% وحتى 15%.",
    "مرتفع: الانحراف أكبر من 15%.",
  ];
}

function isFinancialDetailSection(title: string): boolean {
  return title === "الملخص المالي التنفيذي" || title === "التمثيل المالي المقارن";
}

function hasDetailedSection(report: StrategyReport, title: string): boolean {
  return (report.detailedSections ?? []).some((section) => section.title === title);
}

function buildDetailedSections(
  snapshot: ProjectSnapshot,
  budgetSnapshot: BudgetSnapshot,
  planSnapshot: PlanSnapshot,
  financialPayload: FinancialReportPayload | null,
  regulatoryCompliance: StrategyReport["regulatoryCompliance"] | undefined,
  approvalGate: ApprovalGateState
): ReportDetailSection[] {
  const sections: ReportDetailSection[] = [];
  const today = new Date().toISOString().slice(0, 10);
  const pushSection = (title: string, lines: string[]) => {
    const normalized = lines
      .map((line) => oneLine(line, 240))
      .filter((line) => line.length > 0);
    if (!normalized.length) return;
    sections.push({ title, lines: normalized });
  };

  const contextLines = [
    `اسم المشروع: ${cleanText(snapshot.project) || "غير محدد"}`,
    `المرحلة الحالية: ${stageLabel(snapshot.stage)}`,
    `نوع المبادرة: ${cleanText(snapshot.eventType) || "غير محدد"}`,
    `نمط التنفيذ: ${cleanText(snapshot.mode) || "غير محدد"}`,
    `نوع الموقع: ${cleanText(snapshot.venueType) || "غير محدد"}`,
    `المسار التشغيلي: ${cleanText(snapshot.deliveryTrack) || "غير محدد"}`,
    `الدور المستخدم: ${cleanText(snapshot.userRole) || "غير محدد"}`,
  ];
  if (cleanText(snapshot.commissioningDate)) {
    contextLines.push(`تاريخ التعميد: ${cleanText(snapshot.commissioningDate)}`);
  }
  if (cleanText(snapshot.projectStartDate)) {
    contextLines.push(`تاريخ بداية المشروع: ${cleanText(snapshot.projectStartDate)}`);
  }
  if (cleanText(snapshot.startAt) || cleanText(snapshot.endAt)) {
    contextLines.push(
      `النافذة الزمنية للتنفيذ: ${cleanText(snapshot.startAt) || "غير محدد"} → ${cleanText(snapshot.endAt) || "غير محدد"}`
    );
  }
  if (cleanText(snapshot.budget)) {
    contextLines.push(`الميزانية المرجعية المعلنة: ${cleanText(snapshot.budget)}`);
  }
  pushSection("ملف المشروع التنفيذي", contextLines);

  const scopeLines: string[] = [];
  if (cleanText(snapshot.scopeSite)) {
    scopeLines.push(`نطاق الموقع: ${oneLine(snapshot.scopeSite, 210)}`);
  }
  if (cleanText(snapshot.scopeTechnical)) {
    scopeLines.push(`النطاق الفني: ${oneLine(snapshot.scopeTechnical, 210)}`);
  }
  if (cleanText(snapshot.scopeProgram)) {
    scopeLines.push(`نطاق البرنامج: ${oneLine(snapshot.scopeProgram, 210)}`);
  }
  if (cleanText(snapshot.scopeCeremony)) {
    scopeLines.push(`نطاق المراسم/التغطية: ${oneLine(snapshot.scopeCeremony, 210)}`);
  }
  const scopeFramework = Array.isArray(snapshot.scopeFramework) ? snapshot.scopeFramework : [];
  const enabledScopeAxes = scopeFramework.filter((item) => item?.enabled);
  if (enabledScopeAxes.length > 0) {
    const axisLabels = enabledScopeAxes
      .map((item) => (item.axisId ? SCOPE_AXIS_LABELS[item.axisId] ?? item.axisId : "محور غير محدد"))
      .slice(0, 6);
    scopeLines.push(`المحاور المفعلة: ${axisLabels.join("، ")}`);
    const withAssumptions = enabledScopeAxes.filter((item) => cleanText(item.assumptions)).length;
    const withConstraints = enabledScopeAxes.filter((item) => cleanText(item.constraints)).length;
    scopeLines.push(`توثيق الافتراضات: ${withAssumptions}/${enabledScopeAxes.length} · القيود: ${withConstraints}/${enabledScopeAxes.length}`);
  }
  pushSection("النطاق وحدود العمل", scopeLines);

  const boqItems = Array.isArray(snapshot.boqItems) ? snapshot.boqItems : [];
  const boqLines: string[] = [];
  if (boqItems.length > 0) {
    let estimatedCost = 0;
    let estimatedRevenue = 0;
    for (const row of boqItems) {
      const qty = numberFromUnknown(row.qty);
      const unitCost = numberFromUnknown(row.unitCost);
      const unitSellPrice = numberFromUnknown(row.unitSellPrice);
      if (qty > 0) {
        estimatedCost += qty * unitCost;
        estimatedRevenue += qty * unitSellPrice;
      }
    }
    boqLines.push(`عدد بنود جدول الكميات: ${boqItems.length}`);
    if (estimatedCost > 0 || estimatedRevenue > 0) {
      const grossMargin = estimatedRevenue - estimatedCost;
      const marginPct = estimatedRevenue > 0 ? (grossMargin / estimatedRevenue) * 100 : null;
      boqLines.push(
        `إجمالي تكلفة تقديرية من البنود: ${formatAmount(estimatedCost)} · إجمالي بيع تقديري: ${formatAmount(estimatedRevenue)} · هامش تقديري: ${formatAmount(grossMargin)} (${formatPercent(marginPct)})`
      );
    }
    const topItems = boqItems
      .map((item) => cleanText(item.item))
      .filter(Boolean)
      .slice(0, 5);
    if (topItems.length > 0) {
      boqLines.push(`أهم البنود المسجلة: ${topItems.join("، ")}`);
    }
  }
  pushSection("جدول الكميات والتسعير", boqLines);

  const orgRoles = Array.isArray(snapshot.orgRoles) ? snapshot.orgRoles : [];
  const enabledRoles = orgRoles.filter((role) => role?.enabled);
  const actionTasks = Array.isArray(snapshot.actionTrackerItems) ? snapshot.actionTrackerItems : [];
  const taskStats = {
    total: actionTasks.length,
    done: 0,
    inProgress: 0,
    blocked: 0,
    pending: 0,
    overdue: 0,
  };
  const ownerLoad = new Map<string, number>();
  const blockedTitles: string[] = [];
  for (const task of actionTasks) {
    const status = cleanText(task.status);
    if (status === "مكتمل") taskStats.done += 1;
    else if (status === "جاري") taskStats.inProgress += 1;
    else if (status === "متعثر") taskStats.blocked += 1;
    else taskStats.pending += 1;
    const dueDate = cleanText(task.dueDate);
    if (dueDate && dueDate < today && status !== "مكتمل") taskStats.overdue += 1;
    const owner = cleanText(task.owner) || "غير محدد";
    ownerLoad.set(owner, (ownerLoad.get(owner) ?? 0) + 1);
    if (status === "متعثر" && blockedTitles.length < 4) {
      blockedTitles.push(cleanText(task.task) || "مهمة بدون عنوان");
    }
  }
  const topOwners = Array.from(ownerLoad.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([owner, count]) => `${owner}: ${count} مهمة`);
  const teamLines: string[] = [];
  if (enabledRoles.length > 0) {
    teamLines.push(`الأدوار المفعلة: ${enabledRoles.length}`);
    const teamRoster = enabledRoles
      .map((role) => `${cleanText(role.title) || role.id || "دور"} (${cleanText(role.assignee) || "غير مسند"})`)
      .slice(0, 6);
    if (teamRoster.length > 0) teamLines.push(`توزيع الفريق: ${teamRoster.join("، ")}`);
  }
  if (taskStats.total > 0) {
    teamLines.push(
      `حالة المهام: إجمالي ${taskStats.total} · مكتمل ${taskStats.done} · جاري ${taskStats.inProgress} · متعثر ${taskStats.blocked} · لم تبدأ ${taskStats.pending}`
    );
    teamLines.push(`المهام المتأخرة: ${taskStats.overdue}`);
    if (topOwners.length > 0) {
      teamLines.push(`حمولة المهام حسب المسؤول: ${topOwners.join(" | ")}`);
    }
    if (blockedTitles.length > 0) {
      teamLines.push(`أهم المهام المتعثرة: ${blockedTitles.join("، ")}`);
    }
  }
  pushSection("فريق التنفيذ وتوزيع المهام", teamLines);

  const liveRisks = Array.isArray(snapshot.liveRiskItems) ? snapshot.liveRiskItems : [];
  const openLiveRisks = liveRisks.filter((risk) => cleanText(risk.status) !== "مغلق");
  const escalatedLiveRisks = liveRisks.filter((risk) => cleanText(risk.status) === "مصعّد");
  const highLiveRisks = liveRisks.filter(
    (risk) =>
      cleanText(risk.probability) === "مرتفع" ||
      cleanText(risk.impact) === "مرتفع" ||
      cleanText(risk.status) === "مصعّد"
  );
  const topLiveRisks = openLiveRisks
    .slice(0, 5)
    .map((risk) => `${cleanText(risk.title) || "خطر بدون عنوان"} (${cleanText(risk.owner) || "غير محدد"})`);

  const planRisks = Array.isArray(planSnapshot.risks) ? planSnapshot.risks : [];
  const openPlanRisks = planRisks.filter((risk) => cleanText(risk.state) === "مفتوح");
  const riskLines = [
    `سجل المخاطر التشغيلي: إجمالي ${liveRisks.length} · مفتوح ${openLiveRisks.length} · مصعّد ${escalatedLiveRisks.length} · عالي التأثير/الاحتمال ${highLiveRisks.length}`,
    `مخاطر الجدول الزمني (من المسار المتقدم): مفتوح ${openPlanRisks.length} من أصل ${planRisks.length}`,
  ];
  if (topLiveRisks.length > 0) {
    riskLines.push(`أهم المخاطر المفتوحة: ${topLiveRisks.join("، ")}`);
  }
  pushSection("المخاطر والمتابعة", riskLines);

  const planTasks = Array.isArray(planSnapshot.tasks) ? planSnapshot.tasks : [];
  const activePlanTasks = planTasks.filter((task) => !task.inactive);
  const delayedPlanTasks = activePlanTasks.filter((task) => cleanText(task.status) === "متأخرة");
  const criticalDelayed = delayedPlanTasks.filter((task) => task.critical).length;
  const completedPlanTasks = activePlanTasks.filter((task) => cleanText(task.status) === "مكتملة").length;
  const completionRatio = activePlanTasks.length > 0 ? (completedPlanTasks / activePlanTasks.length) * 100 : null;
  const regulatoryRiskScore = planSnapshot.regulatoryInsights?.regulatoryRiskScore?.score0To100;
  const regulatoryRiskLevel = cleanText(planSnapshot.regulatoryInsights?.regulatoryRiskScore?.level);
  const leadRange = planSnapshot.regulatoryInsights?.minimumLeadTimeWeeks;
  const timelineLines: string[] = [];
  if (activePlanTasks.length > 0) {
    timelineLines.push(
      `الجاهزية الزمنية: مكتمل ${completedPlanTasks}/${activePlanTasks.length} (${formatPercent(completionRatio)}) · متأخر ${delayedPlanTasks.length} · متأخر حرج ${criticalDelayed}`
    );
  }
  if (Number.isFinite(regulatoryRiskScore)) {
    timelineLines.push(
      `المخاطر التنظيمية التقديرية: ${Math.round(Number(regulatoryRiskScore))}/100 (${regulatoryRiskLevel || "غير محدد"})`
    );
  }
  if (leadRange && Number.isFinite(leadRange.min) && Number.isFinite(leadRange.max)) {
    timelineLines.push(
      `المدة التنظيمية الدنيا المتوقعة: ${Math.round(Number(leadRange.min))} - ${Math.round(Number(leadRange.max))} أسابيع`
    );
  }
  const requiredPaths = Array.isArray(planSnapshot.regulatoryInsights?.requiredPaths)
    ? planSnapshot.regulatoryInsights?.requiredPaths ?? []
    : [];
  if (requiredPaths.length > 0) {
    timelineLines.push(
      `المسارات التنظيمية المتوقعة: ${requiredPaths
        .map((path) => REGULATORY_PATH_LABELS[path] ?? path)
        .join("، ")}`
    );
  }
  pushSection("البرنامج الزمني والجاهزية التنظيمية", timelineLines);

  const changeRequests = Array.isArray(snapshot.changeRequests) ? snapshot.changeRequests : [];
  const openChanges = changeRequests.filter((item) => cleanText(item.status) === "مفتوح").length;
  const approvedChanges = changeRequests.filter((item) => cleanText(item.status) === "معتمد").length;
  const rejectedChanges = changeRequests.filter((item) => cleanText(item.status) === "مرفوض").length;
  const governanceLines = [
    `حالة تجميد الخط الأساسي: ${snapshot.baselineFreeze ? "مفعّل" : "غير مفعّل"}`,
    `طلبات التغيير: إجمالي ${changeRequests.length} · مفتوح ${openChanges} · معتمد ${approvedChanges} · مرفوض ${rejectedChanges}`,
    `سجل تدقيق الميزانية: ${Array.isArray(budgetSnapshot.auditTrail) ? budgetSnapshot.auditTrail.length : 0} إجراء`,
  ];
  if (snapshot.baselineFreeze?.frozenAt) {
    governanceLines.push(`آخر تجميد: ${snapshot.baselineFreeze.frozenAt}`);
  }
  if (snapshot.baselineFreeze?.note) {
    governanceLines.push(`ملاحظة التجميد: ${oneLine(snapshot.baselineFreeze.note, 200)}`);
  }
  pushSection("الحوكمة وإدارة التغيير", governanceLines);

  const approvalGateLines = [
    `حالة بوابة الاعتماد النهائي: ${approvalGate.eligible ? "مستوفية" : "غير مستوفية"}`,
    `تجميد خط الأساس: ${approvalGate.baselineFrozen ? "مفعّل" : "غير مفعّل"}`,
    `الميزانية والتمثيل المالي: ${approvalGate.budgetReady ? "مستوفية" : "غير مستوفية"}`,
    `بنود النطاق وجدول الكميات: ${approvalGate.scopeReady ? "مستوفية" : "غير مستوفية"}`,
    `سجل المخاطر: ${approvalGate.risksReady ? "مستوفية" : "غير مستوفية"}`,
    `خطة المهام والتنفيذ: ${approvalGate.tasksReady ? "مستوفية" : "غير مستوفية"}`,
    `الجاهزية التنظيمية: ${
      regulatoryCompliance ? regulatoryCompliance.readiness : "غير مقاسة"
    }`,
    `توثيق الالتزام التنظيمي: ${approvalGate.complianceTracked ? "موجود" : "غير موجود"}`,
    `تقدم الخطة الزمنية: ${
      approvalGate.timelineCompletionPct === null
        ? "غير متاح"
        : `${approvalGate.timelineCompletionPct.toFixed(1)}%`
    } (${approvalGate.completedTimelineTasks}/${approvalGate.activeTimelineTasks})`,
    `الحد الأدنى لاعتماد القرار: ${MIN_APPROVAL_TIMELINE_PCT}% تقدم زمني`,
  ];
  if (approvalGate.blockers.length > 0) {
    approvalGateLines.push(`عوائق الاعتماد الحالية: ${approvalGate.blockers.join("، ")}`);
  }
  pushSection("بوابة اعتماد القرار النهائي", approvalGateLines);

  const readinessLines = [
    `نوع المصفوفة المطبق: ${approvalGate.profileLabel}`,
    `حد حالة "جاهز بشروط": ${approvalGate.conditionalThresholdPct.toFixed(0)}%`,
    `درجة الجاهزية الكلية: ${approvalGate.readinessCompletionPct.toFixed(1)}%`,
    ...approvalGate.readinessAxes.map(
      (axis) =>
        `${axis.label}: ${axis.completionPct.toFixed(0)}% (الوزن ${axis.weightPct.toFixed(
          0
        )}% · الأثر ${axis.weightedScore.toFixed(1)} نقطة · ${axis.status}) · ${axis.reason}`
    ),
  ];
  pushSection("جاهزية القرار النهائي", readinessLines);

  const decisionMatrixLines = [
    `نوع المصفوفة: ${approvalGate.profileLabel}`,
    `نتيجة المصفوفة: ${approvalGate.decisionMatrix.status}`,
    `ملخص القرار: ${approvalGate.decisionMatrix.summary}`,
    `عوائق القرار الحالية: ${approvalGate.blockers.length > 0 ? approvalGate.blockers.join("، ") : "لا توجد عوائق مفتوحة."}`,
    ...approvalGate.decisionMatrix.actions.map((action, idx) => `إجراء ${idx + 1}: ${action}`),
  ];
  pushSection("مصفوفة القرار التنفيذي", decisionMatrixLines);

  const first72Lines = approvalGate.first72hPlan.map(
    (item) =>
      `${item.windowLabel} | المالك: ${item.owner} | الإجراء: ${item.task} | الموعد المستهدف: ${item.dueLabel}`
  );
  if (first72Lines.length > 0) {
    pushSection("خطة أول 72 ساعة", first72Lines);
  }

  if (financialPayload) {
    const hasFinancialActivity =
      financialPayload.kpis.actualTotal > 0 ||
      financialPayload.kpis.reservedTotal > 0 ||
      financialPayload.kpis.actualRevenue > 0 ||
      financialPayload.kpis.openAdvancesCount > 0;
    const topFinancialLine = [...financialPayload.lines].sort((a, b) => b.committed - a.committed)[0];
    const financialLines = [
      `المخطط المالي (شامل الضريبة): ${formatAmount(financialPayload.kpis.plannedTotal)} · الالتزام: ${formatAmount(
        financialPayload.kpis.committedTotal
      )} · المتاح: ${formatAmount(financialPayload.kpis.remainingAfterCommitment)}`,
      `الإيراد: مخطط ${formatAmount(financialPayload.kpis.plannedRevenue)} · فعلي ${formatAmount(
        financialPayload.kpis.actualRevenue
      )}`,
      `الربح بعد الضريبة: مخطط ${formatAmount(financialPayload.kpis.plannedProfitAfterVat)} · فعلي ${formatAmount(
        financialPayload.kpis.actualProfitAfterVat
      )} · الانحراف ${formatPercent(financialPayload.kpis.variancePct)} (${varianceToneLabel(
        financialPayload.kpis.variancePct
      )})`,
      `العهد المفتوحة: ${financialPayload.kpis.openAdvancesCount} · المتأخرة: ${financialPayload.kpis.overdueAdvances} · نسبة التسوية: ${formatPercent(
        financialPayload.kpis.settlementRate
      )} · طلبات الزيادة المفتوحة: ${financialPayload.kpis.openIncreaseRequests}`,
    ];
    if (!hasFinancialActivity) {
      financialLines.push("ملاحظة تفسيرية: المؤشرات أعلاه تمثل خط الأساس قبل أي حركة مالية فعلية.");
    }
    if (financialPayload.kpis.plannedRevenue === 0 && financialPayload.kpis.actualRevenue === 0) {
      financialLines.push("بيانات الإيراد غير مدخلة بعد، لذلك لا يمكن الحكم النهائي على الربحية.");
    }
    if (topFinancialLine) {
      if (topFinancialLine.committed > 0) {
        financialLines.push(
          `أعلى بند التزام: ${topFinancialLine.title} (${topFinancialLine.owner}) بقيمة ${formatAmount(
            topFinancialLine.committed
          )} مقابل مخطط ${formatAmount(topFinancialLine.plannedWithVat)}`
        );
      } else {
        financialLines.push(
          `أعلى بند التزام: لا يوجد صرف فعلي مسجل بعد. أعلى مخطط حاليًا هو ${topFinancialLine.title} بقيمة ${formatAmount(
            topFinancialLine.plannedWithVat
          )}.`
        );
      }
    }
    pushSection("الملخص المالي التنفيذي", financialLines);

    const compositionTotal = financialPayload.composition.reduce((sum, slice) => sum + Math.max(0, slice.value), 0);
    const compositionLines =
      compositionTotal > 0
        ? financialPayload.composition.map((slice) => {
            const safeValue = Math.max(0, slice.value);
            const pct = compositionTotal > 0 ? (safeValue / compositionTotal) * 100 : 0;
            return `${slice.label}: ${formatAmount(safeValue)} (${pct.toFixed(1)}%)`;
          })
        : ["لا يوجد توزيع مالي فعلي حتى الآن."];

    const rankedByVariance = [...financialPayload.lines]
      .map((line) => ({
        title: line.title,
        variancePct: line.variancePct ?? 0,
        committed: line.committed,
        planned: line.plannedWithVat,
      }))
      .sort((a, b) => Math.abs(b.variancePct) - Math.abs(a.variancePct))
      .slice(0, 5);
    if (rankedByVariance.length > 0) {
      compositionLines.push(
        `أعلى انحرافات البنود: ${rankedByVariance
          .map((line) => `${line.title} (${line.variancePct.toFixed(1)}%)`)
          .join("، ")}`
      );
    }

    const commitmentShare = [...financialPayload.lines]
      .filter((line) => line.committed > 0)
      .sort((a, b) => b.committed - a.committed)
      .slice(0, 5)
      .map((line) => {
        const share =
          financialPayload.kpis.committedTotal > 0
            ? (line.committed / financialPayload.kpis.committedTotal) * 100
            : 0;
        return `${line.title}: ${formatAmount(line.committed)} (${share.toFixed(1)}%)`;
      });
    if (commitmentShare.length > 0) {
      compositionLines.push(`توزيع الالتزام على البنود الأعلى: ${commitmentShare.join(" | ")}`);
    }

    const plannedProfitGap = financialPayload.kpis.actualProfitAfterVat - financialPayload.kpis.plannedProfitAfterVat;
    const beforeVatGap = financialPayload.kpis.actualProfitBeforeVat - financialPayload.kpis.plannedProfitBeforeVat;
    compositionLines.push(
      `فجوة الربح (بعد الضريبة): ${formatSignedCurrencyValue(plannedProfitGap)} · قبل الضريبة: ${formatSignedCurrencyValue(beforeVatGap)}`
    );
    pushSection("التمثيل المالي المقارن", compositionLines);
  }

  const outputLines: string[] = [];
  if (cleanText(snapshot.advancedPlanText)) {
    outputLines.push(`الخطة المتقدمة: ${oneLine(snapshot.advancedPlanText, 220)}`);
  }
  if (cleanText(snapshot.managementBriefText)) {
    outputLines.push(`الملخص الإداري: ${oneLine(snapshot.managementBriefText, 220)}`);
  }
  if (cleanText(snapshot.fieldChecklistText)) {
    outputLines.push(`قائمة التحقق الميدانية: ${oneLine(snapshot.fieldChecklistText, 220)}`);
  }
  if (outputLines.length > 0) {
    pushSection("المخرجات التنفيذية الجاهزة", outputLines);
  }

  return sections;
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
      const planSnapshot = safeParse<PlanSnapshot>(localStorage.getItem(planTrackerKey(project.id)), {});
      const baseTitle = snapshot.project?.trim() || project.name || "مشروع بدون اسم";
      const strategyDate = toIsoDate(project.updatedAt);
      const financialDate = toIsoDate(budgetSnapshot.updatedAt || project.updatedAt);
      const regulatoryCompliance = deriveRegulatoryCompliance(project.id);
      const financialPayload = buildFinancialPayload(budgetSnapshot);
      const approvalGate = evaluateApprovalGate(snapshot, budgetSnapshot, planSnapshot, regulatoryCompliance);
      const detailedSections = buildDetailedSections(
        snapshot,
        budgetSnapshot,
        planSnapshot,
        financialPayload,
        regulatoryCompliance,
        approvalGate
      );
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
          status: deriveStrategyStatus(snapshot, approvalGate),
          executiveDecision: deriveExecutiveDecision(snapshot),
          advisorsHighlights: deriveAdvisorHighlights(snapshot),
          risks: deriveRisks(snapshot),
          recommendations: deriveRecommendations(snapshot),
          detailedSections,
          regulatoryCompliance,
        });
      }

      if (financialPayload) {
        records.push({
          id: financialReportId(project.id),
          projectId: project.id,
          reportType: "financial",
          title: `${baseTitle} · تقرير مالي تنفيذي`,
          date: financialDate,
          status: deriveFinancialStatus(snapshot, financialPayload, approvalGate),
          executiveDecision: deriveFinancialDecision(financialPayload),
          advisorsHighlights: deriveFinancialHighlights(financialPayload),
          risks: deriveFinancialRisks(financialPayload),
          recommendations: deriveFinancialRecommendations(financialPayload),
          financial: financialPayload,
          detailedSections,
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
  parts.push(localStorage.getItem(EXEC_SETTINGS_STORAGE_KEY) ?? "");

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

  if (report.detailedSections?.length) {
    for (const detail of report.detailedSections) {
      sections.push(detail.title);
      sections.push("----------------------");
      for (const line of detail.lines) {
        sections.push(`- ${line}`);
      }
      sections.push("");
    }
  }

  if (report.reportType === "financial" && report.financial) {
    sections.push("دليل ألوان الانحراف المالي");
    sections.push("----------------------");
    for (const line of varianceLegendLines()) {
      sections.push(`- ${line}`);
    }
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

  const hasDetailedFinancial = hasDetailedSection(report, "الملخص المالي التنفيذي");
  if (report.reportType === "financial" && report.financial && !hasDetailedFinancial) {
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
    const bulletTone = (text: string, tone: VarianceTone) =>
      new Paragraph({
        alignment: AlignmentType.RIGHT,
        bidirectional: true,
        spacing: { after: 90 },
        bullet: { level: 0 },
        children: [new TextRun({ text, size: 24, color: varianceToneHex(tone) })],
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
    const varianceLegendSection =
      report.reportType === "financial" && report.financial
        ? [
            heading("دليل ألوان الانحراف المالي"),
            bulletTone("منخفض: الانحراف حتى 5%.", "good"),
            bulletTone("متوسط: الانحراف أكبر من 5% وحتى 15%.", "warn"),
            bulletTone("مرتفع: الانحراف أكبر من 15%.", "risk"),
          ]
        : [];
    const hasDetailedFinancial = hasDetailedSection(report, "الملخص المالي التنفيذي");
    const financialSection =
      report.reportType === "financial" && report.financial && !hasDetailedFinancial
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
              } (${varianceToneLabel(report.financial.kpis.variancePct)})`
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
    const detailedSections = (report.detailedSections ?? []).flatMap((section) => {
      const isFinancialSection = isFinancialDetailSection(section.title);
      const lines = section.lines.map((line) => {
        if (!isFinancialSection) return bullet(line);
        const tone = varianceToneFromLine(line);
        return tone ? bulletTone(line, tone) : bullet(line);
      });
      return [heading(section.title), ...lines];
    });

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
            ...detailedSections,
            ...varianceLegendSection,
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
    report.reportType === "financial" &&
    report.financial &&
    !hasDetailedSection(report, "الملخص المالي التنفيذي")
      ? `
      <section class="panel">
        <h2>ملخص مالي</h2>
        <p>إجمالي المخطط: ${Math.round(report.financial.kpis.plannedTotal)}</p>
        <p>إجمالي الالتزام: ${Math.round(report.financial.kpis.committedTotal)}</p>
        <p>المتاح: ${Math.round(report.financial.kpis.remainingAfterCommitment)}</p>
        <p>الانحراف:
          <span class="variance-badge tone-${varianceToneFromValue(report.financial.kpis.variancePct)}">${
          report.financial.kpis.variancePct === null ? "غير متاح" : `${report.financial.kpis.variancePct.toFixed(1)}%`
        } (${varianceToneLabel(report.financial.kpis.variancePct)})</span></p>
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
  const varianceLegend =
    report.reportType === "financial" && report.financial
      ? `
      <section class="panel">
        <h2>دليل ألوان الانحراف المالي</h2>
        <ul class="variance-legend-list">
          <li class="tone-good">منخفض: الانحراف حتى 5%.</li>
          <li class="tone-warn">متوسط: الانحراف أكبر من 5% وحتى 15%.</li>
          <li class="tone-risk">مرتفع: الانحراف أكبر من 15%.</li>
        </ul>
      </section>
    `
      : "";
  const detailedSections = (report.detailedSections ?? [])
    .map((section) => {
      const isFinancialSection = isFinancialDetailSection(section.title);
      const items = section.lines
        .map((line) => {
          if (!isFinancialSection) {
            return `<li>${escapeHtml(line)}</li>`;
          }
          const tone = varianceToneFromLine(line);
          return `<li${tone ? ` class="tone-${tone}"` : ""}>${escapeHtml(line)}</li>`;
        })
        .join("");
      return `
      <section class="panel">
        <h2>${escapeHtml(section.title)}</h2>
        <ul>${items}</ul>
      </section>
    `;
    })
    .join("");

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
    .variance-legend-list li { font-weight: 700; }
    li.tone-good { color: #147d64; font-weight: 700; }
    li.tone-warn { color: #9a6700; font-weight: 700; }
    li.tone-risk { color: #b42318; font-weight: 700; }
    .variance-badge {
      display: inline-block;
      border-radius: 999px;
      padding: 1px 8px;
      margin-right: 6px;
      border: 1px solid #cbd5e1;
      font-weight: 700;
    }
    .variance-badge.tone-good { color: #147d64; border-color: #b7e4d4; background: #ecfaf4; }
    .variance-badge.tone-warn { color: #9a6700; border-color: #f3dfb0; background: #fffaeb; }
    .variance-badge.tone-risk { color: #b42318; border-color: #f5c6cb; background: #fef3f2; }
    .variance-badge.tone-neutral { color: #475467; border-color: #d1d5db; background: #f8fafc; }
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
  ${detailedSections}
  ${varianceLegend}

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
