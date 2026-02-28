"use client";

import Image from "next/image";
import { CSSProperties, useEffect, useMemo, useState } from "react";

type StageUI =
  | "welcome"
  | "init"
  | "round1"
  | "round2"
  | "dialogue"
  | "addition"
  | "done"
  | "advanced_scope"
  | "advanced_boq"
  | "advanced_plan";

type DeliveryTrack = "fast" | "advanced";

const SAUDI_RIYAL_FALLBACK = "ر.س";
const SAUDI_RIYAL_ICON_URL =
  "https://upload.wikimedia.org/wikipedia/commons/thumb/9/98/Saudi_Riyal_Symbol.svg/32px-Saudi_Riyal_Symbol.svg.png";

type AdvisorKey =
  | "financial_advisor"
  | "regulatory_advisor"
  | "operations_advisor"
  | "marketing_advisor"
  | "risk_advisor";

const ALL_ADVISOR_KEYS: AdvisorKey[] = [
  "financial_advisor",
  "regulatory_advisor",
  "operations_advisor",
  "marketing_advisor",
  "risk_advisor",
];

type VenueType = "منتجع" | "فندق" | "قاعة" | "مساحة عامة" | "غير محدد";

type Question = {
  id: string;
  advisor_key: AdvisorKey;
  advisor_name: string;
  question: string;
  intent: string;
};

type Answer = {
  id: string;
  advisor_key: AdvisorKey;
  advisor_name: string;
  question: string;
  answer: string;
};

type DialogueLine = { advisor: AdvisorKey; statement: string };

type AdvisorRecommendation = {
  recommendations: string[];
  strategic_warning: string;
};

type AnalysisData = {
  strategic_analysis?: {
    strengths?: string[];
    amplification_opportunities?: string[];
    gaps?: string[];
    risks?: string[];
    readiness_level?: string;
    top_3_upgrades?: string[];
  };
  executive_decision?: {
    decision?: string;
    reason_1?: string;
    reason_2?: string;
  };
  advisor_recommendations?: Partial<Record<AdvisorKey, AdvisorRecommendation>>;
  report_text?: string;
};

type APIError = { ok: false; error?: string };
type APISuccess<T> = { ok: true; data: T };
type APIResponse<T> = APISuccess<T> | APIError;

type UserRole =
  | "project_manager"
  | "operations_manager"
  | "finance_manager"
  | "viewer";

type PersistedState = {
  eventType?: string;
  mode?: string;
  venueType?: VenueType;
  startAt?: string;
  endAt?: string;
  budget?: string;
  project?: string;
  stage?: StageUI;
  round1Questions?: Question[];
  followupQuestions?: Question[];
  answers?: Answer[];
  dialogue?: DialogueLine[];
  openIssues?: string[];
  hasAddition?: "yes" | "no";
  userAddition?: string;
  analysis?: AnalysisData | null;
  reportText?: string;
  dialogueSignature?: string;
  analysisSignature?: string;
  advisorSelectionMode?: "all" | "custom";
  selectedAdvisors?: AdvisorKey[];
  initStep?: "session" | "project";
  deliveryTrack?: DeliveryTrack;
  commissioningDate?: string;
  projectStartDate?: string;
  scopeSite?: string;
  scopeTechnical?: string;
  scopeProgram?: string;
  scopeCeremony?: string;
  executionStrategy?: string;
  qualityStandards?: string;
  riskManagement?: string;
  responseSla?: string;
  closureRemovalHours?: string;
  boqItems?: BoqItem[];
  orgRoles?: OrgRole[];
  actionTrackerItems?: ActionTaskItem[];
  liveRiskItems?: LiveRiskItem[];
  baselineFreeze?: BaselineFreeze | null;
  changeRequests?: ChangeRequest[];
  managementBriefText?: string;
  fieldChecklistText?: string;
  userRole?: UserRole;
  advancedPlanText?: string;
  advancedApproved?: boolean;
  demoMode?: boolean;
};

type BoqItem = {
  id: string;
  category: string;
  item: string;
  spec: string;
  unit: string;
  qty: string;
  unitCost: string;
  unitSellPrice: string;
  targetMarginPct: string;
  source: "أصل داخلي" | "مورد";
  leadTimeDays: string;
  ownerRoleId: OrgRoleId | "";
  dependsOnBoqId: string;
  dependencyType: "FS";
};

type OrgRoleId =
  | "operations_manager"
  | "creative_director"
  | "finance_manager"
  | "marketing_manager"
  | "sponsorship_manager"
  | "visitor_experience_manager"
  | "program_director";

type OrgRole = {
  id: OrgRoleId;
  title: string;
  summary: string;
  responsibilities: string[];
  kpis: string[];
  enabled: boolean;
  assignee: string;
};

type OrgRoleDetailPanel = "tasks" | "kpis" | null;

type ActionTaskStatus = "لم تبدأ" | "جاري" | "مكتمل" | "متعثر";

type ActionTaskItem = {
  id: string;
  phase: "الإعداد" | "التنفيذ" | "المتابعة" | "الإقفال";
  stream: string;
  task: string;
  owner: string;
  dueDate: string;
  notes: string;
  status: ActionTaskStatus;
};

type RiskLevel = "منخفض" | "متوسط" | "مرتفع";
type RiskStatus = "مفتوح" | "قيد المعالجة" | "مغلق" | "مصعّد";
type RiskSeverity = "low" | "medium" | "high" | "critical";
type TimelineTone = "ok" | "warn" | "info" | "idle";

type LiveRiskItem = {
  id: string;
  title: string;
  probability: RiskLevel;
  impact: RiskLevel;
  owner: string;
  mitigation: string;
  reviewDate: string;
  status: RiskStatus;
};

type BaselineFreeze = {
  id: string;
  frozenAt: string;
  signature: string;
  note: string;
};

type ChangeRequestStatus = "مفتوح" | "معتمد" | "مرفوض";

type ChangeRequest = {
  id: string;
  baselineId: string;
  createdAt: string;
  title: string;
  reason: string;
  impactTime: string;
  impactCost: string;
  impactScope: string;
  requestedBy: string;
  status: ChangeRequestStatus;
};

type LoadingContext =
  | ""
  | "start_session"
  | "submit_round1"
  | "build_dialogue"
  | "run_analysis";

type RolePermissionFlags = {
  canEditSessionSetup: boolean;
  canEditProjectCore: boolean;
  canEditBudget: boolean;
  canEditAnswers: boolean;
  canRunAnalysisFlow: boolean;
  canEditAdvancedExecution: boolean;
  canEditGovernance: boolean;
  canApproveAdvancedPlan: boolean;
  canResetSession: boolean;
  canLoadDemo: boolean;
};

const UX_MESSAGES = {
  reanalysisRequired:
    "إذا عدّلت الإجابات أو الإضافة، اضغط «ابدأ التحليل» مرة أخرى لتحديث النتائج.",
  openedCurrentResults: "تم فتح النتائج الحالية بدون إعادة تحليل جديد.",
  reusedCurrentAnalysis: "لا توجد تغييرات جديدة؛ تم فتح النتائج الحالية.",
} as const;

const ROLE_PERMISSION_FIELDS: Array<keyof RolePermissionFlags> = [
  "canEditSessionSetup",
  "canEditProjectCore",
  "canEditBudget",
  "canEditAnswers",
  "canRunAnalysisFlow",
  "canEditAdvancedExecution",
  "canEditGovernance",
  "canApproveAdvancedPlan",
  "canResetSession",
  "canLoadDemo",
];

const ROLE_PERMISSION_LABELS: Record<keyof RolePermissionFlags, string> = {
  canEditSessionSetup: "إعداد الجلسة",
  canEditProjectCore: "بيانات المشروع",
  canEditBudget: "الميزانية",
  canEditAnswers: "الإجابات",
  canRunAnalysisFlow: "تشغيل التحليل",
  canEditAdvancedExecution: "تنفيذ المسار المتقدم",
  canEditGovernance: "الحوكمة",
  canApproveAdvancedPlan: "الاعتماد النهائي",
  canResetSession: "مسح الجلسة",
  canLoadDemo: "النموذج التجريبي",
};

function isVenueType(value: string): value is VenueType {
  return ["منتجع", "فندق", "قاعة", "مساحة عامة", "غير محدد"].includes(value);
}

function isStageUI(value: unknown): value is StageUI {
  return [
    "welcome",
    "init",
    "round1",
    "round2",
    "dialogue",
    "addition",
    "done",
    "advanced_scope",
    "advanced_boq",
    "advanced_plan",
  ].includes(String(value));
}

function riskLevelScore(level: RiskLevel) {
  if (level === "مرتفع") return 3;
  if (level === "متوسط") return 2;
  return 1;
}

function riskSeverityFromScore(score: number): RiskSeverity {
  if (score >= 9) return "critical";
  if (score >= 6) return "high";
  if (score >= 3) return "medium";
  return "low";
}

function riskSeverityLabel(severity: RiskSeverity) {
  switch (severity) {
    case "critical":
      return "حرج";
    case "high":
      return "عالي";
    case "medium":
      return "متوسط";
    default:
      return "منخفض";
  }
}

function userRoleLabel(role: UserRole) {
  switch (role) {
    case "project_manager":
      return "مدير مشروع";
    case "operations_manager":
      return "عمليات";
    case "finance_manager":
      return "مالي";
    case "viewer":
      return "مشاهد فقط";
    default:
      return role;
  }
}

function allowedRolesLabel(roles: UserRole[]) {
  return roles.map(userRoleLabel).join(" أو ");
}

function permissionHintText(scope: string, roles: UserRole[], currentRole: UserRole) {
  return `لا يمكنك ${scope} بدور ${userRoleLabel(currentRole)}. الصلاحية متاحة لـ ${allowedRolesLabel(
    roles
  )}.`;
}

function orgRoleDisplay(role: Pick<OrgRole, "title" | "assignee">) {
  const assignee = role.assignee.trim();
  return assignee ? `${role.title} (${assignee})` : role.title;
}

function boqRowLabel(row: Pick<BoqItem, "item" | "category">, index: number) {
  if (row.item.trim()) return row.item.trim();
  if (row.category.trim()) return `${row.category.trim()} — بند ${toArabicDigits(index + 1)}`;
  return `بند ${toArabicDigits(index + 1)}`;
}

function computeRolePermissions(role: UserRole): RolePermissionFlags {
  switch (role) {
    case "project_manager":
      return {
        canEditSessionSetup: true,
        canEditProjectCore: true,
        canEditBudget: true,
        canEditAnswers: true,
        canRunAnalysisFlow: true,
        canEditAdvancedExecution: true,
        canEditGovernance: true,
        canApproveAdvancedPlan: true,
        canResetSession: true,
        canLoadDemo: true,
      };
    case "operations_manager":
      return {
        canEditSessionSetup: true,
        canEditProjectCore: true,
        canEditBudget: false,
        canEditAnswers: true,
        canRunAnalysisFlow: true,
        canEditAdvancedExecution: true,
        canEditGovernance: false,
        canApproveAdvancedPlan: false,
        canResetSession: false,
        canLoadDemo: true,
      };
    case "finance_manager":
      return {
        canEditSessionSetup: false,
        canEditProjectCore: false,
        canEditBudget: true,
        canEditAnswers: false,
        canRunAnalysisFlow: false,
        canEditAdvancedExecution: false,
        canEditGovernance: true,
        canApproveAdvancedPlan: false,
        canResetSession: false,
        canLoadDemo: true,
      };
    case "viewer":
      return {
        canEditSessionSetup: false,
        canEditProjectCore: false,
        canEditBudget: false,
        canEditAnswers: false,
        canRunAnalysisFlow: false,
        canEditAdvancedExecution: false,
        canEditGovernance: false,
        canApproveAdvancedPlan: false,
        canResetSession: false,
        canLoadDemo: false,
      };
    default:
      return {
        canEditSessionSetup: false,
        canEditProjectCore: false,
        canEditBudget: false,
        canEditAnswers: false,
        canRunAnalysisFlow: false,
        canEditAdvancedExecution: false,
        canEditGovernance: false,
        canApproveAdvancedPlan: false,
        canResetSession: false,
        canLoadDemo: false,
      };
  }
}

const ROLE_PERMISSION_EXPECTED: Record<UserRole, RolePermissionFlags> = {
  project_manager: {
    canEditSessionSetup: true,
    canEditProjectCore: true,
    canEditBudget: true,
    canEditAnswers: true,
    canRunAnalysisFlow: true,
    canEditAdvancedExecution: true,
    canEditGovernance: true,
    canApproveAdvancedPlan: true,
    canResetSession: true,
    canLoadDemo: true,
  },
  operations_manager: {
    canEditSessionSetup: true,
    canEditProjectCore: true,
    canEditBudget: false,
    canEditAnswers: true,
    canRunAnalysisFlow: true,
    canEditAdvancedExecution: true,
    canEditGovernance: false,
    canApproveAdvancedPlan: false,
    canResetSession: false,
    canLoadDemo: true,
  },
  finance_manager: {
    canEditSessionSetup: false,
    canEditProjectCore: false,
    canEditBudget: true,
    canEditAnswers: false,
    canRunAnalysisFlow: false,
    canEditAdvancedExecution: false,
    canEditGovernance: true,
    canApproveAdvancedPlan: false,
    canResetSession: false,
    canLoadDemo: true,
  },
  viewer: {
    canEditSessionSetup: false,
    canEditProjectCore: false,
    canEditBudget: false,
    canEditAnswers: false,
    canRunAnalysisFlow: false,
    canEditAdvancedExecution: false,
    canEditGovernance: false,
    canApproveAdvancedPlan: false,
    canResetSession: false,
    canLoadDemo: false,
  },
};

function escapeHtml(text: string) {
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function advisorIcon(key: string) {
  switch (key) {
    case "financial_advisor":
      return "💰";
    case "regulatory_advisor":
      return "📜";
    case "operations_advisor":
      return "⚙️";
    case "marketing_advisor":
      return "📣";
    case "risk_advisor":
      return "⚠️";
    default:
      return "•";
  }
}

// الاسم فقط (بدون عائلة)
function advisorName(key: string) {
  switch (key) {
    case "financial_advisor":
      return "فهد";
    case "regulatory_advisor":
      return "ليان";
    case "operations_advisor":
      return "خالد";
    case "marketing_advisor":
      return "نورة";
    case "risk_advisor":
      return "راشد";
    default:
      return key;
  }
}

// اسم + دور (بدون عائلة)
function advisorTitle(key: string) {
  switch (key) {
    case "financial_advisor":
      return "فهد — مالي وتسعير";
    case "regulatory_advisor":
      return "ليان — تنظيم وحوكمة";
    case "operations_advisor":
      return "خالد — تشغيل وتنفيذ";
    case "marketing_advisor":
      return "نورة — تسويق وقيمة";
    case "risk_advisor":
      return "راشد — مخاطر واستراتيجية";
    default:
      return key;
  }
}

function advisorRoleShort(key: string) {
  switch (key) {
    case "financial_advisor":
      return "مالي";
    case "regulatory_advisor":
      return "تنظيمي";
    case "operations_advisor":
      return "تشغيلي";
    case "marketing_advisor":
      return "تسويق";
    case "risk_advisor":
      return "مخاطر";
    default:
      return key;
  }
}

function advisorColor(key: string) {
  switch (key) {
    case "financial_advisor":
      return "#00E5FF";
    case "regulatory_advisor":
      return "#B66BFF";
    case "operations_advisor":
      return "#00FF85";
    case "marketing_advisor":
      return "#FF4FD8";
    case "risk_advisor":
      return "#FFC24D";
    default:
      return "rgba(255,255,255,0.9)";
  }
}

function decisionAccent(decision?: string) {
  switch (decision) {
    case "جاهز للتنفيذ":
      return "#00E5FF";
    case "جاهز بعد تحسينات محددة":
      return "#00FF85";
    case "يحتاج إعادة ضبط استراتيجية":
      return "#FFC24D";
    case "يحتاج إعادة دراسة شاملة":
      return "#FF4FD8";
    default:
      return "#B66BFF";
  }
}

function readinessAccent(level?: string) {
  switch (level) {
    case "جاهز":
      return "#00FF85";
    case "متقدم":
      return "#00E5FF";
    case "متوسط":
      return "#FF9D4D";
    case "مبدئي":
      return "#FF4FD8";
    default:
      return "#B66BFF";
  }
}

const ARABIC_INDIC_DIGITS = "٠١٢٣٤٥٦٧٨٩";

function normalizeDigitsToEnglish(value: string) {
  return value.replace(/[٠-٩]/g, (d) => String(ARABIC_INDIC_DIGITS.indexOf(d)));
}

function toArabicDigits(value: number | string) {
  // Backward-compatible name: normalize any Arabic-Indic digits to English digits.
  return normalizeDigitsToEnglish(String(value));
}

function parseNumericInput(value: string) {
  if (!value.trim()) return 0;
  const normalizedDigits = normalizeDigitsToEnglish(value).replace(/[^\d.-]/g, "");
  const n = Number.parseFloat(normalizedDigits);
  return Number.isFinite(n) ? n : 0;
}

function formatMoney(value: number) {
  const valueWithoutUnit = formatMoneyWithoutUnit(value);
  return `${valueWithoutUnit} ${SAUDI_RIYAL_FALLBACK}`;
}

function formatMoneyWithoutUnit(value: number) {
  const abs = Math.abs(value);
  const formatted = abs.toLocaleString("en-US", {
    minimumFractionDigits: abs % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  });
  return `${value < 0 ? "-" : ""}${formatted}`;
}

function suggestedSellFromMargin(unitCost: number, targetMarginPct: number) {
  if (!Number.isFinite(unitCost) || unitCost <= 0) return null;
  if (!Number.isFinite(targetMarginPct) || targetMarginPct < 0) return null;
  return unitCost * (1 + targetMarginPct / 100);
}

function marginPctFromCostAndSell(unitCost: number, unitSellPrice: number) {
  if (!Number.isFinite(unitCost) || unitCost <= 0) return null;
  if (!Number.isFinite(unitSellPrice)) return null;
  return ((unitSellPrice - unitCost) / unitCost) * 100;
}

function formatNumericForInput(value: number) {
  if (!Number.isFinite(value)) return "";
  const rounded = Math.round(value * 100) / 100;
  const fixed = rounded.toFixed(2);
  return fixed.replace(/\.00$/, "").replace(/(\.\d)0$/, "$1");
}

const STORAGE_KEY = "oms_dashboard_full_v1";
const DEFAULT_BOQ_ITEMS: BoqItem[] = [
  {
    id: "1",
    category: "الموقع والتجهيزات",
    item: "",
    spec: "",
    unit: "قطعة",
    qty: "",
    unitCost: "",
    unitSellPrice: "",
    targetMarginPct: "",
    source: "مورد",
    leadTimeDays: "",
    ownerRoleId: "",
    dependsOnBoqId: "",
    dependencyType: "FS",
  },
];

const ORG_ROLE_TEMPLATES: Omit<OrgRole, "enabled" | "assignee">[] = [
  {
    id: "operations_manager",
    title: "مدير العمليات",
    summary: "قيادة التنفيذ الميداني وضمان الجاهزية التشغيلية.",
    responsibilities: [
      "إعداد خطة التشغيل التفصيلية",
      "إدارة الموردين والمقاولين",
      "ضمان الالتزام بالجدول الزمني",
    ],
    kpis: ["الالتزام بالجدول", "صفر تعطل تشغيلي", "كفاءة إدارة الموردين"],
  },
  {
    id: "creative_director",
    title: "المدير الإبداعي",
    summary: "قيادة الرؤية البصرية والتجربة العامة للفعالية.",
    responsibilities: [
      "اعتماد المفهوم الإبداعي والهوية البصرية",
      "الإشراف على مخرجات الجرافيك و3D",
      "ضمان تطابق التنفيذ مع الرندر المعتمد",
    ],
    kpis: ["جودة المخرجات", "رضا العميل", "تطابق التنفيذ مع الاعتماد"],
  },
  {
    id: "finance_manager",
    title: "المدير المالي",
    summary: "ضبط الميزانية وحماية ربحية المشروع.",
    responsibilities: [
      "إعداد الميزانية التفصيلية",
      "متابعة المصروفات والانحرافات",
      "تقرير الأداء المالي",
    ],
    kpis: ["الالتزام بالميزانية", "هامش الربح", "دقة التقارير المالية"],
  },
  {
    id: "marketing_manager",
    title: "مدير التسويق والاتصال",
    summary: "إدارة الصورة الإعلامية وجذب الجمهور المستهدف.",
    responsibilities: [
      "إعداد الخطة التسويقية",
      "إدارة الحملات الرقمية والإعلام",
      "قياس الأداء التسويقي",
    ],
    kpis: ["عدد الحضور", "معدل التفاعل", "تكلفة الاكتساب"],
  },
  {
    id: "sponsorship_manager",
    title: "مدير الرعايات والشراكات",
    summary: "تعظيم الإيرادات عبر الرعاة والشركاء.",
    responsibilities: [
      "إعداد باقات الرعاية",
      "إغلاق عقود الرعاة",
      "إدارة حقوق الرعاية",
    ],
    kpis: ["قيمة الرعايات المغلقة", "نسبة تجديد الرعاة", "رضا الشركاء"],
  },
  {
    id: "visitor_experience_manager",
    title: "مدير تجربة الزائر",
    summary: "ضمان رحلة زائر سلسة من الدخول حتى الخروج.",
    responsibilities: [
      "تصميم رحلة الزائر",
      "إدارة التسجيل والاستقبال",
      "متابعة تجربة الحضور بعد الحدث",
    ],
    kpis: ["رضا الزوار", "سرعة الدخول", "انخفاض الشكاوى"],
  },
  {
    id: "program_director",
    title: "مدير البرنامج والمحتوى",
    summary: "إدارة جدول الجلسات والمحتوى أثناء التنفيذ.",
    responsibilities: [
      "إعداد جدول الجلسات",
      "إدارة المتحدثين وتوقيت الفقرات",
      "تنسيق المسرح أثناء الحدث",
    ],
    kpis: ["الالتزام بالوقت", "رضا المتحدثين", "تقييم المحتوى"],
  },
];

function hydrateOrgRoles(saved?: OrgRole[]) {
  const savedMap = new Map((saved || []).map((role) => [role.id, role]));
  return ORG_ROLE_TEMPLATES.map((template) => {
    const current = savedMap.get(template.id);
    return {
      ...template,
      enabled: current?.enabled ?? true,
      assignee: current?.assignee ?? "",
      responsibilities:
        current?.responsibilities?.length ? current.responsibilities : template.responsibilities,
      kpis: current?.kpis?.length ? current.kpis : template.kpis,
    };
  });
}

function normalizeBoqItems(saved?: BoqItem[]) {
  if (!saved?.length) return DEFAULT_BOQ_ITEMS;
  return saved.map<BoqItem>((row) => ({
    ...row,
    unitCost: row.unitCost ?? "",
    unitSellPrice: row.unitSellPrice ?? "",
    targetMarginPct: row.targetMarginPct ?? "",
    ownerRoleId: row.ownerRoleId ?? "",
    dependsOnBoqId: row.dependsOnBoqId ?? "",
    dependencyType: "FS",
  }));
}

export default function Home() {
  const [initialSaved] = useState<PersistedState>(() => {
    if (typeof window === "undefined") return {};
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return {};
      return JSON.parse(raw) as PersistedState;
    } catch {
      return {};
    }
  });

  // ============ Inputs ============
  const [eventType, setEventType] = useState(
    initialSaved.eventType ?? "فعالية موسمية"
  );
  const [mode, setMode] = useState(
    initialSaved.mode ?? "مراجعة تنفيذية سريعة"
  );
  const [userRole, setUserRole] = useState<UserRole>(
    initialSaved.userRole ?? "project_manager"
  );
  const [initStep, setInitStep] = useState<"session" | "project">(
    initialSaved.initStep ?? "session"
  );
  const [deliveryTrack, setDeliveryTrack] = useState<DeliveryTrack>(
    initialSaved.deliveryTrack ?? "fast"
  );
  const [advisorSelectionMode, setAdvisorSelectionMode] = useState<"all" | "custom">(
    initialSaved.advisorSelectionMode ?? "all"
  );
  const [selectedAdvisors, setSelectedAdvisors] = useState<AdvisorKey[]>(
    initialSaved.selectedAdvisors ?? []
  );
  const [venueType, setVenueType] = useState<VenueType>(
    initialSaved.venueType ?? "غير محدد"
  );

  const [startAt, setStartAt] = useState(initialSaved.startAt ?? "");
  const [endAt, setEndAt] = useState(initialSaved.endAt ?? "");
  const [budget, setBudget] = useState(initialSaved.budget ?? "");
  const [project, setProject] = useState(initialSaved.project ?? "");
  const [commissioningDate, setCommissioningDate] = useState(
    initialSaved.commissioningDate ?? ""
  );
  const [projectStartDate, setProjectStartDate] = useState(
    initialSaved.projectStartDate ?? ""
  );
  const [scopeSite, setScopeSite] = useState(initialSaved.scopeSite ?? "");
  const [scopeTechnical, setScopeTechnical] = useState(
    initialSaved.scopeTechnical ?? ""
  );
  const [scopeProgram, setScopeProgram] = useState(initialSaved.scopeProgram ?? "");
  const [scopeCeremony, setScopeCeremony] = useState(
    initialSaved.scopeCeremony ?? ""
  );
  const [executionStrategy, setExecutionStrategy] = useState(
    initialSaved.executionStrategy ?? ""
  );
  const [qualityStandards, setQualityStandards] = useState(
    initialSaved.qualityStandards ?? ""
  );
  const [riskManagement, setRiskManagement] = useState(
    initialSaved.riskManagement ?? ""
  );
  const [responseSla, setResponseSla] = useState(initialSaved.responseSla ?? "");
  const [closureRemovalHours, setClosureRemovalHours] = useState(
    initialSaved.closureRemovalHours ?? "6"
  );
  const [boqItems, setBoqItems] = useState<BoqItem[]>(
    normalizeBoqItems(initialSaved.boqItems)
  );
  const [orgRoles, setOrgRoles] = useState<OrgRole[]>(
    () => hydrateOrgRoles(initialSaved.orgRoles)
  );
  const [orgRoleDetailsOpen, setOrgRoleDetailsOpen] = useState<
    Record<OrgRoleId, OrgRoleDetailPanel>
  >({
    operations_manager: null,
    creative_director: null,
    finance_manager: null,
    marketing_manager: null,
    sponsorship_manager: null,
    visitor_experience_manager: null,
    program_director: null,
  });
  const [actionTrackerItems, setActionTrackerItems] = useState<ActionTaskItem[]>(
    initialSaved.actionTrackerItems ?? []
  );
  const [liveRiskItems, setLiveRiskItems] = useState<LiveRiskItem[]>(
    initialSaved.liveRiskItems ?? []
  );
  const [baselineFreeze, setBaselineFreeze] = useState<BaselineFreeze | null>(
    initialSaved.baselineFreeze ?? null
  );
  const [changeRequests, setChangeRequests] = useState<ChangeRequest[]>(
    initialSaved.changeRequests ?? []
  );
  const [crTitle, setCrTitle] = useState("");
  const [crReason, setCrReason] = useState("");
  const [crImpactTime, setCrImpactTime] = useState("منخفض");
  const [crImpactCost, setCrImpactCost] = useState("منخفض");
  const [crImpactScope, setCrImpactScope] = useState("منخفض");
  const [crRequestedBy, setCrRequestedBy] = useState("");
  const [managementBriefText, setManagementBriefText] = useState(
    initialSaved.managementBriefText ?? ""
  );
  const [fieldChecklistText, setFieldChecklistText] = useState(
    initialSaved.fieldChecklistText ?? ""
  );
  const [advancedPlanText, setAdvancedPlanText] = useState(
    initialSaved.advancedPlanText ?? ""
  );
  const [advancedApproved, setAdvancedApproved] = useState(
    initialSaved.advancedApproved ?? false
  );
  const [demoMode, setDemoMode] = useState(initialSaved.demoMode ?? false);

  // ============ Flow ============
  const [stage, setStage] = useState<StageUI>(() =>
    isStageUI(initialSaved.stage) ? initialSaved.stage : "welcome"
  );
  const [loading, setLoading] = useState(false);

  const [round1Questions, setRound1Questions] = useState<Question[]>(
    initialSaved.round1Questions ?? []
  );
  const [followupQuestions, setFollowupQuestions] = useState<Question[]>(
    initialSaved.followupQuestions ?? []
  );
  const [answers, setAnswers] = useState<Answer[]>(initialSaved.answers ?? []);

  const [dialogue, setDialogue] = useState<DialogueLine[]>(
    initialSaved.dialogue ?? []
  );
  const [dialogueSignature, setDialogueSignature] = useState(
    initialSaved.dialogueSignature ?? ""
  );
  const [openIssues, setOpenIssues] = useState<string[]>(
    initialSaved.openIssues ?? []
  );

  const [hasAddition, setHasAddition] = useState<"yes" | "no">(
    initialSaved.hasAddition ?? "no"
  );
  const [userAddition, setUserAddition] = useState(
    initialSaved.userAddition ?? ""
  );

  const [analysis, setAnalysis] = useState<AnalysisData | null>(
    initialSaved.analysis ?? null
  );
  const [analysisSignature, setAnalysisSignature] = useState(
    initialSaved.analysisSignature ?? ""
  );
  const [reportText, setReportText] = useState(initialSaved.reportText ?? "");
  const [uiError, setUiError] = useState("");
  const [uiSuccess, setUiSuccess] = useState("");
  const [roleQaReport, setRoleQaReport] = useState<{
    status: "idle" | "pass" | "fail";
    summary: string;
    lines: string[];
    ranAt: string;
  }>({ status: "idle", summary: "", lines: [], ranAt: "" });
  const [loadingContext, setLoadingContext] = useState<LoadingContext>("");
  const [needsReanalysisHint, setNeedsReanalysisHint] = useState(false);
  const [viewportWidth, setViewportWidth] = useState(() =>
    typeof window === "undefined" ? 1200 : window.innerWidth
  );
  const [advancedScopeStep, setAdvancedScopeStep] = useState<"scope" | "org">("scope");
  const [advancedBoqStep, setAdvancedBoqStep] = useState<
    "boq" | "quality_risk" | "operations"
  >("boq");
  const [useRiyalIcon, setUseRiyalIcon] = useState(true);

  const effectiveSelectedAdvisors =
    advisorSelectionMode === "all" ? ALL_ADVISOR_KEYS : selectedAdvisors;
  const activeOrgRoles = orgRoles.filter((role) => role.enabled);
  const currentRolePermissions = computeRolePermissions(userRole);
  const {
    canEditSessionSetup,
    canEditProjectCore,
    canEditBudget,
    canEditAnswers,
    canRunAnalysisFlow,
    canEditAdvancedExecution,
    canEditGovernance,
    canApproveAdvancedPlan,
    canResetSession,
    canLoadDemo,
  } = currentRolePermissions;
  const canEditBoqPricing = canEditAdvancedExecution || canEditBudget;
  const roleCapabilities = [
    { id: "session", label: "إعداد الجلسة", enabled: canEditSessionSetup },
    { id: "project", label: "بيانات المشروع", enabled: canEditProjectCore },
    { id: "budget", label: "الميزانية", enabled: canEditBudget },
    {
      id: "analysis",
      label: "الإجابات والتحليل",
      enabled: canEditAnswers && canRunAnalysisFlow,
    },
    { id: "pricing", label: "تسعير جدول الكميات", enabled: canEditBoqPricing },
    { id: "advanced_exec", label: "المسار المتقدم", enabled: canEditAdvancedExecution },
    { id: "governance", label: "الحوكمة", enabled: canEditGovernance },
    { id: "approval", label: "الاعتماد النهائي", enabled: canApproveAdvancedPlan },
  ] as const;
  const stagePermissionHints = useMemo(() => {
    const p = computeRolePermissions(userRole);
    const hints: string[] = [];

    if (stage === "init" && initStep === "session" && !p.canEditSessionSetup) {
      hints.push(
        permissionHintText("تعديل إعدادات الجلسة", ["project_manager", "operations_manager"], userRole)
      );
    }

    if (stage === "init" && initStep === "project") {
      if (!p.canEditProjectCore) {
        hints.push(
          permissionHintText(
            "تعديل بيانات المشروع الأساسية",
            ["project_manager", "operations_manager"],
            userRole
          )
        );
      }
      if (!p.canEditBudget) {
        hints.push(
          permissionHintText(
            "تعديل الميزانية",
            ["project_manager", "finance_manager"],
            userRole
          )
        );
      }
      if (!p.canRunAnalysisFlow) {
        hints.push(
          permissionHintText(
            "بدء الجلسة والتحليل",
            ["project_manager", "operations_manager"],
            userRole
          )
        );
      }
    }

    if ((stage === "round1" || stage === "round2" || stage === "addition") && !p.canEditAnswers) {
      hints.push(
        permissionHintText("تعديل إجابات الأسئلة", ["project_manager", "operations_manager"], userRole)
      );
    }
    if (
      (stage === "round1" || stage === "round2" || stage === "dialogue" || stage === "addition") &&
      !p.canRunAnalysisFlow
    ) {
      hints.push(
        permissionHintText("متابعة خطوات التحليل", ["project_manager", "operations_manager"], userRole)
      );
    }

    if (stage === "done") {
      if (!p.canEditAdvancedExecution && !p.canEditGovernance) {
        hints.push(
          permissionHintText(
            "الدخول للمسار المتقدم",
            ["project_manager", "operations_manager", "finance_manager"],
            userRole
          )
        );
      }
      if (!p.canRunAnalysisFlow) {
        hints.push(
          permissionHintText(
            "الرجوع لتعديل المدخلات وإعادة التحليل",
            ["project_manager", "operations_manager"],
            userRole
          )
        );
      }
    }

    if ((stage === "advanced_scope" || stage === "advanced_boq") && !p.canEditAdvancedExecution) {
      hints.push(
        permissionHintText(
          "تعديل بيانات التنفيذ المتقدم",
          ["project_manager", "operations_manager"],
          userRole
        )
      );
    }
    if (stage === "advanced_boq" && !p.canEditAdvancedExecution && p.canEditBudget) {
      hints.push("يمكنك في هذه المرحلة تعديل التسعير الداخلي (التكلفة/سعر البيع) فقط.");
    }

    if (stage === "advanced_plan") {
      if (!p.canEditAdvancedExecution) {
        hints.push(
          permissionHintText(
            "تعديل متابعة التنفيذ (Action Tracker)",
            ["project_manager", "operations_manager"],
            userRole
          )
        );
      }
      if (!p.canEditGovernance) {
        hints.push(
          permissionHintText(
            "تجميد النسخة وطلبات التغيير",
            ["project_manager", "finance_manager"],
            userRole
          )
        );
      }
      if (!p.canApproveAdvancedPlan) {
        hints.push(permissionHintText("الاعتماد النهائي للخطة", ["project_manager"], userRole));
      }
    }

    return hints;
  }, [stage, initStep, userRole]);
  const advancedGovernanceSignature = JSON.stringify({
    commissioningDate,
    projectStartDate,
    startAt,
    endAt,
    scopeSite,
    scopeTechnical,
    scopeProgram,
    scopeCeremony,
    executionStrategy,
    qualityStandards,
    riskManagement,
    responseSla,
    closureRemovalHours,
    boqItems,
    orgRoles,
    liveRiskItems,
    advancedPlanText,
    actionTrackerItems,
  });
  const hasFrozenBaseline = !!baselineFreeze;
  const hasChangesAfterFreeze = hasFrozenBaseline
    ? baselineFreeze.signature !== advancedGovernanceSignature
    : false;
  const openChangeRequests = changeRequests.filter((x) => x.status === "مفتوح").length;
  const approvedChangeRequests = changeRequests.filter((x) => x.status === "معتمد").length;
  const rejectedChangeRequests = changeRequests.filter((x) => x.status === "مرفوض").length;
  const documentRevisionNumber = hasFrozenBaseline ? approvedChangeRequests + 1 : 0;
  const documentRevisionLabel = `REV-${String(documentRevisionNumber).padStart(2, "0")}`;
  const actionTrackerStats = {
    total: actionTrackerItems.length,
    notStarted: actionTrackerItems.filter((item) => item.status === "لم تبدأ").length,
    inProgress: actionTrackerItems.filter((item) => item.status === "جاري").length,
    done: actionTrackerItems.filter((item) => item.status === "مكتمل").length,
    blocked: actionTrackerItems.filter((item) => item.status === "متعثر").length,
  };
  const actionTrackerProgress =
    actionTrackerStats.total === 0
      ? 0
      : Math.round((actionTrackerStats.done / actionTrackerStats.total) * 100);
  const todayDate = new Date().toISOString().slice(0, 10);
  const liveRiskStats = liveRiskItems.reduce(
    (acc, item) => {
      const score = riskLevelScore(item.probability) * riskLevelScore(item.impact);
      const isActive = item.status !== "مغلق";
      if (isActive) acc.active += 1;
      if (item.status === "مصعّد") acc.escalated += 1;
      if (item.status === "مغلق") acc.closed += 1;
      if (isActive && score >= 6) acc.critical += 1;
      if (isActive && item.reviewDate && item.reviewDate < todayDate) acc.overdue += 1;
      return acc;
    },
    { total: liveRiskItems.length, active: 0, critical: 0, escalated: 0, closed: 0, overdue: 0 }
  );
  const boqDependencyIssues = useMemo(() => {
    const issues: string[] = [];
    const rowMap = new Map(boqItems.map((row) => [row.id, row]));
    const rowIndexMap = new Map(boqItems.map((row, idx) => [row.id, idx]));

    boqItems.forEach((row, idx) => {
      if (!row.dependsOnBoqId) return;
      if (row.dependsOnBoqId === row.id) {
        issues.push(`البند ${boqRowLabel(row, idx)} لا يمكن أن يعتمد على نفسه.`);
        return;
      }
      const dependencyRow = rowMap.get(row.dependsOnBoqId);
      if (!dependencyRow) {
        issues.push(`تبعية غير موجودة في البند ${boqRowLabel(row, idx)}. اختر بندًا صالحًا.`);
        return;
      }
      if (!dependencyRow.item.trim()) {
        issues.push(
          `البند ${boqRowLabel(row, idx)} يعتمد على بند غير مكتمل. أكمل اسم البند المعتمد عليه.`
        );
      }
    });

    const visited = new Set<string>();
    const visiting = new Set<string>();
    const cycleKeys = new Set<string>();
    const dfs = (id: string, path: string[]) => {
      if (visiting.has(id)) {
        const startIdx = path.indexOf(id);
        const cycleIds = (startIdx >= 0 ? path.slice(startIdx) : path).concat(id);
        const cycleUniqueIds = Array.from(new Set(cycleIds));
        const cycleKey = [...cycleUniqueIds].sort().join("|");
        if (!cycleKeys.has(cycleKey)) {
          cycleKeys.add(cycleKey);
          const cycleLabel = cycleIds
            .map((cycleId) => {
              const row = rowMap.get(cycleId);
              const rowIdx = rowIndexMap.get(cycleId) ?? 0;
              return row ? boqRowLabel(row, rowIdx) : `بند ${toArabicDigits(rowIdx + 1)}`;
            })
            .join(" -> ");
          issues.push(`حلقة تبعية بين بنود جدول الكميات: ${cycleLabel}`);
        }
        return;
      }
      if (visited.has(id)) return;
      visiting.add(id);
      const depId = rowMap.get(id)?.dependsOnBoqId;
      if (depId && rowMap.has(depId)) {
        dfs(depId, [...path, id]);
      }
      visiting.delete(id);
      visited.add(id);
    };

    rowMap.forEach((_row, id) => dfs(id, []));
    return issues;
  }, [boqItems]);
  const hasBoqDependencyIssues = boqDependencyIssues.length > 0;
  const boqFinancialSummary = useMemo(() => {
    const rows = boqItems.map((row, idx) => {
      const qty = parseNumericInput(row.qty);
      const unitCost = parseNumericInput(row.unitCost);
      const manualUnitSellPrice = parseNumericInput(row.unitSellPrice);
      const hasTargetMargin = row.targetMarginPct.trim().length > 0;
      const targetMarginPct = hasTargetMargin ? parseNumericInput(row.targetMarginPct) : 0;
      const suggestedUnitSellPrice = hasTargetMargin
        ? suggestedSellFromMargin(unitCost, targetMarginPct)
        : null;
      const usesManualSellPrice = row.unitSellPrice.trim().length > 0;
      const unitSellPrice = usesManualSellPrice
        ? manualUnitSellPrice
        : (suggestedUnitSellPrice ?? 0);
      const totalCost = qty * unitCost;
      const totalSell = qty * unitSellPrice;
      const profit = totalSell - totalCost;
      const sellGapVsSuggested =
        usesManualSellPrice && suggestedUnitSellPrice !== null
          ? manualUnitSellPrice - suggestedUnitSellPrice
          : null;
      return {
        id: row.id,
        index: idx,
        label: boqRowLabel(row, idx),
        qty,
        unitCost,
        manualUnitSellPrice,
        targetMarginPct,
        suggestedUnitSellPrice,
        usesManualSellPrice,
        usesSuggestedSellPrice: !usesManualSellPrice && suggestedUnitSellPrice !== null,
        sellGapVsSuggested,
        unitSellPrice,
        totalCost,
        totalSell,
        profit,
      };
    });

    const totalCost = rows.reduce((sum, row) => sum + row.totalCost, 0);
    const totalSell = rows.reduce((sum, row) => sum + row.totalSell, 0);
    const profit = totalSell - totalCost;
    const margin = totalSell > 0 ? (profit / totalSell) * 100 : null;
    const markup = totalCost > 0 ? (profit / totalCost) * 100 : null;
    const status =
      Math.abs(profit) < 0.0001 ? "تعادل" : profit > 0 ? "رابح" : "خاسر";
    const breakEvenGap = totalSell - totalCost;
    const budgetValue = parseNumericInput(budget);
    const budgetVariance = budgetValue > 0 ? budgetValue - totalCost : null;
    const budgetUsagePercent =
      budgetValue > 0 ? Math.max(0, (totalCost / budgetValue) * 100) : null;

    return {
      rows,
      totalCost,
      totalSell,
      profit,
      margin,
      markup,
      status,
      breakEvenGap,
      budgetValue,
      budgetVariance,
      budgetUsagePercent,
    };
  }, [boqItems, budget]);
  const boqFinancialRowMap = useMemo(
    () => new Map(boqFinancialSummary.rows.map((row) => [row.id, row])),
    [boqFinancialSummary.rows]
  );

  const canMoveToProjectStep = effectiveSelectedAdvisors.length > 0;
  const isWelcome = stage === "welcome";
  const isSelectionStep = stage === "init" && initStep === "session";

  const canStart =
    project.trim().length > 0 && effectiveSelectedAdvisors.length > 0;
  const canBuildAdvancedPlan =
    commissioningDate.trim().length > 0 &&
    scopeSite.trim().length > 0 &&
    scopeTechnical.trim().length > 0 &&
    scopeProgram.trim().length > 0 &&
    executionStrategy.trim().length > 0 &&
    boqItems.some((row) => row.item.trim().length > 0) &&
    !hasBoqDependencyIssues;
  const advancedMissingFields: string[] = [];
  if (!commissioningDate.trim()) advancedMissingFields.push("تاريخ التعميد");
  if (!scopeSite.trim()) advancedMissingFields.push("نطاق الموقع والتجهيزات");
  if (!scopeTechnical.trim()) advancedMissingFields.push("نطاق التجهيزات الفنية");
  if (!scopeProgram.trim()) advancedMissingFields.push("نطاق البرنامج التنفيذي");
  if (!executionStrategy.trim()) advancedMissingFields.push("استراتيجية التنفيذ");
  if (!boqItems.some((row) => row.item.trim().length > 0)) {
    advancedMissingFields.push("بند واحد على الأقل في جدول الكميات (اسم البند)");
  }
  if (hasBoqDependencyIssues) {
    advancedMissingFields.push("معالجة تعارضات تبعيات جدول الكميات");
  }
  const advancedScopeChecklist = [
    { id: "scope_site", done: scopeSite.trim().length > 0 },
    { id: "scope_technical", done: scopeTechnical.trim().length > 0 },
    { id: "scope_program", done: scopeProgram.trim().length > 0 },
    { id: "scope_ceremony", done: scopeCeremony.trim().length > 0 },
    { id: "execution_strategy", done: executionStrategy.trim().length > 0 },
  ];
  const advancedScopeCompletedCount = advancedScopeChecklist.filter((item) => item.done).length;
  const advancedScopeTotalCount = advancedScopeChecklist.length;
  const advancedBoqFilledCount = boqItems.filter((row) => row.item.trim().length > 0).length;
  const advancedBoqTotalCount = boqItems.length;
  const advancedQualityRiskCompletedCount = [
    qualityStandards.trim().length > 0,
    riskManagement.trim().length > 0,
  ].filter(Boolean).length;
  const advancedQualityRiskTotalCount = 2;
  const advancedOpsCompletedCount = [
    responseSla.trim().length > 0,
    closureRemovalHours.trim().length > 0,
    liveRiskItems.length > 0,
  ].filter(Boolean).length;
  const advancedOpsTotalCount = 3;
  const isMobile = viewportWidth <= 768;
  const isNarrowMobile = viewportWidth <= 480;
  const advancedTimelineInfo = useMemo(() => {
    const oneDayMs = 1000 * 60 * 60 * 24;
    const toDate = (value: string) => {
      if (!value.trim()) return null;
      const d = new Date(value);
      return Number.isFinite(d.getTime()) ? d : null;
    };
    const commissioning = toDate(commissioningDate);
    const projectStart = toDate(projectStartDate);
    const eventStart = toDate(startAt);
    const eventEnd = toDate(endAt);
    const issues: string[] = [];

    if (commissioning && eventStart && commissioning.getTime() > eventStart.getTime()) {
      issues.push("تاريخ التعميد يجب أن يكون قبل بداية الفعالية.");
    }
    if (projectStart && commissioning && projectStart.getTime() < commissioning.getTime()) {
      issues.push("تاريخ بداية المشروع لا يمكن أن يكون قبل تاريخ التعميد.");
    }
    if (projectStart && eventStart && projectStart.getTime() > eventStart.getTime()) {
      issues.push("تاريخ بداية المشروع يجب أن يكون قبل بداية الفعالية.");
    }
    if (eventStart && eventEnd && eventEnd.getTime() <= eventStart.getTime()) {
      issues.push("وقت نهاية الفعالية يجب أن يكون بعد وقت البداية.");
    }

    const prepFromCommissioningDays =
      commissioning && eventStart
        ? Math.ceil((eventStart.getTime() - commissioning.getTime()) / oneDayMs)
        : null;
    const prepFromProjectStartDays =
      projectStart && eventStart
        ? Math.ceil((eventStart.getTime() - projectStart.getTime()) / oneDayMs)
        : null;
    const executionDays =
      eventStart && eventEnd
        ? Math.ceil((eventEnd.getTime() - eventStart.getTime()) / oneDayMs)
        : null;

    const dateStatus = {
      commissioning: {
        tone: commissioning ? "ok" : "warn",
        label: commissioning ? "محدد" : "مطلوب",
      } as { tone: TimelineTone; label: string },
      projectStart: {
        tone: !projectStart
          ? "info"
          : projectStart && commissioning && projectStart.getTime() < commissioning.getTime()
            ? "warn"
            : "ok",
        label: !projectStart
          ? "اختياري"
          : projectStart && commissioning && projectStart.getTime() < commissioning.getTime()
            ? "بحاجة مراجعة"
            : "محدد",
      } as { tone: TimelineTone; label: string },
      eventStart: {
        tone: !eventStart
          ? "warn"
          : commissioning && commissioning.getTime() > eventStart.getTime()
            ? "warn"
            : "ok",
        label: !eventStart
          ? "غير محدد"
          : commissioning && commissioning.getTime() > eventStart.getTime()
            ? "بحاجة مراجعة"
            : "محدد",
      } as { tone: TimelineTone; label: string },
      eventEnd: {
        tone: !eventEnd
          ? "warn"
          : eventStart && eventEnd.getTime() <= eventStart.getTime()
            ? "warn"
            : "ok",
        label: !eventEnd
          ? "غير محدد"
          : eventStart && eventEnd.getTime() <= eventStart.getTime()
            ? "بحاجة مراجعة"
            : "محدد",
      } as { tone: TimelineTone; label: string },
    };

    const prepFromCommissioning = !commissioning || !eventStart
      ? { label: "غير مكتمل", tone: "idle" as TimelineTone }
      : prepFromCommissioningDays !== null && prepFromCommissioningDays >= 0
        ? { label: `${toArabicDigits(prepFromCommissioningDays)} يوم`, tone: "ok" as TimelineTone }
        : { label: "غير صحيح", tone: "warn" as TimelineTone };

    const prepFromProjectStart = !projectStart || !eventStart
      ? { label: "اختياري", tone: "info" as TimelineTone }
      : prepFromProjectStartDays !== null && prepFromProjectStartDays >= 0
        ? { label: `${toArabicDigits(prepFromProjectStartDays)} يوم`, tone: "ok" as TimelineTone }
        : { label: "غير صحيح", tone: "warn" as TimelineTone };

    const executionDuration = !eventStart || !eventEnd
      ? { label: "غير مكتمل", tone: "idle" as TimelineTone }
      : executionDays !== null && executionDays > 0
        ? { label: `${toArabicDigits(executionDays)} يوم`, tone: "ok" as TimelineTone }
        : { label: "غير صحيح", tone: "warn" as TimelineTone };

    return {
      issues,
      dateStatus,
      prepFromCommissioning,
      prepFromProjectStart,
      executionDuration,
    };
  }, [commissioningDate, projectStartDate, startAt, endAt]);
  const advancedTimelineStatus = advancedTimelineInfo.issues.length > 0
    ? { tone: "working" as const, label: "بحاجة مراجعة" }
    : !commissioningDate.trim() || !startAt.trim() || !endAt.trim()
      ? { tone: "active" as const, label: "غير مكتمل" }
      : { tone: "ready" as const, label: "متماسك" };

  // ============ Save (no save while loading) ============
  useEffect(() => {
    if (loading) return;

    const snapshot = {
      eventType,
      mode,
      userRole,
      initStep,
      deliveryTrack,
      advisorSelectionMode,
      selectedAdvisors,
      venueType,
      startAt,
      endAt,
      budget,
      project,
      commissioningDate,
      projectStartDate,
      scopeSite,
      scopeTechnical,
      scopeProgram,
      scopeCeremony,
      executionStrategy,
      qualityStandards,
      riskManagement,
      responseSla,
      closureRemovalHours,
      boqItems,
      orgRoles,
      actionTrackerItems,
      liveRiskItems,
      baselineFreeze,
      changeRequests,
      managementBriefText,
      fieldChecklistText,
      advancedPlanText,
      advancedApproved,
      demoMode,
      stage,
      round1Questions,
      followupQuestions,
      answers,
      dialogue,
      dialogueSignature,
      openIssues,
      hasAddition,
      userAddition,
      analysis,
      analysisSignature,
      reportText,
    };

    localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
  }, [
    loading,
    eventType,
    mode,
    userRole,
    initStep,
    deliveryTrack,
    advisorSelectionMode,
    selectedAdvisors,
    venueType,
    startAt,
    endAt,
    budget,
    project,
    commissioningDate,
    projectStartDate,
    scopeSite,
    scopeTechnical,
    scopeProgram,
    scopeCeremony,
    executionStrategy,
    qualityStandards,
    riskManagement,
    responseSla,
    closureRemovalHours,
    boqItems,
    orgRoles,
    actionTrackerItems,
    liveRiskItems,
    baselineFreeze,
    changeRequests,
    managementBriefText,
    fieldChecklistText,
    advancedPlanText,
    advancedApproved,
    demoMode,
    stage,
    round1Questions,
    followupQuestions,
    answers,
    dialogue,
    dialogueSignature,
    openIssues,
    hasAddition,
    userAddition,
    analysis,
    analysisSignature,
    reportText,
  ]);

  useEffect(() => {
    function onResize() {
      setViewportWidth(window.innerWidth);
    }

    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    window.scrollTo({
      top: 0,
      behavior: prefersReducedMotion ? "auto" : "smooth",
    });
  }, [stage, initStep, advancedScopeStep, advancedBoqStep]);

  // إخفاء الرسائل تلقائيًا بعد مدة قصيرة
  useEffect(() => {
    if (!uiError && !uiSuccess) return;

    const timeoutMs = uiError ? 4500 : 3000;
    const t = setTimeout(() => {
      setUiError("");
      setUiSuccess("");
    }, timeoutMs);

    return () => clearTimeout(t);
  }, [uiError, uiSuccess]);

  function clearSession() {
    localStorage.removeItem(STORAGE_KEY);
    location.reload();
  }

  async function callAPI<T>(payload: unknown): Promise<APIResponse<T>> {
    try {
      const res = await fetch("/api/strategy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = (await res.json()) as APIResponse<T>;
      if (!res.ok) {
        return { ok: false, error: "error" in json ? json.error : "فشل الطلب" };
      }

      return json;
    } catch {
      return { ok: false, error: "تعذر الاتصال بالخادم. تأكد من الشبكة وحاول مرة أخرى." };
    }
  }

  function clearStatus() {
    setUiError("");
    setUiSuccess("");
  }

  function showError(message: string) {
    setUiSuccess("");
    setUiError(message);
  }

  function showSuccess(message: string) {
    setUiError("");
    setUiSuccess(message);
  }

  function runRolePermissionQACheck() {
    const roles: UserRole[] = [
      "project_manager",
      "operations_manager",
      "finance_manager",
      "viewer",
    ];
    const mismatches: string[] = [];
    const lines: string[] = [];

    roles.forEach((role) => {
      const actual = computeRolePermissions(role);
      const expected = ROLE_PERMISSION_EXPECTED[role];
      const roleDiffs = ROLE_PERMISSION_FIELDS.filter((field) => actual[field] !== expected[field]);

      if (roleDiffs.length === 0) {
        lines.push(`${userRoleLabel(role)}: مطابق`);
        return;
      }

      lines.push(`${userRoleLabel(role)}: ${toArabicDigits(roleDiffs.length)} تعارض`);
      roleDiffs.forEach((field) => {
        mismatches.push(
          `${userRoleLabel(role)} — ${ROLE_PERMISSION_LABELS[field]}: المتوقع ${
            expected[field] ? "مفعّل" : "غير مفعّل"
          }، الفعلي ${actual[field] ? "مفعّل" : "غير مفعّل"}`
        );
      });
    });

    const ranAt = new Date().toISOString();
    if (mismatches.length === 0) {
      setRoleQaReport({
        status: "pass",
        summary: `الفحص ناجح: ${toArabicDigits(roles.length)} أدوار بدون تعارض.`,
        lines,
        ranAt,
      });
      showSuccess("QA الصلاحيات: الفحص ناجح بدون تعارض.");
      return;
    }

    setRoleQaReport({
      status: "fail",
      summary: `يوجد ${toArabicDigits(mismatches.length)} تعارض في مصفوفة الصلاحيات.`,
      lines: mismatches,
      ranAt,
    });
    showError(`QA الصلاحيات: يوجد ${toArabicDigits(mismatches.length)} تعارض.`);
  }

  async function copyRoleQaReport() {
    if (roleQaReport.status === "idle") {
      showError("شغّل فحص الصلاحيات أولًا قبل نسخ التقرير.");
      return;
    }

    const lines = [
      "تقرير QA الصلاحيات",
      `النتيجة: ${roleQaReport.status === "pass" ? "ناجح" : "يوجد تعارض"}`,
      `الملخص: ${roleQaReport.summary}`,
      `وقت التشغيل: ${formatDateTimeLabel(roleQaReport.ranAt)}`,
      "",
      "التفاصيل:",
      ...roleQaReport.lines.map((line, idx) => `${toArabicDigits(idx + 1)}. ${line}`),
    ];

    await navigator.clipboard.writeText(lines.join("\n"));
    showSuccess("تم نسخ تقرير QA الصلاحيات.");
  }

  function startLoading(context: LoadingContext) {
    clearStatus();
    setLoadingContext(context);
    setLoading(true);
  }

  function stopLoading() {
    setLoading(false);
    setLoadingContext("");
  }

  function loadingLabel(context: LoadingContext) {
    switch (context) {
      case "start_session":
        return "جاري إعداد الجلسة...";
      case "submit_round1":
        return "جاري توليد التدقيق الإضافي...";
      case "build_dialogue":
        return "جاري توليد حوار المستشارين...";
      case "run_analysis":
        return "جاري التحليل وإعداد القرار...";
      default:
        return "جاري المعالجة...";
    }
  }

  function isProcessing(context?: LoadingContext) {
    if (!loading) return false;
    if (!context) return true;
    return loadingContext === context;
  }

  function actionLabel(normalLabel: string, context?: LoadingContext) {
    if (!loading) return normalLabel;
    if (!context) return loadingLabel("");
    return loadingContext === context ? loadingLabel(context) : normalLabel;
  }

  function commonPayload() {
    return {
      eventType,
      mode,
      selectedAdvisors: effectiveSelectedAdvisors,
      venueType,
      startAt,
      endAt,
      budget: budget.trim() ? budget : "",
      project,
    };
  }

  function toggleAdvisorSelection(key: AdvisorKey) {
    setSelectedAdvisors((prev) => {
      if (prev.includes(key)) {
        return prev.filter((x) => x !== key);
      }
      return [...prev, key];
    });
  }

  function getDialogueSignature() {
    return JSON.stringify({
      ...commonPayload(),
      answers,
    });
  }

  function getAnalysisSignature() {
    return JSON.stringify({
      ...commonPayload(),
      answers,
      dialogue,
      userAddition: hasAddition === "yes" ? userAddition : "",
    });
  }

  function updateBoqItem(id: string, patch: Partial<BoqItem>) {
    const normalizedPatch: Partial<BoqItem> = { ...patch };
    const numericKeys: Array<
      "qty" | "unitCost" | "unitSellPrice" | "targetMarginPct" | "leadTimeDays"
    > = ["qty", "unitCost", "unitSellPrice", "targetMarginPct", "leadTimeDays"];
    numericKeys.forEach((key) => {
      const raw = normalizedPatch[key];
      if (typeof raw === "string") {
        normalizedPatch[key] = normalizeDigitsToEnglish(raw);
      }
    });

    setBoqItems((prev) =>
      prev.map((row) => (row.id === id ? { ...row, ...normalizedPatch } : row))
    );
  }

  function syncBoqTargetMarginFromManualSell(id: string) {
    setBoqItems((prev) =>
      prev.map((row) => {
        if (row.id !== id) return row;
        if (!row.unitSellPrice.trim()) return row;
        const unitCost = parseNumericInput(row.unitCost);
        const unitSellPrice = parseNumericInput(row.unitSellPrice);
        const marginPct = marginPctFromCostAndSell(unitCost, unitSellPrice);
        if (marginPct === null) return row;
        const normalizedMargin = formatNumericForInput(marginPct);
        if (row.targetMarginPct === normalizedMargin) return row;
        return {
          ...row,
          targetMarginPct: normalizedMargin,
        };
      })
    );
  }

  function renderRiyalSuffix() {
    if (!useRiyalIcon) return SAUDI_RIYAL_FALLBACK;
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={SAUDI_RIYAL_ICON_URL}
        alt=""
        aria-hidden="true"
        style={styles.riyalIcon}
        onError={() => setUseRiyalIcon(false)}
      />
    );
  }

  function renderMoneyValue(value: number) {
    return (
      <span style={styles.moneyInline}>
        <span>{formatMoneyWithoutUnit(value)}</span>
        <span style={styles.moneyInlineSuffix}>{renderRiyalSuffix()}</span>
      </span>
    );
  }

  function addBoqRow() {
    const nextId = String(Date.now());
    const defaultOwnerRoleId =
      orgRoles.find((role) => role.id === "operations_manager" && role.enabled)?.id ??
      activeOrgRoles[0]?.id ??
      "";
    setBoqItems((prev) => [
      ...prev,
      {
        id: nextId,
        category: "التجهيزات الفنية",
        item: "",
        spec: "",
        unit: "قطعة",
        qty: "",
        unitCost: "",
        unitSellPrice: "",
        targetMarginPct: "",
        source: "مورد",
        leadTimeDays: "",
        ownerRoleId: defaultOwnerRoleId,
        dependsOnBoqId: "",
        dependencyType: "FS",
      },
    ]);
  }

  function removeBoqRow(id: string) {
    setBoqItems((prev) => {
      if (prev.length <= 1) return prev;
      return prev.filter((row) => row.id !== id);
    });
  }

  function updateOrgRole(id: OrgRoleId, patch: Partial<OrgRole>) {
    setOrgRoles((prev) =>
      prev.map((role) => (role.id === id ? { ...role, ...patch } : role))
    );
  }

  function toggleOrgRoleDetail(id: OrgRoleId, panel: Exclude<OrgRoleDetailPanel, null>) {
    setOrgRoleDetailsOpen((prev) => ({
      ...prev,
      [id]: prev[id] === panel ? null : panel,
    }));
  }

  function updateActionTrackerItem(id: string, patch: Partial<ActionTaskItem>) {
    setActionTrackerItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, ...patch } : item))
    );
  }

  function updateLiveRiskItem(id: string, patch: Partial<LiveRiskItem>) {
    setLiveRiskItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, ...patch } : item))
    );
  }

  function addLiveRiskItem() {
    const defaultOwner =
      activeOrgRoles.find((role) => role.id === "operations_manager")?.title ??
      "مدير المخاطر";
    const defaultReview = startAt ? startAt.slice(0, 10) : "";
    setLiveRiskItems((prev) => {
      const nextIndex = prev.length + 1;
      const next: LiveRiskItem = {
        id: `risk-${nextIndex}`,
        title: "",
        probability: "متوسط",
        impact: "متوسط",
        owner: defaultOwner,
        mitigation: "",
        reviewDate: defaultReview,
        status: "مفتوح",
      };
      return [...prev, next];
    });
  }

  function removeLiveRiskItem(id: string) {
    setLiveRiskItems((prev) => prev.filter((item) => item.id !== id));
  }

  function generateLiveRisksFromText() {
    const seeds = riskManagement
      .split(/\n|[؛.!؟]/)
      .map((line) => line.trim())
      .filter((line) => line.length >= 8)
      .slice(0, 8);

    if (seeds.length === 0) {
      showError("اكتب مخاطر في حقل إدارة المخاطر أولًا لتوليد لوحة المخاطر.");
      return;
    }

    const defaultOwner =
      activeOrgRoles.find((role) => role.id === "operations_manager")?.title ??
      "مدير المخاطر";
    const defaultReview = startAt ? startAt.slice(0, 10) : "";
    const existingTitles = new Set(liveRiskItems.map((risk) => risk.title.trim()));
    const baseIndex = liveRiskItems.length + 1;

    const generated: LiveRiskItem[] = seeds
      .filter((title) => !existingTitles.has(title))
      .map((title, idx) => ({
        id: `risk-${baseIndex + idx}`,
        title,
        probability: /تعطل|تأخر|خلل|ازدحام|غياب|تعارض|مخاطر/i.test(title)
          ? "مرتفع"
          : "متوسط",
        impact: /حرج|تعطل|تأخر|ازدحام|خلل/i.test(title) ? "مرتفع" : "متوسط",
        owner: defaultOwner,
        mitigation: "",
        reviewDate: defaultReview,
        status: "مفتوح",
      }));

    if (generated.length === 0) {
      showSuccess("لوحة المخاطر الحالية تحتوي بالفعل على نفس البنود.");
      return;
    }

    setLiveRiskItems((prev) => [...prev, ...generated]);
    showSuccess("تم توليد بنود مخاطر أولية من النص بنجاح.");
  }

  function formatDateTimeLabel(iso: string) {
    const d = new Date(iso);
    if (!Number.isFinite(d.getTime())) return "غير محدد";
    return d.toLocaleString("en-GB", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
  }

  function freezeCurrentBaseline() {
    if (!advancedPlanText.trim()) {
      showError("لا يمكن تجميد نسخة بدون توليد الخطة المتقدمة أولًا.");
      return;
    }

    const freezeId = `baseline-${Date.now()}`;
    setBaselineFreeze({
      id: freezeId,
      frozenAt: new Date().toISOString(),
      signature: advancedGovernanceSignature,
      note: advancedApproved ? "نسخة معتمدة" : "نسخة مجمّدة قبل الاعتماد النهائي",
    });
    showSuccess("تم تجميد النسخة الحالية بنجاح.");
  }

  function createChangeRequest() {
    if (!baselineFreeze) {
      showError("جمّد نسخة أولًا قبل إنشاء طلب تغيير.");
      return;
    }
    if (!crTitle.trim() || !crReason.trim()) {
      showError("اكتب عنوان طلب التغيير وسببه قبل الإضافة.");
      return;
    }

    const request: ChangeRequest = {
      id: `cr-${Date.now()}`,
      baselineId: baselineFreeze.id,
      createdAt: new Date().toISOString(),
      title: crTitle.trim(),
      reason: crReason.trim(),
      impactTime: crImpactTime,
      impactCost: crImpactCost,
      impactScope: crImpactScope,
      requestedBy: crRequestedBy.trim() || "غير محدد",
      status: "مفتوح",
    };

    setChangeRequests((prev) => [request, ...prev]);
    setCrTitle("");
    setCrReason("");
    setCrImpactTime("منخفض");
    setCrImpactCost("منخفض");
    setCrImpactScope("منخفض");
    setCrRequestedBy("");
    showSuccess("تم إنشاء طلب التغيير بنجاح.");
  }

  function updateChangeRequest(id: string, patch: Partial<ChangeRequest>) {
    setChangeRequests((prev) =>
      prev.map((request) => (request.id === id ? { ...request, ...patch } : request))
    );
  }

  function buildExecutionOutputPack(
    trackerItems: ActionTaskItem[] = actionTrackerItems,
    riskItems: LiveRiskItem[] = liveRiskItems
  ) {
    const generatedAt = formatDateTimeLabel(new Date().toISOString());
    const statusRank: Record<ActionTaskStatus, number> = {
      متعثر: 0,
      جاري: 1,
      "لم تبدأ": 2,
      مكتمل: 3,
    };
    const prioritizedOperationalItems = [...trackerItems]
      .sort((a, b) => {
        const byStatus = statusRank[a.status] - statusRank[b.status];
        if (byStatus !== 0) return byStatus;

        const aDue = a.dueDate || "9999-12-31";
        const bDue = b.dueDate || "9999-12-31";
        return aDue.localeCompare(bDue);
      })
      .slice(0, 8);
    const topRisks = [...riskItems]
      .sort(
        (a, b) =>
          riskLevelScore(b.probability) * riskLevelScore(b.impact) -
          riskLevelScore(a.probability) * riskLevelScore(a.impact)
      )
      .slice(0, 5);

    const managementBrief = [
      "ملخص تنفيذي للإدارة",
      "",
      `تاريخ التحديث: ${generatedAt}`,
      `رقم النسخة: ${documentRevisionLabel}`,
      `نوع المشروع: ${eventType}`,
      `الموقع: ${venueType}`,
      `بداية الفعالية: ${startAt || "غير محدد"}`,
      `نهاية الفعالية: ${endAt || "غير محدد"}`,
      `الميزانية: ${budget || "غير محدد"}`,
      `إجمالي تكلفة جدول الكميات: ${formatMoney(boqFinancialSummary.totalCost)}`,
      `إجمالي سعر البيع (جدول الكميات): ${formatMoney(boqFinancialSummary.totalSell)}`,
      `صافي الربح/الخسارة: ${formatMoney(boqFinancialSummary.profit)} (${boqFinancialSummary.status})`,
      `هامش الربح: ${
        boqFinancialSummary.margin === null
          ? "غير متاح"
          : `${toArabicDigits(boqFinancialSummary.margin.toFixed(1))}%`
      }`,
      "",
      "مؤشرات سريعة:",
      `- إنجاز التنفيذ: ${toArabicDigits(actionTrackerProgress)}%`,
      `- مهام مكتملة: ${toArabicDigits(actionTrackerStats.done)}/${toArabicDigits(actionTrackerStats.total)}`,
      `- مخاطر حرجة نشطة: ${toArabicDigits(liveRiskStats.critical)}`,
      `- مخاطر مصعّدة: ${toArabicDigits(liveRiskStats.escalated)}`,
      "",
      "أولوية العمل الحالية:",
      ...(prioritizedOperationalItems.length > 0
        ? prioritizedOperationalItems.map((item, idx) =>
            [
              `- ${toArabicDigits(idx + 1)}) ${item.task}`,
              `  الحالة: ${item.status} | المرحلة: ${item.phase}`,
              `  المسؤول: ${item.owner || "غير محدد"} | الاستحقاق: ${item.dueDate || "غير محدد"}`,
            ].join("\n")
          )
        : ["- لا توجد مهام تشغيلية في المتابعة حالياً."]),
      "",
      "أهم المخاطر:",
      ...(topRisks.length
        ? topRisks.map(
            (risk, idx) =>
              `- ${toArabicDigits(idx + 1)}) ${risk.title || "خطر بدون عنوان"} | ${risk.status} | المالك: ${
                risk.owner || "غير محدد"
              } | المعالجة: ${risk.mitigation || "غير محددة"}`
          )
        : ["- لا توجد مخاطر مدخلة في اللوحة الحية."]),
    ].join("\n");

    const fieldChecklist = [
      "نسخة تشغيل ميدانية (Checklist)",
      "",
      `تاريخ التحديث: ${generatedAt}`,
      `رقم النسخة: ${documentRevisionLabel}`,
      `الفعالية: ${eventType} | الموقع: ${venueType}`,
      "",
      "قبل بدء الفعالية:",
      "☐ تأكيد جاهزية الموقع والقاعات",
      "☐ اختبار الصوت/الإضاءة/الشاشات",
      "☐ مراجعة خطة المراسم والاستقبال",
      "☐ مراجعة خطة الطوارئ والتصعيد",
      "",
      "مهام التشغيل الفعلية:",
      ...trackerItems.map(
        (item, idx) =>
          `☐ ${toArabicDigits(idx + 1)}) [${item.phase}] ${item.task} | الحالة الحالية: ${
            item.status
          } | المسؤول: ${item.owner || "غير محدد"} | الموعد: ${item.dueDate || "غير محدد"}`
      ),
      "",
      "نقاط مخاطر يجب متابعتها:",
      ...(riskItems.length
        ? riskItems.map(
            (risk, idx) =>
              `☐ ${toArabicDigits(idx + 1)}) ${risk.title || "خطر بدون عنوان"} | ${risk.status} | مراجعة: ${
                risk.reviewDate || "غير محدد"
              }`
          )
        : ["☐ لا توجد مخاطر مضافة بعد."]),
      "",
      "الإقفال:",
      "☐ توثيق الملاحظات النهائية",
      "☐ استلام الموقع وإغلاق المحاضر",
      "☐ رفع تقرير ما بعد التنفيذ",
    ].join("\n");

    return { managementBrief, fieldChecklist };
  }

  function refreshExecutionOutputPack(
    trackerItems: ActionTaskItem[] = actionTrackerItems,
    riskItems: LiveRiskItem[] = liveRiskItems
  ) {
    const outputs = buildExecutionOutputPack(trackerItems, riskItems);
    setManagementBriefText(outputs.managementBrief);
    setFieldChecklistText(outputs.fieldChecklist);
    showSuccess("تم تحديث حزمة المخرجات التنفيذية.");
  }

  async function copyOutputText(text: string, successMessage: string) {
    if (!text.trim()) {
      showError("لا يوجد محتوى للنسخ بعد. اضغط تحديث حزمة المخرجات أولاً.");
      return;
    }
    await navigator.clipboard.writeText(text);
    showSuccess(successMessage);
  }

  function printOutputDocument(title: string, content: string) {
    if (!content.trim()) {
      showError("لا يوجد محتوى للطباعة بعد. اضغط تحديث حزمة المخرجات أولاً.");
      return;
    }
    const safeTitle = escapeHtml(title);
    const safeContent = escapeHtml(content);
    const safeProject = escapeHtml(project || "غير محدد");
    const safeEventType = escapeHtml(eventType || "غير محدد");
    const safeVenue = escapeHtml(venueType || "غير محدد");
    const safeStart = escapeHtml(startAt || "غير محدد");
    const safeEnd = escapeHtml(endAt || "غير محدد");
    const safeRevision = escapeHtml(documentRevisionLabel);
    const generatedAt = escapeHtml(formatDateTimeLabel(new Date().toISOString()));
    const stampText = !hasFrozenBaseline
      ? "DRAFT"
      : hasChangesAfterFreeze
        ? "CHANGED AFTER FREEZE"
        : "BASELINE FROZEN";
    const safeStamp = escapeHtml(stampText);
    const freezeMeta =
      hasFrozenBaseline && baselineFreeze
        ? escapeHtml(
            `Baseline: ${baselineFreeze.id} • ${formatDateTimeLabel(baselineFreeze.frozenAt)}`
          )
        : "Baseline: غير مجمّدة";
    const safeFreezeMeta = escapeHtml(freezeMeta);
    const printHtml = `
      <!doctype html>
      <html lang="ar" dir="rtl">
        <head>
          <meta charset="utf-8" />
          <title>${safeTitle}</title>
          <style>
            @page {
              size: A4;
              margin: 20mm 14mm 18mm;
            }
            body {
              font-family: Tahoma, Arial, sans-serif;
              color: #111;
              margin: 0;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
            .header {
              position: fixed;
              top: 0;
              left: 0;
              right: 0;
              border-bottom: 1px solid #d7dbe3;
              padding: 6mm 14mm 4mm;
              background: #fff;
            }
            .brand {
              font-size: 15px;
              font-weight: 800;
              color: #1a1f2b;
              margin: 0;
            }
            .sub {
              margin-top: 2px;
              font-size: 10.5px;
              color: #5f6b7c;
            }
            .meta {
              margin-top: 6px;
              font-size: 10.5px;
              color: #2f3747;
              line-height: 1.6;
            }
            .footer {
              position: fixed;
              bottom: 0;
              left: 0;
              right: 0;
              border-top: 1px solid #d7dbe3;
              padding: 3.5mm 14mm 0;
              font-size: 10px;
              color: #5f6b7c;
              background: #fff;
              display: flex;
              align-items: center;
              justify-content: space-between;
            }
            .page-num::after {
              content: counter(page);
            }
            .stamp {
              position: fixed;
              top: 42mm;
              left: 12mm;
              transform: rotate(-18deg);
              border: 1px solid #8a98ad;
              color: #6f7f95;
              font-size: 10px;
              font-weight: 800;
              letter-spacing: 0.7px;
              padding: 4px 10px;
              background: rgba(255,255,255,0.7);
            }
            main {
              padding: 43mm 14mm 20mm;
            }
            h1 {
              font-size: 18px;
              margin: 0 0 10px 0;
              color: #111827;
            }
            pre {
              white-space: pre-wrap;
              line-height: 1.8;
              font-size: 13px;
              margin: 0;
              color: #111827;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <p class="brand">One Minute Strategy</p>
            <div class="sub">Executive Decision Intelligence Platform</div>
            <div class="meta">
              ${safeTitle}<br />
              المشروع: ${safeProject} • النوع: ${safeEventType} • الموقع: ${safeVenue}<br />
              البداية: ${safeStart} • النهاية: ${safeEnd} • النسخة: ${safeRevision} • التوليد: ${generatedAt}<br />
              ${safeFreezeMeta}
            </div>
          </div>

          <div class="stamp">${safeStamp}</div>

          <main>
            <h1>${safeTitle}</h1>
            <pre>${safeContent}</pre>
          </main>

          <div class="footer">
            <div>One Minute Strategy • Internal Execution Copy</div>
            <div>صفحة <span class="page-num"></span></div>
          </div>
        </body>
      </html>
    `;
    try {
      const blob = new Blob([printHtml], {
        type: "text/html;charset=utf-8",
      });
      const url = URL.createObjectURL(blob);
      const printWindow = window.open(url, "_blank", "width=980,height=760");
      if (!printWindow) {
        URL.revokeObjectURL(url);
        showError("تعذر فتح نافذة الطباعة. تحقق من إعدادات المتصفح.");
        return;
      }
      printWindow.onload = () => {
        printWindow.focus();
        printWindow.print();
        setTimeout(() => URL.revokeObjectURL(url), 2000);
      };
    } catch {
      showError("تعذر تجهيز مستند الطباعة. حاول مرة أخرى.");
    }
  }

  function openAdvancedTrack() {
    if (!canEditAdvancedExecution && canEditGovernance) {
      setDeliveryTrack("advanced");
      setAdvancedBoqStep("boq");
      setStage(advancedPlanText.trim() ? "advanced_plan" : "advanced_boq");
      showSuccess("تم فتح المسار المتقدم بصلاحية الحوكمة.");
      return;
    }

    if (!commissioningDate.trim() && startAt) {
      setCommissioningDate(startAt.slice(0, 10));
    }
    if (!projectStartDate.trim()) {
      if (commissioningDate.trim()) {
        setProjectStartDate(commissioningDate);
      } else if (startAt) {
        setProjectStartDate(startAt.slice(0, 10));
      }
    }
    if (!scopeSite.trim()) {
      setScopeSite(`الموقع المستهدف: ${venueType} — ${project.slice(0, 120)}`);
    }
    if (!scopeTechnical.trim()) {
      setScopeTechnical("شاشات العرض، الصوت، الإضاءة، والدعم الفني الميداني.");
    }
    if (!scopeProgram.trim()) {
      setScopeProgram("تنفيذ السيناريو المعتمد، إدارة الفقرات، والتنسيق التشغيلي يوم الفعالية.");
    }
    if (!executionStrategy.trim()) {
      setExecutionStrategy(
        "التنفيذ على مراحل: اعتماد نهائي > تجهيز > تشغيل > متابعة > إقفال."
      );
    }
    if (!qualityStandards.trim()) {
      setQualityStandards(
        "فحص جاهزية الموقع، اختبار صوت وإضاءة، بروفة تشغيل، واعتماد ما قبل الافتتاح."
      );
    }
    if (!riskManagement.trim()) {
      setRiskManagement(
        "خطة بدائل للموردين، فريق فني احتياطي، ونقاط تصعيد واضحة أثناء التشغيل."
      );
    }
    if (!responseSla.trim()) {
      setResponseSla(
        "أعطال فنية حرجة: الاستجابة خلال 10 دقائق. ملاحظات تشغيلية: خلال 15 دقيقة."
      );
    }

    setDeliveryTrack("advanced");
    setAdvancedScopeStep("scope");
    setStage("advanced_scope");
    showSuccess("تم تفعيل المسار المتقدم. أكمل البيانات لبناء خطة تنفيذ تفصيلية.");
  }

  function buildAdvancedPlan() {
    const commissioning = commissioningDate ? new Date(commissioningDate) : null;
    const projectStart = projectStartDate ? new Date(projectStartDate) : null;
    const start = startAt ? new Date(startAt) : null;
    const end = endAt ? new Date(endAt) : null;

    const toFiniteDate = (d: Date | null) =>
      d && Number.isFinite(d.getTime()) ? d : null;
    const commissioningSafe = toFiniteDate(commissioning);
    const projectStartSafe = toFiniteDate(projectStart);
    const startSafe = toFiniteDate(start);
    const endSafe = toFiniteDate(end);

    const daysBetween = (from: Date, to: Date) =>
      Math.ceil((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24));
    const addDays = (date: Date, days: number) =>
      new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
    const addHours = (date: Date, hours: number) =>
      new Date(date.getTime() + hours * 60 * 60 * 1000);
    const parsePositiveInt = (value: string, fallback: number) => {
      const n = Number.parseInt(value, 10);
      return Number.isFinite(n) && n > 0 ? n : fallback;
    };

    const fmt = (date: Date | null, withTime = false) => {
      if (!date || !Number.isFinite(date.getTime())) return "غير محدد";
      const y = date.getFullYear();
      const m = String(date.getMonth() + 1).padStart(2, "0");
      const d = String(date.getDate()).padStart(2, "0");
      if (!withTime) return `${y}-${m}-${d}`;
      const hh = String(date.getHours()).padStart(2, "0");
      const mm = String(date.getMinutes()).padStart(2, "0");
      return `${y}-${m}-${d} ${hh}:${mm}`;
    };

    const removalHours = parsePositiveInt(closureRemovalHours, 6);
    const prepStart = commissioningSafe ?? (startSafe ? addDays(startSafe, -7) : null);
    const prepEnd = startSafe ? addDays(startSafe, -1) : null;
    const execStart = startSafe;
    const execEnd = endSafe;
    const closureStart = endSafe;
    const closureEnd = endSafe ? addHours(endSafe, removalHours) : null;

    const prepDays =
      prepStart && startSafe ? Math.max(0, daysBetween(prepStart, startSafe)) : null;
    const execDays =
      startSafe && endSafe ? Math.max(1, daysBetween(startSafe, endSafe)) : null;

    const prepDaysText = prepDays === null ? "غير محدد" : toArabicDigits(prepDays);
    const execDaysText = execDays === null ? "غير محدد" : toArabicDigits(execDays);
    const boqFilled = boqItems.filter((row) => row.item.trim().length > 0);
    const boqFilledMap = new Map(boqFilled.map((row) => [row.id, row]));
    const boqFilledIndexMap = new Map(boqFilled.map((row, idx) => [row.id, idx]));
    const boqTaskWindows = new Map<string, { start: Date | null; end: Date | null }>();
    const resolveBoqDependencyText = (row: BoqItem) => {
      if (!row.dependsOnBoqId) return "اعتماد البند والمواصفة";
      const depRow = boqFilledMap.get(row.dependsOnBoqId);
      if (!depRow) return "تبعية غير صالحة (راجع جدول الكميات)";
      const depIdx = boqFilledIndexMap.get(depRow.id) ?? 0;
      return `اكتمال بند في جدول الكميات: ${boqRowLabel(depRow, depIdx)} (${row.dependencyType})`;
    };
    const resolveBoqTaskWindow = (
      row: BoqItem,
      stack: Set<string> = new Set()
    ): { start: Date | null; end: Date | null } => {
      const cached = boqTaskWindows.get(row.id);
      if (cached) return cached;

      const leadDays = parsePositiveInt(row.leadTimeDays, 3);
      let start = prepStart;

      if (row.dependsOnBoqId && boqFilledMap.has(row.dependsOnBoqId) && row.dependsOnBoqId !== row.id) {
        if (!stack.has(row.id)) {
          stack.add(row.id);
          const depRow = boqFilledMap.get(row.dependsOnBoqId);
          if (depRow) {
            const depWindow = resolveBoqTaskWindow(depRow, stack);
            if (depWindow.end) {
              start = depWindow.end;
            }
          }
          stack.delete(row.id);
        }
      }

      const end = start ? addDays(start, leadDays) : null;
      const next = { start, end };
      boqTaskWindows.set(row.id, next);
      return next;
    };

    const boqSummary = boqFilled
      .map((row, idx) => {
        const assignedRole = row.ownerRoleId
          ? orgRoles.find((role) => role.id === row.ownerRoleId)
          : null;
        const financialRow = boqFinancialRowMap.get(row.id);
        const qtyNum = financialRow?.qty ?? parseNumericInput(row.qty);
        const lineCost = financialRow?.totalCost ?? qtyNum * parseNumericInput(row.unitCost);
        const lineSell = financialRow?.totalSell ?? qtyNum * parseNumericInput(row.unitSellPrice);
        const lineProfit = financialRow?.profit ?? lineSell - lineCost;
        const ownerSummary = assignedRole
          ? `${orgRoleDisplay(assignedRole)}${assignedRole.enabled ? "" : " (غير مفعّل)"}`
          : row.source === "أصل داخلي"
            ? "المستودع/العمليات"
            : "المشتريات";
        const dependencySummary = row.dependsOnBoqId
          ? resolveBoqDependencyText(row)
          : "لا يوجد";
        const pricingModeSummary = financialRow?.usesSuggestedSellPrice
          ? " (مقترح تلقائي)"
          : "";
        const targetMarginSummary = row.targetMarginPct.trim().length
          ? ` — هامش مستهدف: ${toArabicDigits(row.targetMarginPct.trim())}%`
          : "";
        return `${toArabicDigits(idx + 1)}. ${row.item} — ${row.qty || "؟"} ${row.unit} (${row.source}) — المسؤول: ${ownerSummary} — يعتمد على: ${dependencySummary} — التكلفة: ${formatMoney(lineCost)} — البيع${pricingModeSummary}: ${formatMoney(lineSell)} — الربح: ${formatMoney(lineProfit)}${targetMarginSummary}`;
      })
      .join("\n");

    const riskLines = riskManagement
      .split(/\n|[؛.!؟]/)
      .map((line) => line.trim())
      .filter((line) => line.length > 0)
      .slice(0, 6);

    const milestones = [
      { name: "تعميد المشروع", at: fmt(commissioningSafe) },
      { name: "بداية المشروع", at: fmt(projectStartSafe ?? commissioningSafe) },
      { name: "اعتماد النطاق والاستراتيجية", at: fmt(prepStart) },
      { name: "إغلاق المشتريات الحرجة", at: fmt(prepEnd) },
      { name: "بداية التنفيذ التشغيلي", at: fmt(execStart, true) },
      { name: "نهاية التنفيذ", at: fmt(execEnd, true) },
      { name: "إقفال وتسليم الموقع", at: fmt(closureEnd, true) },
    ];

    const roleProfile = (id: OrgRoleId) => orgRoles.find((role) => role.id === id);
    const isRoleEnabled = (id: OrgRoleId) => !!roleProfile(id)?.enabled;
    const roleOwner = (id: OrgRoleId, fallback: string) => {
      const role = roleProfile(id);
      if (!role || !role.enabled) return fallback;
      const assignee = role.assignee.trim();
      return assignee ? `${role.title} (${assignee})` : role.title;
    };
    const activeRoleLines = activeOrgRoles.map((role, idx) => {
      const lead = role.assignee.trim() ? `${role.title} — ${role.assignee.trim()}` : role.title;
      return `- ${toArabicDigits(idx + 1)}) ${lead} | KPIs: ${role.kpis.join("، ")}`;
    });

    type PlanTask = {
      phase: "الإعداد" | "التنفيذ" | "المتابعة" | "الإقفال";
      stream: string;
      task: string;
      owner: string;
      start: string;
      end: string;
      duration: string;
      dependsOn: string;
      acceptance: string;
      kpi: string;
    };

    const tasks: PlanTask[] = [
      {
        phase: "الإعداد",
        stream: "الحوكمة والتخطيط",
        task: "اعتماد نطاق العمل، الاستراتيجية، وخط الأساس الزمني",
        owner: roleOwner("operations_manager", "مدير المشروع"),
        start: fmt(prepStart),
        end: fmt(prepStart),
        duration: "يوم اعتماد",
        dependsOn: "تعميد المشروع",
        acceptance: "محضر اعتماد رسمي مع قائمة مخرجات معتمدة",
        kpi: "اعتماد %100 قبل أي توريد",
      },
      {
        phase: "الإعداد",
        stream: "التصاميم والاعتمادات",
        task: "إنهاء واعتماد مخططات 3D والجرافيك والهوية البصرية",
        owner: roleOwner("creative_director", "مدير الإبداع/التصميم"),
        start: fmt(prepStart),
        end: fmt(prepEnd),
        duration: prepDays === null ? "مرحلة الإعداد" : `${toArabicDigits(Math.max(1, Math.floor(prepDays * 0.5)))} يوم`,
        dependsOn: "اعتماد النطاق",
        acceptance: "اعتماد جميع التصاميم من العميل والبرنامج",
        kpi: "0 ملاحظات حرجة مفتوحة قبل التنفيذ",
      },
      {
        phase: "الإعداد",
        stream: "الموقع والتجهيزات",
        task: "حجز القاعات وتجهيز مناطق التشغيل وVIP والضيافة",
        owner: roleOwner("operations_manager", "قائد العمليات"),
        start: fmt(prepStart),
        end: fmt(prepEnd),
        duration: "حسب الجاهزية",
        dependsOn: "اعتماد الموقع",
        acceptance: "قائمة فحص جاهزية موقعة",
        kpi: "جاهزية موقع ≥ %95 قبل يوم التنفيذ",
      },
      {
        phase: "الإعداد",
        stream: "التجهيزات الفنية",
        task: "اختبار شامل للصوت والإضاءة والشاشات + بروفة تشغيل",
        owner: roleOwner("operations_manager", "مدير تقني"),
        start: fmt(prepStart),
        end: fmt(prepEnd),
        duration: "قبل الافتتاح",
        dependsOn: "تركيب كامل للمعدات",
        acceptance: "محضر اختبار فني ناجح بدون أعطال حرجة",
        kpi: "نسبة نجاح الاختبارات %100",
      },
      {
        phase: "التنفيذ",
        stream: "البرنامج التنفيذي",
        task: "تشغيل السيناريو وإدارة الفقرات وفق الجدول المعتمد",
        owner: roleOwner("program_director", "مدير التشغيل"),
        start: fmt(execStart, true),
        end: fmt(execEnd, true),
        duration: `${execDaysText} يوم`,
        dependsOn: "بروفة نهائية",
        acceptance: "التزام زمني للفقرات وعدم وجود تعارض تشغيلي",
        kpi: "انحراف الجدول ≤ 10 دقائق لكل فقرة",
      },
      {
        phase: "التنفيذ",
        stream: "المراسم والتوثيق",
        task: "تنفيذ خطة الاستقبال والإجلاس والتوثيق والبث",
        owner: roleOwner("visitor_experience_manager", "قائد المراسم والإعلام"),
        start: fmt(execStart, true),
        end: fmt(execEnd, true),
        duration: `${execDaysText} يوم`,
        dependsOn: "جاهزية فرق الاستقبال والتوثيق",
        acceptance: "تشغيل سلس وتوثيق كامل وفق المواصفات",
        kpi: "زمن إدخال الضيوف ضمن الخطة بدون تكدس",
      },
      {
        phase: "المتابعة",
        stream: "قيادة الميدان",
        task: "غرفة عمليات: متابعة حيّة، تسجيل الملاحظات، وقرارات التصعيد",
        owner: roleOwner("operations_manager", "مدير المشروع"),
        start: fmt(execStart, true),
        end: fmt(execEnd, true),
        duration: "طوال التنفيذ",
        dependsOn: "بدء التشغيل",
        acceptance: "سجل قرارات محدث وإغلاق الملاحظات الحرجة",
        kpi: "زمن تصعيد القرار ≤ 5 دقائق",
      },
      {
        phase: "المتابعة",
        stream: "الجودة والمخاطر",
        task: "مراجعة دورية للجودة، تحديث سجل المخاطر، وتفعيل البدائل",
        owner: roleOwner("operations_manager", "مدير الجودة والمخاطر"),
        start: fmt(execStart, true),
        end: fmt(execEnd, true),
        duration: "طوال التنفيذ",
        dependsOn: "بدء التشغيل",
        acceptance: "تقارير يومية وإغلاق الملاحظات الحرجة",
        kpi: "إغلاق %100 من المخاطر الحرجة ضمن SLA",
      },
      {
        phase: "الإقفال",
        stream: "الإزالة والتسليم",
        task: "فك التجهيزات وإعادة الموقع وتسليم الإغلاق",
        owner: roleOwner("operations_manager", "قائد الإقفال"),
        start: fmt(closureStart, true),
        end: fmt(closureEnd, true),
        duration: `${toArabicDigits(removalHours)} ساعة`,
        dependsOn: "نهاية التشغيل",
        acceptance: "محضر تسليم موقع نهائي بلا ملاحظات",
        kpi: "إقفال كامل ضمن المدة المعتمدة",
      },
    ];

    if (isRoleEnabled("finance_manager")) {
      tasks.push({
        phase: "المتابعة",
        stream: "الرقابة المالية",
        task: "متابعة الانحرافات المالية واعتماد المصروفات الحرجة أثناء التنفيذ",
        owner: roleOwner("finance_manager", "المدير المالي"),
        start: fmt(execStart, true),
        end: fmt(execEnd, true),
        duration: "طوال التنفيذ",
        dependsOn: "اعتماد الميزانية التفصيلية",
        acceptance: "تقرير انحراف مالي يومي مع قرارات تصحيحية",
        kpi: "الانحراف المالي ضمن الحد المعتمد",
      });
    }

    if (isRoleEnabled("marketing_manager")) {
      tasks.push({
        phase: "الإعداد",
        stream: "التسويق والاتصال",
        task: "تنفيذ خطة الحملة الإعلامية وجدولة المحتوى قبل وأثناء الفعالية",
        owner: roleOwner("marketing_manager", "مدير التسويق والاتصال"),
        start: fmt(prepStart),
        end: fmt(execEnd, true),
        duration: "الإعداد + التنفيذ",
        dependsOn: "اعتماد الرسائل والهوية",
        acceptance: "خطة محتوى معتمدة وتقارير أداء يوم التنفيذ",
        kpi: "تحقق مستهدف التفاعل والحضور",
      });
    }

    if (isRoleEnabled("sponsorship_manager")) {
      tasks.push({
        phase: "الإعداد",
        stream: "الرعايات والشراكات",
        task: "إغلاق عقود الرعاة وتثبيت حقوق الرعاية في المخطط التنفيذي",
        owner: roleOwner("sponsorship_manager", "مدير الرعايات والشراكات"),
        start: fmt(prepStart),
        end: fmt(prepEnd),
        duration: "قبل التنفيذ",
        dependsOn: "اعتماد باقات الرعاية",
        acceptance: "عقود موقعة وخارطة حقوق واضحة لكل راعٍ",
        kpi: "تحقيق مستهدف الرعايات المعتمد",
      });
    }

    if (isRoleEnabled("visitor_experience_manager")) {
      tasks.push({
        phase: "التنفيذ",
        stream: "تجربة الزائر",
        task: "إدارة رحلة الزائر والتسجيل والاستقبال ومعالجة الشكاوى الفورية",
        owner: roleOwner("visitor_experience_manager", "مدير تجربة الزائر"),
        start: fmt(execStart, true),
        end: fmt(execEnd, true),
        duration: `${execDaysText} يوم`,
        dependsOn: "جاهزية نقاط الدخول",
        acceptance: "تدفق دخول سلس ومستوى رضا مرتفع",
        kpi: "انخفاض الشكاوى وزمن دخول ضمن الهدف",
      });
    }

    boqFilled.forEach((row) => {
        const leadDays = parsePositiveInt(row.leadTimeDays, 3);
        const rowWindow = resolveBoqTaskWindow(row);
        const rowStart = rowWindow.start;
        const rowEnd = rowWindow.end;
        const stream = row.category.trim().length > 0 ? row.category : "توريد وتجهيز";
        let owner = row.source === "أصل داخلي" ? "المستودع/العمليات" : "المشتريات";
        if (row.ownerRoleId) {
          const assignedRole = roleProfile(row.ownerRoleId);
          if (assignedRole) {
            owner = assignedRole.enabled
              ? roleOwner(row.ownerRoleId, assignedRole.title)
              : `${orgRoleDisplay(assignedRole)} (غير مفعّل)`;
          }
        }

        tasks.push({
          phase: "الإعداد",
          stream,
          task: `توريد/تجهيز بند في جدول الكميات: ${row.item}`,
          owner,
          start: fmt(rowStart),
          end: fmt(rowEnd),
          duration: `${toArabicDigits(leadDays)} يوم`,
          dependsOn: resolveBoqDependencyText(row),
          acceptance: `استلام بند مطابق للمواصفة: ${row.spec || "وفق المتفق عليه"}`,
          kpi: `توريد ضمن المهلة (${toArabicDigits(leadDays)} يوم)`,
        });
      });

    const phaseOrder = ["الإعداد", "التنفيذ", "المتابعة", "الإقفال"];
    const tasksOrdered = [...tasks].sort(
      (a, b) => phaseOrder.indexOf(a.phase) - phaseOrder.indexOf(b.phase)
    );

    const controlRhythm = [
      "اجتماع تشغيل صباحي يومي (15 دقيقة): تحديد أولويات اليوم.",
      "اجتماع مواءمة قبل الفعالية: تأكيد الجاهزية الفنية والتشغيلية.",
      "تقرير نهاية يوم التنفيذ: حالة الجودة، المخاطر، والإجراءات التصحيحية.",
      "محضر إقفال خلال 24 ساعة: الدروس المستفادة وتوصيات التحسين.",
    ];

    const criticalPath = [
      "اعتماد النطاق والتصاميم",
      "توريد البنود الحرجة (LED/الصوت/الإضاءة)",
      "الاختبارات الفنية والبروفة النهائية",
      "بدء التنفيذ وفق السيناريو",
      "الإقفال والتسليم",
    ];

    const readinessGate = [
      "جاهزية الموقع معتمدة",
      "جاهزية فنية مجتازة",
      "جاهزية المراسم والتوثيق",
      "خطة بدائل حرجة جاهزة",
    ];

    const taskRows = tasksOrdered
      .map(
        (t, idx) =>
          `${toArabicDigits(idx + 1)} | ${t.phase} | ${t.stream} | ${t.task} | ${t.owner} | ${t.start} | ${t.end} | ${t.duration} | ${t.dependsOn} | ${t.acceptance} | ${t.kpi}`
      )
      .join("\n");
    const liveRiskLines = liveRiskItems.slice(0, 12).map((risk, idx) => {
      const score = riskLevelScore(risk.probability) * riskLevelScore(risk.impact);
      return `- ${toArabicDigits(idx + 1)}) ${risk.title || "خطر بدون عنوان"} | الحالة: ${risk.status} | المالك: ${risk.owner || "غير محدد"} | التقييم: ${toArabicDigits(score)}/9`;
    });

    const toDateInput = (value: string) =>
      /^\d{4}-\d{2}-\d{2}/.test(value) ? value.slice(0, 10) : "";
    const previousTrackerMap = new Map(actionTrackerItems.map((item) => [item.id, item]));
    const generatedTrackerItems: ActionTaskItem[] = tasksOrdered.map((t) => {
      const id = `${t.phase}|${t.stream}|${t.task}`;
      const prev = previousTrackerMap.get(id);
      return {
        id,
        phase: t.phase,
        stream: t.stream,
        task: t.task,
        owner: prev?.owner?.trim() ? prev.owner : t.owner,
        dueDate: prev?.dueDate ?? toDateInput(t.end),
        notes: prev?.notes ?? "",
        status: prev?.status ?? "لم تبدأ",
      };
    });

    const plan = [
      "خطة تنفيذ تشغيلية متكاملة (المسار المتقدم - تفصيلي)",
      "",
      "الأساس الزمني:",
      `- تاريخ التعميد: ${commissioningDate || "غير محدد"}`,
      `- تاريخ بداية المشروع: ${projectStartDate || commissioningDate || "غير محدد"}`,
      `- بداية الفعالية: ${startAt || "غير محدد"}`,
      `- نهاية الفعالية: ${endAt || "غير محدد"}`,
      `- مدة الإعداد التقديرية: ${prepDaysText} يوم`,
      `- مدة التنفيذ التقديرية: ${execDaysText} يوم`,
      `- مدة الإزالة/الإقفال: ${closureRemovalHours || "6"} ساعة`,
      "",
      "المعالم الرئيسية (Milestones):",
      ...milestones.map(
        (m, idx) => `- ${toArabicDigits(idx + 1)}) ${m.name}: ${m.at}`
      ),
      "",
      "مراحل التشغيل:",
      `- الإعداد: من ${fmt(prepStart)} إلى ${fmt(prepEnd)}`,
      `- التنفيذ: من ${fmt(execStart, true)} إلى ${fmt(execEnd, true)}`,
      `- المتابعة: متزامنة مع التنفيذ وتحديث يومي`,
      `- الإقفال: من ${fmt(closureStart, true)} إلى ${fmt(closureEnd, true)}`,
      "",
      "نطاق العمل المعتمد:",
      `- الموقع والتجهيزات: ${scopeSite || "- غير مدخل."}`,
      `- التجهيزات الفنية: ${scopeTechnical || "- غير مدخل."}`,
      `- البرنامج التنفيذي: ${scopeProgram || "- غير مدخل."}`,
      `- المراسم والتوثيق: ${scopeCeremony || "- غير مدخل."}`,
      "",
      "استراتيجية التنفيذ:",
      executionStrategy || "- غير مدخلة.",
      "",
      "الهيكل التشغيلي المعتمد:",
      ...(activeRoleLines.length > 0
        ? activeRoleLines
        : ["- لا توجد أدوار مفعلة. سيتم التعامل مع المهام عبر الهيكل الأساسي فقط."]),
      "",
      "ملخص جدول الكميات (مختصر):",
      boqSummary || "- لا توجد بنود مدخلة في جدول الكميات بعد.",
      "",
      "التحليل المالي الداخلي (جدول الكميات):",
      `- إجمالي التكلفة: ${formatMoney(boqFinancialSummary.totalCost)}`,
      `- إجمالي سعر البيع: ${formatMoney(boqFinancialSummary.totalSell)}`,
      `- صافي الربح/الخسارة: ${formatMoney(boqFinancialSummary.profit)} (${boqFinancialSummary.status})`,
      `- هامش الربح: ${
        boqFinancialSummary.margin === null
          ? "غير متاح"
          : `${toArabicDigits(boqFinancialSummary.margin.toFixed(1))}%`
      }`,
      `- نقطة التعادل: ${
        boqFinancialSummary.status === "تعادل"
          ? "تم تحقيق التعادل"
          : boqFinancialSummary.breakEvenGap >= 0
            ? `فوق التعادل بمقدار ${formatMoney(boqFinancialSummary.breakEvenGap)}`
            : `تحت التعادل بمقدار ${formatMoney(Math.abs(boqFinancialSummary.breakEvenGap))}`
      }`,
      `- مقارنة بالميزانية: ${
        boqFinancialSummary.budgetValue > 0
          ? `التكلفة ${
              boqFinancialSummary.totalCost <= boqFinancialSummary.budgetValue ? "ضمن" : "فوق"
            } الميزانية (${formatMoney(boqFinancialSummary.budgetValue)})`
          : "الميزانية غير معرفة"
      }`,
      "",
      "المسار الحرج (Critical Path):",
      ...criticalPath.map((item, idx) => `- ${toArabicDigits(idx + 1)}) ${item}`),
      "",
      "بوابات الجاهزية قبل التنفيذ:",
      ...readinessGate.map((item, idx) => `- ${toArabicDigits(idx + 1)}) ${item}`),
      "",
      "معايير الجودة:",
      qualityStandards || "- غير مدخلة.",
      "",
      "إدارة المخاطر:",
      riskManagement || "- غير مدخلة.",
      "",
      "لوحة المخاطر الحية:",
      ...(liveRiskLines.length > 0
        ? liveRiskLines
        : ["- لا توجد بنود في لوحة المخاطر الحية حتى الآن."]),
      "",
      "أبرز المخاطر من المدخلات:",
      ...(riskLines.length > 0
        ? riskLines.map((line, idx) => `- ${toArabicDigits(idx + 1)}) ${line}`)
        : ["- لا توجد مخاطر مدخلة بشكل تفصيلي حتى الآن."]),
      "",
      "سرعة الاستجابة (SLA):",
      responseSla || "- غير مدخلة.",
      "",
      "إيقاع المتابعة والتشغيل:",
      ...controlRhythm.map((item, idx) => `- ${toArabicDigits(idx + 1)}) ${item}`),
      "",
      "مصفوفة المهام التشغيلية:",
      "رقم | المرحلة | المسار | المهمة | المالك | البداية | النهاية | المدة | التبعية | معيار القبول | KPI",
      taskRows || "- لا توجد مهام جاهزة.",
      "",
      `إجمالي المهام التشغيليّة: ${toArabicDigits(tasksOrdered.length)} مهمة`,
      "ملاحظة حوكمة: أي تعديل لاحق على النطاق أو جدول الكميات أو المخاطر يتطلب إعادة توليد الخطة قبل الاعتماد النهائي.",
    ].join("\n");

    setActionTrackerItems(generatedTrackerItems);
    const outputs = buildExecutionOutputPack(generatedTrackerItems, liveRiskItems);
    setManagementBriefText(outputs.managementBrief);
    setFieldChecklistText(outputs.fieldChecklist);
    setAdvancedPlanText(plan);
    setStage("advanced_plan");
    showSuccess("تم توليد خطة التنفيذ المتقدمة بنجاح.");
  }

  function fillAdvancedTestData() {
    const defaultAdvancedDate = commissioningDate || (startAt ? startAt.slice(0, 10) : "2026-03-01");
    setCommissioningDate((prev) => prev || defaultAdvancedDate);
    setProjectStartDate((prev) => prev || defaultAdvancedDate);
    setScopeSite((prev) =>
      prev ||
      "حجز وتجهيز القاعة الرئيسية وقاعة كبار الشخصيات واعتماد الجاهزية قبل التنفيذ."
    );
    setScopeTechnical((prev) =>
      prev || "شاشة LED، أنظمة صوت، إضاءة فنية، وفريق دعم تقني بالموقع."
    );
    setScopeProgram((prev) =>
      prev || "تنفيذ السيناريو المعتمد وإدارة الفقرات والالتزام بجدول الحفل."
    );
    setScopeCeremony((prev) =>
      prev || "إدارة الاستقبال والإجلاس الرسمي والتوثيق الإعلامي والبث المباشر."
    );
    setExecutionStrategy((prev) =>
      prev || "تجهيز > اختبار > بروفة نهائية > تشغيل > متابعة > إقفال."
    );
    setQualityStandards((prev) =>
      prev || "فحص جودة القاعات، اختبار فني كامل، واعتماد تشغيلي قبل الافتتاح."
    );
    setRiskManagement((prev) =>
      prev || "سجل مخاطر يومي مع بدائل موردين وفريق تصعيد فوري."
    );
    setResponseSla((prev) => prev || "المشاكل الحرجة: خلال 10 دقائق. التشغيلية: خلال 15 دقيقة.");
    setClosureRemovalHours((prev) => prev || "6");

    setBoqItems((prev) => {
      const hasFilled = prev.some((row) => row.item.trim());
      if (hasFilled) return prev;
      return [
        {
          id: String(Date.now()),
          category: "التجهيزات الفنية",
          item: "شاشة LED رئيسية",
          spec: "دقة عالية مع تحكم كامل وتشغيل تجريبي قبل الحدث",
          unit: "قطعة",
          qty: "1",
          unitCost: "45000",
          unitSellPrice: "62000",
          targetMarginPct: "30",
          source: "مورد",
          leadTimeDays: "5",
          ownerRoleId: "operations_manager",
          dependsOnBoqId: "",
          dependencyType: "FS",
        },
      ];
    });

    const defaultLeads: Record<OrgRoleId, string> = {
      operations_manager: "خالد",
      creative_director: "نورة",
      finance_manager: "فهد",
      marketing_manager: "سارة",
      sponsorship_manager: "عبدالله",
      visitor_experience_manager: "ريم",
      program_director: "ليان",
    };
    setOrgRoles((prev) =>
      prev.map((role) => ({
        ...role,
        assignee: role.assignee.trim() || defaultLeads[role.id],
      }))
    );
    setLiveRiskItems((prev) => {
      if (prev.length > 0) return prev;
      return [
        {
          id: "risk-seed-1",
          title: "تأخر توريد الشاشة الرئيسية",
          probability: "مرتفع",
          impact: "مرتفع",
          owner: "مدير العمليات",
          mitigation: "تفعيل مورد بديل وتجهيز خطة استبدال فوري.",
          reviewDate: startAt ? startAt.slice(0, 10) : "",
          status: "مفتوح",
        },
      ];
    });

    showSuccess("تم تعبئة بيانات اختبار سريعة للمسار المتقدم.");
  }

  function fillFullTestModel() {
    const demoStart = "2026-03-20T18:00";
    const demoEnd = "2026-03-21T23:00";

    const demoRound1: Question[] = [
      {
        id: "Q1",
        advisor_key: "financial_advisor",
        advisor_name: "المستشار المالي – محلل الاستدامة",
        question: "ما توزيع الميزانية على البنود التشغيلية والتقنية؟",
        intent: "قياس كفاية الميزانية وتحديد بنود المخاطر المالية.",
      },
      {
        id: "Q2",
        advisor_key: "operations_advisor",
        advisor_name: "مستشار العمليات – التشغيل والتنفيذ",
        question: "ما خطة الجاهزية للموقع قبل يوم الفعالية؟",
        intent: "تأكيد التسلسل التشغيلي وضمان الجاهزية الميدانية.",
      },
    ];

    const demoFollowups: Question[] = [
      {
        id: "F1",
        advisor_key: "risk_advisor",
        advisor_name: "مستشار المخاطر والاستراتيجية – موازن القرار",
        question: "ما البدائل في حال تأخر تجهيز الشاشة أو الصوت؟",
        intent: "تقليل أثر التعثر وضمان استمرارية التشغيل.",
      },
    ];

    const demoAnswers: Answer[] = [
      {
        id: "Q1",
        advisor_key: "financial_advisor",
        advisor_name: "المستشار المالي – محلل الاستدامة",
        question: demoRound1[0].question,
        answer: "الميزانية الإجمالية 250 ألف، موزعة على التشغيل 40%، الفني 35%، التسويق 15%، احتياطي 10%.",
      },
      {
        id: "Q2",
        advisor_key: "operations_advisor",
        advisor_name: "مستشار العمليات – التشغيل والتنفيذ",
        question: demoRound1[1].question,
        answer: "الجاهزية على 3 مراحل: تجهيز، اختبار، بروفة نهائية قبل الافتتاح بـ 24 ساعة.",
      },
      {
        id: "F1",
        advisor_key: "risk_advisor",
        advisor_name: "مستشار المخاطر والاستراتيجية – موازن القرار",
        question: demoFollowups[0].question,
        answer: "تم تحديد مورد احتياطي وفريق فني بديل مع زمن استجابة لا يتجاوز 10 دقائق.",
      },
    ];

    const demoDialogue: DialogueLine[] = [
      {
        advisor: "financial_advisor",
        statement: "الميزانية مناسبة بشرط ضبط العقود الفنية مبكرًا وتقليل التغييرات المتأخرة.",
      },
      {
        advisor: "operations_advisor",
        statement: "أولوية التنفيذ هي الجاهزية الميدانية واختبارات التشغيل قبل يوم الحدث.",
      },
      {
        advisor: "risk_advisor",
        statement: "يوصى بتفعيل خطة تصعيد فوري للمخاطر الحرجة وربطها بمؤشرات SLA.",
      },
    ];

    const demoAnalysis: AnalysisData = {
      strategic_analysis: {
        strengths: [
          "وضوح نطاق العمل الأساسي وتوزيع مبدئي مناسب للميزانية.",
          "توفر خطة تشغيل مرحلية تشمل الاختبار والبروفة.",
        ],
        amplification_opportunities: [
          "تعزيز خطة التسويق الرقمي قبل الإطلاق بـ 14 يومًا.",
          "رفع جاهزية فريق المراسم من خلال سيناريوهات محاكاة.",
        ],
        gaps: ["تحتاج خطة الجودة إلى نقاط قياس أكثر تفصيلًا.", "توثيق بدائل الموردين يحتاج اعتماد نهائي."],
        risks: ["تأخر توريد بند فني حرج.", "تعارض جدول الفقرات يوم التنفيذ."],
        readiness_level: "متقدم",
        top_3_upgrades: [
          "اعتماد خطة طوارئ فنية مفصلة قبل 7 أيام.",
          "تثبيت نافذة تجميد للتغييرات قبل التنفيذ.",
          "تفعيل تقرير متابعة يومي قبل الحدث.",
        ],
      },
      executive_decision: {
        decision: "جاهز بعد تحسينات محددة",
        reason_1: "المشروع يمتلك أساسًا تشغيليًا قويًا مع فرص تحسين محددة وواضحة.",
        reason_2: "الفجوات الحالية قابلة للإغلاق سريعًا قبل موعد التنفيذ.",
      },
      advisor_recommendations: {
        financial_advisor: {
          recommendations: ["ضبط الالتزامات التعاقدية ضمن سقف الميزانية.", "تفعيل احتياطي طوارئ بنسبة 10%."],
          strategic_warning: "أي تغيير متأخر في البنود الفنية قد يضغط الميزانية.",
        },
        operations_advisor: {
          recommendations: ["اعتماد خطة جاهزية يومية.", "تنفيذ بروفة تشغيل كاملة."],
          strategic_warning: "تأخير الاختبارات النهائية يرفع مخاطر يوم الفعالية.",
        },
        risk_advisor: {
          recommendations: ["تفعيل مسار تصعيد فوري.", "تحديد ملاك مخاطر لكل بند حرج."],
          strategic_warning: "غياب خطة بدائل موثقة للموردين يمثل خطرًا تشغيليًا عاليًا.",
        },
      },
      report_text: "تقرير تجريبي: تم تحميل بيانات افتراضية كاملة للاختبار.",
    };

    const demoPlan = [
      "خطة تنفيذ متكاملة (نموذج تجريبي كامل)",
      "",
      "1) الإعداد: اعتماد النطاق والتصاميم وتجهيز الموردين.",
      "2) التنفيذ: تشغيل البرنامج وإدارة الفقرات والمراسم.",
      "3) المتابعة: مراقبة الجودة والمخاطر ورفع التقارير.",
      "4) الإقفال: إزالة التجهيزات وتسليم الموقع خلال 6 ساعات.",
    ].join("\n");

    setDeliveryTrack("advanced");
    setAdvisorSelectionMode("all");
    setSelectedAdvisors(ALL_ADVISOR_KEYS);
    setMode("تحليل معمّق");
    setInitStep("session");
    setEventType("مؤتمر احترافي مدفوع");
    setVenueType("فندق");
    setCommissioningDate("2026-03-10");
    setProjectStartDate("2026-03-11");
    setStartAt(demoStart);
    setEndAt(demoEnd);
    setBudget("250000");
    setProject("مشروع فعالية تنفيذية متكاملة مع مسارات تشغيل وتسويق وتوثيق.");

    setRound1Questions(demoRound1);
    setFollowupQuestions(demoFollowups);
    setAnswers(demoAnswers);
    setDialogue(demoDialogue);
    setDialogueSignature("demo_dialogue_signature_v1");
    setOpenIssues(["اعتماد نهائي لخطة الجودة", "تأكيد مورد احتياطي للشاشة"]);
    setHasAddition("yes");
    setUserAddition("تأكيد جاهزية فريق الاستقبال وتوسيع خطة الإعلام المباشر.");
    setAnalysis(demoAnalysis);
    setAnalysisSignature("demo_analysis_signature_v1");
    setReportText(demoAnalysis.report_text || "");

    setScopeSite("حجز وتجهيز القاعة الرئيسية وقاعة كبار الشخصيات واعتماد الجاهزية.");
    setScopeTechnical("شاشة LED، صوت، إضاءة، وفريق تقني متواجد طوال التشغيل.");
    setScopeProgram("تطبيق السيناريو المعتمد وإدارة فقرات الحفل وفق الجدول.");
    setScopeCeremony("تنظيم المراسم والتوثيق والبث المباشر والتغطية الإعلامية.");
    setExecutionStrategy("اعتماد > تجهيز > اختبار > بروفة > تشغيل > إقفال.");
    setQualityStandards("اختبارات جودة قبل التشغيل ونقاط فحص يومية أثناء التنفيذ.");
    setRiskManagement("سجل مخاطر تشغيلي مع بدائل للموردين وخطة تصعيد.");
    setResponseSla("الأعطال الحرجة خلال 10 دقائق، والملاحظات التشغيلية خلال 15 دقيقة.");
    setClosureRemovalHours("6");
    setDemoMode(true);
    setBoqItems([
      {
        id: "demo-1",
        category: "التجهيزات الفنية",
        item: "شاشة LED رئيسية",
        spec: "دقة عالية مع اختبار تجريبي كامل",
        unit: "قطعة",
        qty: "1",
        unitCost: "45000",
        unitSellPrice: "62000",
        targetMarginPct: "30",
        source: "مورد",
        leadTimeDays: "5",
        ownerRoleId: "operations_manager",
        dependsOnBoqId: "",
        dependencyType: "FS",
      },
      {
        id: "demo-2",
        category: "الموقع والتجهيزات",
        item: "تجهيز قاعة كبار الشخصيات",
        spec: "أثاث وضيافة وتجهيز بروتوكولي",
        unit: "باكدج",
        qty: "1",
        unitCost: "18000",
        unitSellPrice: "28500",
        targetMarginPct: "35",
        source: "أصل داخلي",
        leadTimeDays: "2",
        ownerRoleId: "visitor_experience_manager",
        dependsOnBoqId: "demo-1",
        dependencyType: "FS",
      },
    ]);
    const demoLeads: Record<OrgRoleId, string> = {
      operations_manager: "خالد",
      creative_director: "نورة",
      finance_manager: "فهد",
      marketing_manager: "سارة",
      sponsorship_manager: "عبدالله",
      visitor_experience_manager: "ريم",
      program_director: "ليان",
    };
    setOrgRoles(
      hydrateOrgRoles(
        ORG_ROLE_TEMPLATES.map((role) => ({
          ...role,
          enabled: true,
          assignee: demoLeads[role.id],
        }))
      )
    );
    setLiveRiskItems([
      {
        id: "risk-demo-1",
        title: "تأخر تجهيز الشاشة الرئيسية",
        probability: "مرتفع",
        impact: "مرتفع",
        owner: "مدير العمليات",
        mitigation: "تفعيل شاشة احتياطية ومورد بديل قبل 48 ساعة.",
        reviewDate: "2026-03-18",
        status: "قيد المعالجة",
      },
      {
        id: "risk-demo-2",
        title: "ازدحام عند بوابات الدخول",
        probability: "متوسط",
        impact: "مرتفع",
        owner: "مدير تجربة الزائر",
        mitigation: "زيادة مسارات الدخول وتوزيع فرق الاستقبال.",
        reviewDate: "2026-03-20",
        status: "مفتوح",
      },
    ]);
    setActionTrackerItems([]);
    setManagementBriefText("");
    setFieldChecklistText("");
    setBaselineFreeze(null);
    setChangeRequests([]);
    setCrTitle("");
    setCrReason("");
    setCrImpactTime("منخفض");
    setCrImpactCost("منخفض");
    setCrImpactScope("منخفض");
    setCrRequestedBy("");
    setAdvancedPlanText(demoPlan);
    setAdvancedApproved(false);
    setNeedsReanalysisHint(false);
    setLoading(false);
    setLoadingContext("");
    setStage("init");
    showSuccess(
      "تم تحميل نموذج تجريبي شامل لجميع المراحل. ابدأ الاختبار من الجولة الأولى ثم أكمل حتى المسار المتقدم."
    );
  }

  function hasInvalidTimeRange() {
    if (!startAt || !endAt) return false;
    return new Date(endAt).getTime() < new Date(startAt).getTime();
  }

  function progressPercent() {
    switch (stage) {
      case "welcome":
        return 0;
      case "init":
        return 14;
      case "round1":
        return 30;
      case "round2":
        return 45;
      case "dialogue":
        return 62;
      case "addition":
        return 76;
      case "done":
        return deliveryTrack === "advanced" ? 78 : 100;
      case "advanced_scope":
        return 86;
      case "advanced_boq":
        return 93;
      case "advanced_plan":
        return 100;
      default:
        return 14;
    }
  }

  function stageLabel() {
    switch (stage) {
      case "welcome":
        return "الانطلاق";
      case "init":
        return initStep === "session"
          ? "اختيار نوع الجلسة والمستشارين"
          : "تهيئة المشروع";
      case "round1":
        return "أسئلة الجولة الأولى";
      case "round2":
        return "تدقيق إضافي";
      case "dialogue":
        return "حوار المستشارين";
      case "addition":
        return "معلومة إضافية قبل التحليل";
      case "done":
        return "التحليل والقرار والتقرير";
      case "advanced_scope":
        return advancedScopeStep === "scope"
          ? "المسار المتقدم: نطاق واستراتيجية"
          : "المسار المتقدم: الهيكل التشغيلي";
      case "advanced_boq":
        if (advancedBoqStep === "boq") return "المسار المتقدم: جدول الكميات والتسعير";
        if (advancedBoqStep === "quality_risk") return "المسار المتقدم: الجودة والمخاطر";
        return "المسار المتقدم: التشغيل والجاهزية";
      case "advanced_plan":
        return "المسار المتقدم: خطة التنفيذ";
      default:
        return stage;
    }
  }

  function sessionSectionLead() {
    if (stage === "done") {
      return "أصبحت لديك الآن رؤية أوضح للمشروع، وهذه هي المخرجات التنفيذية النهائية لاتخاذ القرار.";
    }

    if (stage === "advanced_scope" || stage === "advanced_boq" || stage === "advanced_plan") {
      return "أنت في المسار المتقدم لبناء خطة تنفيذ متكاملة تعتمد على النطاق، جدول الكميات، والجودة والمخاطر.";
    }

    if (stage === "dialogue" || stage === "addition") {
      return "أنت الآن في مرحلة متقدمة من بناء القرار؛ راجع النقاط الحاسمة قبل اعتماد التوصيات النهائية.";
    }

    return "حوّل فكرتك إلى قرار مدروس عبر مراحل تحليل منهجية.";
  }

  function progressMetaText() {
    if (stage === "round1") {
      const ids = round1Questions.map((q) => q.id);
      const filled = answers.filter(
        (a) => ids.includes(a.id) && a.answer.trim().length > 0
      ).length;
      return `إجابات الجولة الأولى (${filled}/${ids.length})`;
    }

    if (stage === "round2") {
      const ids = followupQuestions.map((q) => q.id);
      const filled = answers.filter(
        (a) => ids.includes(a.id) && a.answer.trim().length > 0
      ).length;
      return `إجابات المتابعة (${filled}/${ids.length})`;
    }

    if (stage === "done") {
      return "مكتمل";
    }

    if (stage === "advanced_scope") {
      if (advancedScopeStep === "scope") {
        return `نطاق واستراتيجية (${toArabicDigits(advancedScopeCompletedCount)}/${toArabicDigits(advancedScopeTotalCount)})`;
      }
      return `الهيكل التشغيلي (${toArabicDigits(activeOrgRoles.length)}/${toArabicDigits(orgRoles.length)})`;
    }

    if (stage === "advanced_boq") {
      if (advancedBoqStep === "boq") {
        return `جدول الكميات والتسعير (${toArabicDigits(advancedBoqFilledCount)}/${toArabicDigits(advancedBoqTotalCount)})`;
      }
      if (advancedBoqStep === "quality_risk") {
        return `الجودة والمخاطر (${toArabicDigits(advancedQualityRiskCompletedCount)}/${toArabicDigits(advancedQualityRiskTotalCount)})`;
      }
      return `التشغيل والجاهزية (${toArabicDigits(advancedOpsCompletedCount)}/${toArabicDigits(advancedOpsTotalCount)})`;
    }

    if (stage === "advanced_plan") {
      return advancedApproved ? "تم اعتماد الخطة المتقدمة" : "الخطة جاهزة للمراجعة";
    }

    return "";
  }

  function stageStatusTone() {
    switch (stage) {
      case "done":
      case "advanced_plan":
        return "ready";
      case "advanced_scope":
      case "advanced_boq":
      case "dialogue":
      case "addition":
        return "active";
      case "round1":
      case "round2":
        return "working";
      default:
        return "idle";
    }
  }

  function stageStatusText() {
    switch (stage) {
      case "welcome":
        return "جاهز للانطلاق";
      case "done":
        return "النتائج جاهزة";
      case "advanced_scope":
        return advancedScopeStep === "scope"
          ? "تجهيز النطاق والاستراتيجية"
          : "تجهيز الهيكل التشغيلي";
      case "advanced_boq":
        if (advancedBoqStep === "boq") return "تجهيز جدول الكميات والتسعير";
        if (advancedBoqStep === "quality_risk") return "تجهيز الجودة والمخاطر";
        return "جاهزية التشغيل قبل توليد الخطة";
      case "advanced_plan":
        return advancedApproved ? "الخطة المعتمدة جاهزة" : "مراجعة الخطة المتقدمة";
      case "dialogue":
        return "مراجعة الحوار";
      case "addition":
        return "قبل التحليل النهائي";
      case "round1":
        return "جمع المعلومات الأساسية";
      case "round2":
        return "استكمال البيانات";
      default:
        return initStep === "session" ? "اختيار الإعدادات الأساسية" : "تهيئة الجلسة";
    }
  }

  function selectedAdvisorsSummary() {
    if (effectiveSelectedAdvisors.length === ALL_ADVISOR_KEYS.length) {
      return "كل المستشارين";
    }

    if (effectiveSelectedAdvisors.length === 0) {
      return "غير محدد";
    }

    return effectiveSelectedAdvisors
      .map((key) => `${advisorName(key)} (${advisorRoleShort(key)})`)
      .join("، ");
  }

  function sessionAlerts() {
    const alerts: Array<{ text: string; tone: "warn" | "info" | "ok" }> = [];
    const duration = eventDurationSummary();

    if (hasInvalidTimeRange()) {
      alerts.push({ text: "وقت النهاية أقدم من وقت البداية.", tone: "warn" });
    }
    if (!budget.trim()) {
      alerts.push({ text: "الميزانية غير محددة حتى الآن.", tone: "info" });
    }
    if (!startAt || !endAt) {
      alerts.push({ text: "الجدول الزمني غير مكتمل (بداية/نهاية).", tone: "info" });
    }
    if (duration && duration.isLongForPaidConference) {
      alerts.push({
        text: `مدة الفعالية (${duration.label}) طويلة نسبيًا لمؤتمر احترافي مدفوع وتحتاج تبريرًا تشغيليًا/تجاريًا.`,
        tone: "warn",
      });
    }
    if ((stage === "addition" || stage === "done") && answerQuality.level !== "جيد") {
      alerts.push({
        text:
          answerQuality.level === "ضعيف"
            ? "جودة الإجابات ضعيفة وقد تؤثر على دقة القرار."
            : "بعض الإجابات تحتاج تفصيل لرفع جودة التحليل.",
        tone: "warn",
      });
    }
    if (stage === "done" && (analysis?.strategic_analysis?.risks || []).length > 0) {
      alerts.push({
        text: `يوجد ${toArabicDigits((analysis?.strategic_analysis?.risks || []).length)} مخاطر بحاجة متابعة.`,
        tone: "warn",
      });
    }
    if (deliveryTrack === "advanced" && !commissioningDate) {
      alerts.push({
        text: "تاريخ التعميد غير محدد، وهذا يؤثر على دقة خطة التنفيذ.",
        tone: "info",
      });
    }
    if (deliveryTrack === "advanced" && projectStartDate && commissioningDate) {
      if (new Date(projectStartDate).getTime() < new Date(commissioningDate).getTime()) {
        alerts.push({
          text: "تاريخ بداية المشروع أقدم من تاريخ التعميد. راجع التسلسل الزمني.",
          tone: "warn",
        });
      }
    }
    if (deliveryTrack === "advanced" && projectStartDate && startAt) {
      if (new Date(projectStartDate).getTime() > new Date(startAt).getTime()) {
        alerts.push({
          text: "تاريخ بداية المشروع بعد بداية الفعالية، وهذا غير منطقي.",
          tone: "warn",
        });
      }
    }
    if (deliveryTrack === "advanced" && activeOrgRoles.length === 0) {
      alerts.push({
        text: "لا توجد أدوار تشغيلية مفعلة في المسار المتقدم.",
        tone: "warn",
      });
    }
    if (stage === "advanced_plan" && !advancedApproved) {
      alerts.push({
        text: "خطة التنفيذ المتقدمة تحتاج اعتماد نهائي قبل التجميد.",
        tone: "warn",
      });
    }
    if (hasFrozenBaseline && hasChangesAfterFreeze && openChangeRequests === 0) {
      alerts.push({
        text: "تم تعديل النسخة بعد التجميد بدون طلب تغيير مفتوح.",
        tone: "warn",
      });
    }
    if (hasFrozenBaseline && openChangeRequests > 0) {
      alerts.push({
        text: `يوجد ${toArabicDigits(openChangeRequests)} طلب تغيير مفتوح للمراجعة.`,
        tone: "info",
      });
    }
    if (stage === "advanced_plan" && actionTrackerStats.blocked > 0) {
      alerts.push({
        text: `يوجد ${toArabicDigits(actionTrackerStats.blocked)} مهام متعثرة في المتابعة التنفيذية.`,
        tone: "warn",
      });
    }
    if (deliveryTrack === "advanced" && liveRiskStats.total === 0) {
      alerts.push({
        text: "لوحة المخاطر الحية غير مكتملة، أضف بنود مخاطر تشغيلية.",
        tone: "info",
      });
    }
    if (deliveryTrack === "advanced" && liveRiskStats.critical > 0) {
      alerts.push({
        text: `يوجد ${toArabicDigits(liveRiskStats.critical)} مخاطر حرجة نشطة تحتاج معالجة.`,
        tone: "warn",
      });
    }
    if (deliveryTrack === "advanced" && liveRiskStats.overdue > 0) {
      alerts.push({
        text: `يوجد ${toArabicDigits(liveRiskStats.overdue)} مخاطر تجاوزت تاريخ المراجعة.`,
        tone: "warn",
      });
    }
    if (alerts.length === 0) {
      alerts.push({ text: "الوضع الحالي جيد ولا توجد تنبيهات حرجة.", tone: "ok" });
    }

    return alerts.slice(0, 3);
  }

  function eventDurationSummary() {
    if (!startAt || !endAt) return null;

    const start = new Date(startAt);
    const end = new Date(endAt);
    const diffMs = end.getTime() - start.getTime();

    if (!Number.isFinite(diffMs) || diffMs <= 0) return null;

    const totalMinutes = Math.round(diffMs / (1000 * 60));
    const days = Math.floor(totalMinutes / (60 * 24));
    const hours = Math.floor((totalMinutes % (60 * 24)) / 60);
    const minutes = totalMinutes % 60;

    const parts: string[] = [];
    if (days > 0) parts.push(`${toArabicDigits(days)} يوم`);
    if (hours > 0) parts.push(`${toArabicDigits(hours)} ساعة`);
    if (minutes > 0 && days === 0) parts.push(`${toArabicDigits(minutes)} دقيقة`);
    if (parts.length === 0) parts.push(`${toArabicDigits(totalMinutes)} دقيقة`);

    const isPaidConference =
      eventType === "مؤتمر احترافي مدفوع" || eventType.includes("مؤتمر");
    const isLongForPaidConference = isPaidConference && diffMs > 1000 * 60 * 60 * 24 * 3;

    return {
      label: parts.join(" و "),
      totalMinutes,
      isLongForPaidConference,
    };
  }

  function scoreTone(score: number) {
    if (score >= 80) return "ok";
    if (score >= 60) return "warn";
    return "risk";
  }

  function dataCompletenessScore() {
    const checks = [
      eventType.trim().length > 0,
      venueType.trim().length > 0,
      project.trim().length > 0,
      startAt.trim().length > 0,
      endAt.trim().length > 0,
      effectiveSelectedAdvisors.length > 0,
    ];

    if (deliveryTrack === "advanced") {
      checks.push(
        commissioningDate.trim().length > 0,
        scopeSite.trim().length > 0,
        scopeTechnical.trim().length > 0,
        scopeProgram.trim().length > 0,
        executionStrategy.trim().length > 0
      );
    }

    const passed = checks.filter(Boolean).length;
    return Math.round((passed / checks.length) * 100);
  }

  function scheduleHealthScore() {
    const checks: boolean[] = [
      startAt.trim().length > 0,
      endAt.trim().length > 0,
      !!startAt && !!endAt && !hasInvalidTimeRange(),
    ];

    if (deliveryTrack === "advanced") {
      checks.push(commissioningDate.trim().length > 0);
      if (commissioningDate && startAt) {
        checks.push(
          new Date(commissioningDate).getTime() <= new Date(startAt).getTime()
        );
      } else {
        checks.push(false);
      }
      if (projectStartDate && startAt) {
        checks.push(
          new Date(projectStartDate).getTime() <= new Date(startAt).getTime()
        );
      } else {
        checks.push(true);
      }
      if (projectStartDate && commissioningDate) {
        checks.push(
          new Date(projectStartDate).getTime() >= new Date(commissioningDate).getTime()
        );
      } else {
        checks.push(true);
      }
    }

    const passed = checks.filter(Boolean).length;
    return Math.round((passed / checks.length) * 100);
  }

  function boqCompletenessScore() {
    if (boqItems.length === 0) return 0;
    const fieldsPerRow = 10;
    const scorePerRow = boqItems.map((row) => {
      const hasSellConfiguration =
        row.unitSellPrice.trim().length > 0 ||
        (row.targetMarginPct.trim().length > 0 && row.unitCost.trim().length > 0);
      const filled = [
        row.category.trim().length > 0,
        row.item.trim().length > 0,
        row.spec.trim().length > 0,
        row.unit.trim().length > 0,
        row.qty.trim().length > 0,
        row.unitCost.trim().length > 0,
        hasSellConfiguration,
        row.source.trim().length > 0,
        row.leadTimeDays.trim().length > 0,
        row.ownerRoleId.trim().length > 0,
      ].filter(Boolean).length;
      return filled / fieldsPerRow;
    });

    const avg = scorePerRow.reduce((a, b) => a + b, 0) / scorePerRow.length;
    return Math.round(avg * 100);
  }

  function riskCoverageScore() {
    if (deliveryTrack !== "advanced") {
      if (!analysis) return 0;
      const risks = analysis?.strategic_analysis?.risks || [];
      return risks.length === 0 ? 90 : 65;
    }

    if (liveRiskItems.length > 0) {
      const owners = liveRiskItems.filter((item) => item.owner.trim().length > 0).length;
      const mitigations = liveRiskItems.filter((item) => item.mitigation.trim().length > 0).length;
      const reviews = liveRiskItems.filter((item) => item.reviewDate.trim().length > 0).length;
      const criticalActive = liveRiskItems.filter((item) => {
        const score = riskLevelScore(item.probability) * riskLevelScore(item.impact);
        return item.status !== "مغلق" && score >= 6;
      }).length;
      const closed = liveRiskItems.filter((item) => item.status === "مغلق").length;

      const ratio = (value: number) => value / liveRiskItems.length;
      const score = Math.round(
        ratio(owners) * 30 +
          ratio(mitigations) * 30 +
          ratio(reviews) * 20 +
          ratio(closed) * 20 -
          ratio(criticalActive) * 15
      );
      return Math.max(0, Math.min(100, score));
    }

    const text = riskManagement.trim();
    if (!text) return 0;

    let score = 40;
    if (text.length >= 60) score += 20;
    if (/(خطة|بديل|تصعيد|احتياطي|معالجة)/.test(text)) score += 20;
    if (text.split(/\n|[.!؟]/).filter((x) => x.trim().length > 0).length >= 3) score += 20;
    return Math.min(100, score);
  }

  function projectIndicators() {
    const dataScore = dataCompletenessScore();
    const scheduleScore = scheduleHealthScore();
    const boqScore = boqCompletenessScore();
    const riskScore = riskCoverageScore();

    const overall =
      deliveryTrack === "advanced"
        ? Math.round(
            dataScore * 0.25 +
              scheduleScore * 0.2 +
              boqScore * 0.3 +
              riskScore * 0.15 +
              answerQuality.score * 0.1
          )
        : Math.round(
            dataScore * 0.35 +
              scheduleScore * 0.35 +
              answerQuality.score * 0.3
          );

    return [
      {
        key: "overall",
        label: "الجاهزية العامة",
        score: overall,
        hint:
          deliveryTrack === "advanced"
            ? "مبني على البيانات + جدول الكميات + المخاطر"
            : "مبني على المسار السريع",
      },
      {
        key: "data",
        label: "اكتمال البيانات",
        score: dataScore,
        hint: "نسبة الحقول الأساسية المكتملة",
      },
      {
        key: "schedule",
        label: "صحة الجدول",
        score: scheduleScore,
        hint: "تحقق من منطق التواريخ وتسلسلها",
      },
      {
        key: "boq",
        label: "اكتمال جدول الكميات",
        score: boqScore,
        hint:
          deliveryTrack === "advanced"
            ? "اكتمال بنود الكميات والمواصفات"
            : "يتفعّل بشكل كامل في المسار المتقدم",
      },
      {
        key: "risk",
        label: "تغطية المخاطر",
        score: riskScore,
        hint:
          deliveryTrack === "advanced"
            ? "قياس تغطية خطة المخاطر"
            : "قراءة تقديرية من نتائج التحليل",
      },
    ];
  }

  function ratioAnswered(questionIds: string[]) {
    const subset = answers.filter((a) => questionIds.includes(a.id));
    if (subset.length === 0) return 0;
    const filled = subset.filter((a) => a.answer.trim().length > 0).length;
    return filled / subset.length;
  }

  function analyzeAnswerQuality() {
    const filledAnswers = answers.filter((a) => a.answer.trim().length > 0);
    const weakPatterns = [
      /^لا يوجد$/i,
      /^لا اعرف$/i,
      /^مدري$/i,
      /^غير محدد$/i,
      /^تمام$/i,
      /^كويس$/i,
      /^دعوات$/i,
      /^كل شي متوفر$/i,
    ];

    const weakItems = filledAnswers.filter((a) => {
      const text = a.answer.trim();
      const words = text.split(/\s+/).filter(Boolean).length;
      const tooShort = text.length < 12 || words <= 2;
      const generic = weakPatterns.some((p) => p.test(text));
      return tooShort || generic;
    });

    const filledCount = filledAnswers.length;
    const weakCount = weakItems.length;
    const strongCount = Math.max(0, filledCount - weakCount);
    const score = filledCount === 0 ? 0 : Math.round((strongCount / filledCount) * 100);

    let level: "ضعيف" | "متوسط" | "جيد" = "جيد";
    if (score < 45) level = "ضعيف";
    else if (score < 75) level = "متوسط";

    return {
      filledCount,
      weakCount,
      strongCount,
      score,
      level,
      weakExamples: weakItems.slice(0, 3),
    };
  }

  // ============ Actions ============
  async function startSession() {
    if (!canStart || loading) return;
    if (hasInvalidTimeRange()) {
      showError("وقت النهاية يجب أن يكون بعد وقت البداية.");
      return;
    }

    if (demoMode) {
      clearStatus();
      setStage("round1");
      return;
    }

    startLoading("start_session");
    setStage("round1");

    // reset downstream
    setRound1Questions([]);
    setFollowupQuestions([]);
    setAnswers([]);
    setDialogue([]);
    setDialogueSignature("");
    setOpenIssues([]);
    setHasAddition("no");
    setUserAddition("");
    setAnalysis(null);
    setAnalysisSignature("");
    setReportText("");

    const json = await callAPI<{ questions?: Question[] }>({
      stage: "questions",
      ...commonPayload(),
    });
    stopLoading();

    if (!json?.ok) {
      showError(json?.error || "حدث خطأ في توليد الأسئلة");
      setStage("init");
      return;
    }

    const qs: Question[] = json.data?.questions || [];
    setRound1Questions(qs);

    setAnswers(
      qs.map((q) => ({
        id: q.id,
        advisor_key: q.advisor_key,
        advisor_name: q.advisor_name,
        question: q.question,
        answer: "",
      }))
    );

    setStage("round1");
  }

  async function submitRound1() {
    const ids = round1Questions.map((q) => q.id);
    if (ratioAnswered(ids) < 0.6) {
      showError("جاوب على أغلب أسئلة الجولة الأولى (على الأقل 60%).");
      return;
    }

    if (demoMode) {
      clearStatus();
      setStage("round2");
      return;
    }

    startLoading("submit_round1");

    const round1Answers = answers.filter((a) => ids.includes(a.id));

    const json = await callAPI<{ followups?: Question[] }>({
      stage: "followups",
      ...commonPayload(),
      answers: round1Answers,
    });

    stopLoading();

    if (!json?.ok) {
      showError(json?.error || "حدث خطأ في توليد تدقيق إضافي");
      return;
    }

    const fs: Question[] = json.data?.followups || [];
    setFollowupQuestions(fs);

    if (fs.length === 0) {
      await buildDialogue();
      return;
    }

    setAnswers((prev) => [
      ...prev,
      ...fs.map((q) => ({
        id: q.id,
        advisor_key: q.advisor_key,
        advisor_name: q.advisor_name,
        question: q.question,
        answer: "",
      })),
    ]);

    setStage("round2");
  }

  async function submitRound2() {
    const ids = followupQuestions.map((q) => q.id);
    if (ids.length > 0 && ratioAnswered(ids) < 0.6) {
      showError("جاوب على أغلب تدقيق إضافي (على الأقل 60%).");
      return;
    }

    if (demoMode) {
      clearStatus();
      setStage("dialogue");
      return;
    }

    clearStatus();
    await buildDialogue();
  }

  async function buildDialogue() {
    const currentDialogueSignature = getDialogueSignature();
    const hasCachedDialogue =
      dialogue.length > 0 &&
      dialogueSignature === currentDialogueSignature;

    if (hasCachedDialogue) {
      clearStatus();
      setStage("dialogue");
      return;
    }

    startLoading("build_dialogue");

    const json = await callAPI<{
      council_dialogue?: DialogueLine[];
      open_issues?: string[];
    }>({
      stage: "dialogue",
      ...commonPayload(),
      answers,
    });

    stopLoading();

    if (!json?.ok) {
      showError(json?.error || "حدث خطأ في توليد الحوار");
      return;
    }

    setDialogue(json.data?.council_dialogue || []);
    setDialogueSignature(currentDialogueSignature);
    setOpenIssues(json.data?.open_issues || []);
    setStage("dialogue");
  }

  async function runAnalysis() {
    if (demoMode) {
      setNeedsReanalysisHint(false);
      clearStatus();
      setStage("done");
      return;
    }

    const currentAnalysisSignature = getAnalysisSignature();
    const hasCachedAnalysis =
      !!analysis &&
      !!reportText &&
      analysisSignature === currentAnalysisSignature;

    if (hasCachedAnalysis) {
      setNeedsReanalysisHint(false);
      showSuccess(UX_MESSAGES.reusedCurrentAnalysis);
      setStage("done");
      return;
    }

    setNeedsReanalysisHint(false);
    startLoading("run_analysis");

    const json = await callAPI<AnalysisData>({
      stage: "analysis",
      ...commonPayload(),
      answers,
      dialogue,
      userAddition: hasAddition === "yes" ? userAddition : "",
    });

    stopLoading();

    if (!json?.ok) {
      showError(json?.error || "حدث خطأ في التحليل");
      return;
    }

    setAnalysis(json.data);
    setAnalysisSignature(currentAnalysisSignature);
    setReportText(json.data?.report_text || "");
    setStage("done");
  }

  async function copyReport() {
    if (!reportText?.trim()) return;
    await navigator.clipboard.writeText(reportText);
    showSuccess("تم نسخ التقرير بنجاح.");
  }

  async function copyExecutiveDecision() {
    if (!analysis?.executive_decision) return;

    const decision = analysis.executive_decision.decision?.trim() || "—";
    const reason1 = analysis.executive_decision.reason_1?.trim() || "—";
    const reason2 = analysis.executive_decision.reason_2?.trim() || "—";
    const readiness = analysis.strategic_analysis?.readiness_level?.trim() || "—";

    const text = [
      "القرار التنفيذي",
      `القرار: ${decision}`,
      `مستوى الجاهزية: ${readiness}`,
      `- ${reason1}`,
      `- ${reason2}`,
    ].join("\n");

    await navigator.clipboard.writeText(text);
    showSuccess("تم نسخ القرار التنفيذي بنجاح.");
  }

  function splitUpgradeText(text: string) {
    const cleaned = text.replace(/\s+/g, " ").trim();
    if (!cleaned) {
      return { title: "ترقية بدون وصف", detail: "" };
    }

    const separatorIdx = cleaned.indexOf("،");
    if (separatorIdx > 18 && separatorIdx < 90) {
      return {
        title: cleaned.slice(0, separatorIdx).trim(),
        detail: cleaned.slice(separatorIdx + 1).trim(),
      };
    }

    return { title: cleaned, detail: "" };
  }

  async function copyTopUpgrades() {
    const upgrades = analysis?.strategic_analysis?.top_3_upgrades || [];
    if (!upgrades.length) {
      showError("لا توجد ترقيات لنسخها في النتيجة الحالية.");
      return;
    }

    const text = [
      "الترقيات التنفيذية المقترحة",
      ...upgrades.map((item: string, idx: number) => `الأولوية ${toArabicDigits(idx + 1)}: ${item}`),
    ].join("\n");

    await navigator.clipboard.writeText(text);
    showSuccess("تم نسخ الترقيات الثلاث.");
  }

  // ============ Styles ============
  const styles = useMemo(
    () => {
      const space = {
        xs: 8,
        sm: 12,
        md: 16,
        lg: 24,
        xl: 32,
      };

      const textScale = {
        tiny: isMobile ? 11 : 12,
        small: isMobile ? 12 : 13,
        body: isMobile ? 14 : 15,
        bodyStrong: isMobile ? 15 : 16,
        sectionTitle: isMobile ? 15 : 16,
        pageTitle: isMobile ? 20 : 24,
        heroTitle: isMobile ? 24 : 34,
        heroSubtitle: isMobile ? 13 : 16,
        heroMessage: isMobile ? 14 : 18,
      };
      const touchTarget = 44;

      return ({
      page: {
        minHeight: "100vh",
        background: "#05070d",
        color: "white",
        position: "relative" as const,
        overflow: "hidden" as const,
      },
      glow: {
        position: "absolute" as const,
        top: isMobile ? -340 : -260,
        left: "50%",
        transform: "translateX(-50%)",
        width: isMobile ? 720 : 980,
        height: isMobile ? 720 : 980,
        background:
          "radial-gradient(circle, rgba(128,0,255,0.55) 0%, rgba(5,7,13,0) 60%)",
        filter: "blur(90px)",
        zIndex: 0,
      },
      container: {
        maxWidth: 1320,
        margin: "0 auto",
        padding: isMobile ? space.md : space.xl,
        position: "relative" as const,
        zIndex: 1,
      },
      headerShell: {
        borderRadius: 18,
        border: "1px solid rgba(255,255,255,0.08)",
        background: "rgba(255,255,255,0.03)",
        backdropFilter: "blur(14px)",
        padding: isMobile ? space.sm : space.md,
        marginBottom: space.sm,
      } as CSSProperties,
      header: {
        display: "flex",
        justifyContent: "space-between",
        alignItems: isMobile ? "stretch" : "center",
        flexDirection: isMobile ? "column" : "row",
        gap: space.md,
        marginBottom: space.lg,
      } as CSSProperties,
      headerBrand: {
        display: "flex",
        alignItems: isMobile ? "flex-start" : "center",
        gap: isMobile ? space.sm : space.md,
        width: isMobile ? "100%" : "auto",
      },
      logo: {
        fontSize: textScale.pageTitle,
        fontWeight: 900,
        margin: 0,
        letterSpacing: 0.2,
      },
      subtitle: {
        marginTop: space.xs,
        color: "rgba(255,255,255,0.72)",
        fontSize: textScale.small,
      },
      headerActions: {
        display: "flex",
        gap: space.xs,
        alignItems: "center",
        flexDirection: "row",
        flexWrap: isMobile ? "wrap" : "nowrap",
        width: isMobile ? "100%" : "auto",
      } as CSSProperties,
      ghostBtn: {
        background: "transparent",
        border: "1px solid rgba(255,255,255,0.18)",
        padding: "10px 14px",
        minHeight: touchTarget,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        borderRadius: 12,
        color: "white",
        cursor: "pointer",
        fontSize: 14,
        lineHeight: 1.2,
        width: isNarrowMobile ? "100%" : "auto",
      },
      primaryBtn: (disabled: boolean) =>
        ({
          padding: "12px 16px",
          minHeight: touchTarget,
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          borderRadius: 14,
          border: "none",
          background: disabled
            ? "rgba(255,255,255,0.10)"
            : "linear-gradient(90deg, #6a00ff, #b300ff)",
          color: "white",
          fontWeight: 900,
          lineHeight: 1.2,
          cursor: disabled ? "not-allowed" : "pointer",
          width: "100%",
        } as CSSProperties),
      secondaryBtn: (disabled: boolean) =>
        ({
          padding: "12px 16px",
          minHeight: touchTarget,
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          borderRadius: 14,
          border: "1px solid rgba(255,255,255,0.18)",
          background: "rgba(255,255,255,0.04)",
          color: "white",
          fontWeight: 800,
          lineHeight: 1.2,
          cursor: disabled ? "not-allowed" : "pointer",
          width: "100%",
        } as CSSProperties),
      progressWrapper: {
        marginBottom: 18,
        borderRadius: 14,
        border: "1px solid rgba(255,255,255,0.10)",
        background: "linear-gradient(180deg, rgba(255,255,255,0.06), rgba(255,255,255,0.03))",
        boxShadow: "inset 0 1px 0 rgba(255,255,255,0.03)",
        padding: isMobile ? "10px 11px" : "11px 12px",
      } as CSSProperties,
      progressHeadRow: {
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 10,
      } as CSSProperties,
      progressTitle: {
        fontSize: 12.5,
        fontWeight: 800,
        color: "rgba(255,255,255,0.86)",
        lineHeight: 1.4,
      } as CSSProperties,
      progressPercentBadge: {
        borderRadius: 999,
        border: "1px solid rgba(0,229,255,0.30)",
        background: "rgba(0,229,255,0.12)",
        color: "rgba(255,255,255,0.95)",
        fontSize: 12,
        fontWeight: 900,
        padding: "4px 8px",
        whiteSpace: "nowrap",
      } as CSSProperties,
      progressCurrentStage: {
        marginTop: 8,
        fontSize: isMobile ? 14 : 14.5,
        lineHeight: 1.5,
        color: "rgba(255,255,255,0.95)",
      } as CSSProperties,
      progressMetaLine: {
        marginTop: 4,
        fontSize: 12,
        lineHeight: 1.5,
        color: "rgba(255,255,255,0.72)",
      } as CSSProperties,
      progressBar: {
        marginTop: 9,
        height: 9,
        background: "rgba(255,255,255,0.11)",
        border: "1px solid rgba(255,255,255,0.08)",
        borderRadius: 20,
        overflow: "hidden",
      } as CSSProperties,
      progressFill: {
        height: "100%",
        background: "linear-gradient(90deg, #00e5ff, #6a00ff, #b300ff)",
        boxShadow: "0 0 16px rgba(0,229,255,0.22)",
        transition: "width 260ms ease",
      } as CSSProperties,
      progressFooterText: {
        marginTop: 6,
        fontSize: 12,
        color: "rgba(255,255,255,0.74)",
      } as CSSProperties,
      grid: {
        display: "grid",
        gridTemplateColumns: isMobile ? "1fr" : "2fr 1fr",
        gap: space.md,
      },
      card: {
        background: "rgba(255,255,255,0.04)",
        backdropFilter: "blur(14px)",
        border: "1px solid rgba(255,255,255,0.08)",
        borderRadius: 16,
        padding: isMobile ? space.sm : space.md,
      },
      cardTitle: { fontSize: textScale.sectionTitle, fontWeight: 900, margin: 0 },
      muted: {
        color: "rgba(255,255,255,0.68)",
        fontSize: textScale.small,
        marginTop: space.xs,
      },
      label: {
        fontSize: textScale.small,
        color: "rgba(255,255,255,0.72)",
        marginBottom: space.xs,
      },
      input: {
        width: "100%",
        padding: space.xs,
        minHeight: touchTarget,
        borderRadius: 12,
        background: "rgba(0,0,0,0.35)",
        border: "1px solid rgba(255,255,255,0.12)",
        color: "white",
        outline: "none",
        fontSize: isMobile ? 16 : 14,
      },
      inputSuffixWrap: {
        position: "relative",
        width: "100%",
      } as CSSProperties,
      inputSuffix: {
        position: "absolute",
        left: 12,
        top: "50%",
        transform: "translateY(-50%)",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        minWidth: 16,
        zIndex: 2,
        fontSize: 13,
        color: "rgba(255,255,255,0.74)",
        pointerEvents: "none",
        userSelect: "none",
      } as CSSProperties,
      riyalIcon: {
        width: 16,
        height: 16,
        objectFit: "contain",
        display: "block",
        opacity: 1,
        filter: "brightness(0) invert(1)",
      } as CSSProperties,
      moneyInline: {
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
      } as CSSProperties,
      moneyInlineSuffix: {
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        minWidth: 16,
      } as CSSProperties,
      textarea: {
        width: "100%",
        padding: space.sm,
        borderRadius: 14,
        background: "rgba(0,0,0,0.35)",
        border: "1px solid rgba(255,255,255,0.12)",
        color: "white",
        outline: "none",
        resize: "none" as const,
        lineHeight: 1.7,
        fontSize: textScale.body,
      },
      hr: {
        height: 1,
        background: "rgba(255,255,255,0.10)",
        border: "none",
        margin: "14px 0",
      },
      metaItem: {
        display: "flex",
        justifyContent: "space-between",
        gap: 10,
        padding: "10px 12px",
        borderRadius: 14,
        background: "rgba(255,255,255,0.04)",
        border: "1px solid rgba(255,255,255,0.08)",
        marginTop: 10,
        fontSize: 13,
      },
      k: { color: "rgba(255,255,255,0.7)" },
      v: { fontWeight: 900 },
      qCard: {
        padding: isMobile ? 12 : 14,
        borderRadius: 14,
        background: "rgba(255,255,255,0.04)",
        border: "1px solid rgba(255,255,255,0.08)",
        marginTop: 12,
      } as CSSProperties,
      qTitle: {
        fontWeight: 900,
        marginBottom: space.xs,
        lineHeight: 1.5,
        fontSize: textScale.bodyStrong,
      } as CSSProperties,
      advisorQuestionHeader: (key: string) =>
        ({
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: isMobile ? "7px 9px" : "8px 10px",
          borderRadius: 12,
          border: `1px solid ${advisorColor(key)}2f`,
          background: `linear-gradient(180deg, ${advisorColor(key)}14, rgba(255,255,255,0.02))`,
          boxShadow: `inset 0 0 0 1px rgba(255,255,255,0.02), 0 0 18px ${advisorColor(key)}12`,
        } as CSSProperties),
      advisorQuestionIcon: (key: string) =>
        ({
          width: isMobile ? 26 : 28,
          height: isMobile ? 26 : 28,
          borderRadius: 999,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: `${advisorColor(key)}20`,
          border: `1px solid ${advisorColor(key)}40`,
          color: advisorColor(key),
          flexShrink: 0,
          fontSize: isMobile ? 14 : 15,
        } as CSSProperties),
      advisorQuestionText: {
        color: "rgba(255,255,255,0.92)",
        fontWeight: 900,
        letterSpacing: 0.1,
        lineHeight: 1.45,
        fontSize: isMobile ? 13 : 14,
      } as CSSProperties,
      qHint: {
        fontSize: textScale.tiny,
        color: "rgba(255,255,255,0.72)",
        marginTop: space.xs,
        lineHeight: 1.55,
      } as CSSProperties,
      row2: {
        display: "grid",
        gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr",
        gap: 12,
        marginTop: 12,
      },
      radioRow: {
        display: "flex",
        gap: 16,
        marginTop: 12,
        alignItems: "center",
        flexWrap: "wrap",
      } as CSSProperties,
      warnBox: {
        padding: 12,
        borderRadius: 14,
        background: "rgba(255, 200, 0, 0.10)",
        border: "1px solid rgba(255, 200, 0, 0.18)",
        marginTop: 10,
      },
      permissionHintBox: {
        marginTop: 8,
        marginBottom: 10,
        padding: "10px 12px",
        borderRadius: 12,
        background: "rgba(0, 229, 255, 0.08)",
        border: "1px solid rgba(0, 229, 255, 0.22)",
      } as CSSProperties,
      permissionHintTitle: {
        fontSize: 12.5,
        fontWeight: 900,
        color: "rgba(255,255,255,0.95)",
        marginBottom: 6,
      } as CSSProperties,
      permissionHintItem: {
        fontSize: 12.5,
        color: "rgba(255,255,255,0.88)",
        lineHeight: 1.55,
        marginTop: 4,
      } as CSSProperties,
      successBox: {
        padding: 12,
        borderRadius: 14,
        background: "rgba(0, 255, 133, 0.10)",
        border: "1px solid rgba(0, 255, 133, 0.18)",
        marginTop: 10,
      },
      toastWrap: {
        position: "fixed" as const,
        bottom: isMobile ? 10 : 18,
        left: isMobile ? 10 : 18,
        right: isMobile ? 10 : 18,
        zIndex: 50,
        display: "flex",
        justifyContent: "center",
        pointerEvents: "none" as const,
      },
      toastBox: {
        width: "fit-content",
        maxWidth: "min(92vw, 560px)",
        padding: "10px 14px",
        borderRadius: 14,
        backdropFilter: "blur(10px)",
        boxShadow: "0 10px 30px rgba(0,0,0,0.25)",
        pointerEvents: "auto" as const,
        animation: "toastSlideUp 180ms ease-out",
        willChange: "transform, opacity",
        lineHeight: 1.5,
      },

      // ✅ صفّين × 3 أعمدة (مُتوسّط + مقاس ثابت)
      advisorsGrid: {
        display: "grid",
        gridTemplateColumns: isMobile ? "repeat(2, 1fr)" : "repeat(3, 1fr)",
        gap: 10,
        marginBottom: 14,

        // ✅ التوسيط الصحيح
        maxWidth: isMobile ? "100%" : 520,
        marginLeft: "auto",
        marginRight: "auto",

        // ✅ نخلي العناصر تتمدد داخل العمود (أفضل تناسق)
        justifyItems: "stretch",
      } as CSSProperties,

      advisorTile: (key: string) =>
        ({
          height: 88,
          width: "100%", // ✅ مهم عشان يمسك عرض العمود
          borderRadius: 16,
          background: "rgba(255,255,255,0.035)",
          border: `1px solid ${advisorColor(key)}45`,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          textAlign: "center",
          padding: 10,
          boxShadow: `0 0 18px ${advisorColor(key)}18`,
        } as CSSProperties),
      advisorTileSelectable: (key: string, active: boolean) =>
        ({
          height: 88,
          width: "100%",
          borderRadius: 16,
          position: "relative",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          textAlign: "center",
          padding: 10,
          background: active
            ? `linear-gradient(180deg, ${advisorColor(key)}14, rgba(255,255,255,0.03))`
            : "rgba(255,255,255,0.02)",
          border: active
            ? `1px solid ${advisorColor(key)}55`
            : "1px solid rgba(255,255,255,0.08)",
          boxShadow: active ? `0 0 18px ${advisorColor(key)}14` : "none",
          opacity: active ? 1 : 0.72,
          cursor: "pointer",
          transition: "all 120ms ease",
        } as CSSProperties),
      advisorSelectDot: (active: boolean) =>
        ({
          position: "absolute",
          top: 8,
          left: 8,
          width: 12,
          height: 12,
          borderRadius: 999,
          border: active
            ? "1px solid rgba(0,255,133,0.45)"
            : "1px solid rgba(255,255,255,0.20)",
          background: active ? "#00FF85" : "transparent",
          boxShadow: active ? "0 0 10px rgba(0,255,133,0.55)" : "none",
        } as CSSProperties),

      advisorIconS: {
        fontSize: 20,
        marginBottom: 6,
      } as CSSProperties,
      advisorNameS: {
        fontSize: 13,
        fontWeight: 900,
        letterSpacing: 0.2,
      } as CSSProperties,

      advisorTileEmpty: {
        height: 88,
        width: "100%",
        borderRadius: 16,
        background: "rgba(255,255,255,0.02)",
        border: "1px dashed rgba(255,255,255,0.10)",
      } as CSSProperties,
      initFormGrid: {
        display: "grid",
        gridTemplateColumns: isNarrowMobile ? "1fr" : "1fr 1fr",
        gap: 12,
      } as CSSProperties,
      timelineGrid: {
        display: "grid",
        gridTemplateColumns: isNarrowMobile ? "1fr" : "1fr 1fr",
        gap: 10,
        marginTop: 10,
      } as CSSProperties,
      timelineFieldCard: {
        borderRadius: 12,
        border: "1px solid rgba(255,255,255,0.10)",
        background: "linear-gradient(180deg, rgba(255,255,255,0.05), rgba(255,255,255,0.02))",
        padding: 10,
      } as CSSProperties,
      timelineFieldHead: {
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 8,
        marginBottom: 7,
      } as CSSProperties,
      timelineFieldLabel: {
        fontSize: 12.5,
        fontWeight: 800,
        color: "rgba(255,255,255,0.94)",
      } as CSSProperties,
      timelineStatusChip: (tone: TimelineTone) =>
        ({
          borderRadius: 999,
          border:
            tone === "ok"
              ? "1px solid rgba(0,255,133,0.30)"
              : tone === "warn"
                ? "1px solid rgba(255,122,69,0.32)"
                : tone === "info"
                  ? "1px solid rgba(0,229,255,0.28)"
                  : "1px solid rgba(255,255,255,0.20)",
          background:
            tone === "ok"
              ? "rgba(0,255,133,0.10)"
              : tone === "warn"
                ? "rgba(255,122,69,0.10)"
                : tone === "info"
                  ? "rgba(0,229,255,0.10)"
                  : "rgba(255,255,255,0.06)",
          color: "white",
          fontSize: 11.5,
          fontWeight: 800,
          padding: "4px 8px",
          whiteSpace: "nowrap",
        } as CSSProperties),
      timelineFieldHint: {
        marginTop: 7,
        fontSize: 11.5,
        lineHeight: 1.5,
        color: "rgba(255,255,255,0.68)",
      } as CSSProperties,
      timelineSummaryGrid: {
        marginTop: 10,
        display: "grid",
        gridTemplateColumns: isNarrowMobile ? "1fr" : "1fr 1fr 1fr",
        gap: 8,
      } as CSSProperties,
      timelineSummaryItem: {
        borderRadius: 10,
        border: "1px solid rgba(255,255,255,0.10)",
        background: "rgba(255,255,255,0.03)",
        padding: "8px 9px",
      } as CSSProperties,
      timelineSummaryLabel: {
        fontSize: 11.5,
        color: "rgba(255,255,255,0.72)",
      } as CSSProperties,
      timelineSummaryValue: (tone: TimelineTone) =>
        ({
          marginTop: 4,
          fontSize: 13,
          fontWeight: 900,
          color:
            tone === "ok"
              ? "#00FF85"
              : tone === "warn"
                ? "#FF7A45"
                : tone === "info"
                  ? "#00E5FF"
                  : "rgba(255,255,255,0.9)",
        } as CSSProperties),
      scopeFieldsGrid: {
        marginTop: 10,
        display: "grid",
        gridTemplateColumns: isNarrowMobile ? "1fr" : "1fr 1fr",
        gap: 12,
      } as CSSProperties,
      scopeFieldCard: {
        borderRadius: 12,
        border: "1px solid rgba(255,255,255,0.11)",
        background: "linear-gradient(180deg, rgba(255,255,255,0.06), rgba(255,255,255,0.02))",
        padding: 10,
      } as CSSProperties,
      scopeSectionTitle: {
        fontSize: 15,
        fontWeight: 900,
        color: "rgba(255,255,255,0.95)",
      } as CSSProperties,
      scopeSectionHint: {
        marginTop: 4,
        fontSize: 12.5,
        lineHeight: 1.6,
        color: "rgba(255,255,255,0.72)",
      } as CSSProperties,
      scopeFieldTitle: {
        fontSize: 13,
        fontWeight: 900,
        color: "rgba(255,255,255,0.92)",
        marginBottom: 8,
      } as CSSProperties,
      scopeTextarea: {
        minHeight: isNarrowMobile ? 145 : 156,
      } as CSSProperties,
      scopeStrategyCard: {
        marginTop: 10,
        borderRadius: 12,
        border: "1px solid rgba(255,255,255,0.12)",
        background: "linear-gradient(180deg, rgba(255,255,255,0.06), rgba(255,255,255,0.02))",
        boxShadow: "inset 0 0 0 1px rgba(0,229,255,0.08)",
        padding: 10,
      } as CSSProperties,
      scopeStrategyTitle: {
        fontSize: 13,
        fontWeight: 900,
        color: "rgba(255,255,255,0.94)",
        marginBottom: 8,
      } as CSSProperties,
      scopeStrategyTextarea: {
        minHeight: isNarrowMobile ? 148 : 160,
      } as CSSProperties,
      advancedScopeNavCard: {
        borderRadius: 12,
        border: "1px solid rgba(255,255,255,0.10)",
        background: "linear-gradient(180deg, rgba(255,255,255,0.05), rgba(255,255,255,0.02))",
        padding: 10,
      } as CSSProperties,
      advancedScopeMetaRow: {
        marginTop: 8,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 8,
        flexWrap: "wrap",
      } as CSSProperties,
      advancedScopeMetaChip: (tone: "info" | "ok") =>
        ({
          borderRadius: 999,
          border:
            tone === "ok"
              ? "1px solid rgba(0,255,133,0.28)"
              : "1px solid rgba(0,229,255,0.28)",
          background:
            tone === "ok"
              ? "rgba(0,255,133,0.10)"
              : "rgba(0,229,255,0.10)",
          color: "rgba(255,255,255,0.95)",
          fontSize: 12,
          fontWeight: 800,
          padding: "4px 8px",
          whiteSpace: "nowrap",
        } as CSSProperties),
      advancedScopeMetaText: {
        fontSize: 12.5,
        color: "rgba(255,255,255,0.78)",
        lineHeight: 1.5,
      } as CSSProperties,
      advancedBoqNavGrid: {
        display: "grid",
        gridTemplateColumns: isNarrowMobile ? "1fr" : isMobile ? "1fr 1fr" : "repeat(3, 1fr)",
        gap: 10,
        marginBottom: 12,
      } as CSSProperties,
      selectorRow: {
        display: "grid",
        gridTemplateColumns: isNarrowMobile ? "1fr" : "1fr 1fr",
        gap: 10,
        marginBottom: 12,
      } as CSSProperties,
      selectorBtn: (active: boolean) =>
        ({
          minHeight: touchTarget,
          borderRadius: 12,
          border: active
            ? "1px solid rgba(179,0,255,0.35)"
            : "1px solid rgba(255,255,255,0.12)",
          background: active
            ? "linear-gradient(180deg, rgba(179,0,255,0.16), rgba(106,0,255,0.10))"
            : "rgba(255,255,255,0.03)",
          color: "white",
          padding: "10px 12px",
          textAlign: "right",
          cursor: "pointer",
          fontWeight: active ? 900 : 700,
        } as CSSProperties),
      sessionModeGrid: {
        display: "grid",
        gridTemplateColumns: isNarrowMobile ? "1fr" : "1fr 1fr",
        gap: 10,
        marginTop: 8,
      } as CSSProperties,
      sessionModeCard: (active: boolean) =>
        ({
          minHeight: touchTarget,
          borderRadius: 14,
          border: active
            ? "1px solid rgba(0,229,255,0.28)"
            : "1px solid rgba(255,255,255,0.10)",
          background: active
            ? "linear-gradient(180deg, rgba(0,229,255,0.10), rgba(179,0,255,0.08))"
            : "rgba(255,255,255,0.025)",
          color: "white",
          padding: "11px 12px",
          textAlign: "right",
          cursor: "pointer",
          boxShadow: active ? "0 8px 22px rgba(0,229,255,0.08)" : "none",
        } as CSSProperties),
      sessionModeTitle: {
        fontWeight: 900,
        fontSize: 13,
        color: "rgba(255,255,255,0.96)",
      } as CSSProperties,
      sessionModeDesc: {
        marginTop: 5,
        fontSize: 11.5,
        lineHeight: 1.5,
        color: "rgba(255,255,255,0.72)",
      } as CSSProperties,
      smallMuted: {
        marginTop: 8,
        fontSize: 12,
        color: "rgba(255,255,255,0.72)",
        lineHeight: 1.5,
      } as CSSProperties,
      summaryMetaGrid: {
        display: "grid",
        gridTemplateColumns: isNarrowMobile ? "1fr" : "1fr 1fr",
        gap: 10,
      } as CSSProperties,
      finalHeroCard: {
        borderRadius: 16,
        padding: isMobile ? 14 : 16,
        border: "1px solid rgba(179,0,255,0.22)",
        background:
          "linear-gradient(180deg, rgba(179,0,255,0.14), rgba(106,0,255,0.07) 55%, rgba(255,255,255,0.02))",
        boxShadow: "0 10px 30px rgba(64, 0, 128, 0.18)",
      } as CSSProperties,
      finalHeroHead: {
        display: "flex",
        alignItems: isMobile ? "flex-start" : "center",
        justifyContent: "space-between",
        gap: 10,
        flexDirection: isMobile ? "column" : "row",
      } as CSSProperties,
      decisionBadge: (decision?: string) =>
        ({
          display: "inline-flex",
          alignItems: "center",
          gap: 8,
          padding: "7px 10px",
          borderRadius: 999,
          border: `1px solid ${decisionAccent(decision)}50`,
          background: `${decisionAccent(decision)}14`,
          color: "white",
          fontSize: 12,
          fontWeight: 800,
        } as CSSProperties),
      decisionTitle: {
        marginTop: 10,
        fontSize: isMobile ? 18 : 22,
        fontWeight: 900,
        lineHeight: 1.4,
        color: "rgba(255,255,255,0.98)",
      } as CSSProperties,
      decisionReasons: {
        marginTop: 10,
        display: "grid",
        gap: 8,
      } as CSSProperties,
      decisionReasonItem: {
        padding: "10px 12px",
        borderRadius: 12,
        border: "1px solid rgba(255,255,255,0.08)",
        background: "rgba(255,255,255,0.03)",
        color: "rgba(255,255,255,0.9)",
      } as CSSProperties,
      quickStatsGrid: {
        display: "grid",
        gridTemplateColumns: isNarrowMobile ? "1fr 1fr" : "repeat(4, 1fr)",
        gap: 10,
        marginTop: 12,
      } as CSSProperties,
      statTile: {
        borderRadius: 14,
        padding: "10px 12px",
        border: "1px solid rgba(255,255,255,0.08)",
        background: "rgba(255,255,255,0.03)",
      } as CSSProperties,
      statLabel: {
        fontSize: 12,
        color: "rgba(255,255,255,0.7)",
        marginBottom: 4,
      } as CSSProperties,
      statValue: {
        fontSize: 17,
        fontWeight: 900,
        color: "rgba(255,255,255,0.96)",
      } as CSSProperties,
      qualityCard: {
        marginTop: 12,
        borderRadius: 14,
        border: "1px solid rgba(255,255,255,0.08)",
        background: "rgba(255,255,255,0.03)",
        padding: 12,
      } as CSSProperties,
      qualityMeterTrack: {
        marginTop: 8,
        height: 8,
        borderRadius: 999,
        background: "rgba(255,255,255,0.08)",
        overflow: "hidden",
      } as CSSProperties,
      qualityMeterFill: (level: "ضعيف" | "متوسط" | "جيد", score: number) =>
        ({
          height: "100%",
          width: `${score}%`,
          background:
            level === "جيد"
              ? "linear-gradient(90deg, #00e5ff, #00ff85)"
              : level === "متوسط"
                ? "linear-gradient(90deg, #ffc24d, #ff9d4d)"
                : "linear-gradient(90deg, #ff4fd8, #ff7a45)",
        } as CSSProperties),
      qualityBadge: (level: "ضعيف" | "متوسط" | "جيد") =>
        ({
          display: "inline-flex",
          alignItems: "center",
          padding: "4px 8px",
          borderRadius: 999,
          fontSize: 12,
          fontWeight: 800,
          border:
            level === "جيد"
              ? "1px solid rgba(0,255,133,0.30)"
              : level === "متوسط"
                ? "1px solid rgba(255,194,77,0.30)"
                : "1px solid rgba(255,79,216,0.30)",
          background:
            level === "جيد"
              ? "rgba(0,255,133,0.10)"
              : level === "متوسط"
                ? "rgba(255,194,77,0.10)"
                : "rgba(255,79,216,0.10)",
          color: "white",
        } as CSSProperties),
      sectionHeaderRow: {
        display: "flex",
        justifyContent: "space-between",
        alignItems: isMobile ? "stretch" : "center",
        gap: 10,
        marginBottom: 8,
        flexDirection: isMobile ? "column" : "row",
      } as CSSProperties,
      finalSectionBlock: {
        marginTop: isMobile ? 10 : 12,
      } as CSSProperties,
      finalReportHeaderRow: {
        display: "flex",
        justifyContent: "space-between",
        gap: 10,
        alignItems: isMobile ? "stretch" : "center",
        flexDirection: isMobile ? "column" : "row",
      } as CSSProperties,
      finalReportCopyBtn: {
        width: isMobile ? "100%" : "auto",
      } as CSSProperties,
      finalBodyText: {
        marginTop: space.xs,
        lineHeight: 1.7,
        color: "rgba(255,255,255,0.9)",
        fontSize: textScale.body,
      } as CSSProperties,
      questionPromptText: {
        marginTop: space.xs,
        lineHeight: 1.7,
        color: "rgba(255,255,255,0.93)",
        fontSize: textScale.body,
      } as CSSProperties,
      questionTextarea: {
        marginTop: 10,
        height: isMobile ? 120 : 90,
        fontSize: isMobile ? 16 : 14,
        lineHeight: isMobile ? 1.8 : 1.7,
        padding: isMobile ? 12 : 14,
      } as CSSProperties,
      sidePanel: {
        background:
          "linear-gradient(180deg, rgba(5,12,24,0.88), rgba(8,16,30,0.82) 45%, rgba(4,8,18,0.86))",
        backdropFilter: "blur(16px)",
        border: "1px solid rgba(0,229,255,0.16)",
        borderRadius: 18,
        boxShadow: "0 14px 34px rgba(0,0,0,0.26), inset 0 1px 0 rgba(255,255,255,0.04)",
        padding: isMobile ? 14 : 16,
        position: "sticky" as const,
        top: 12,
        alignSelf: "start",
      } as CSSProperties,
      sideSectionTitle: {
        marginTop: 14,
        marginBottom: 8,
        fontSize: 11.5,
        letterSpacing: 0.3,
        color: "rgba(0,229,255,0.82)",
        fontWeight: 800,
      } as CSSProperties,
      sideBlock: {
        marginTop: 12,
        borderRadius: 14,
        border: "1px solid rgba(255,255,255,0.10)",
        borderRight: "3px solid rgba(0,229,255,0.38)",
        background: "linear-gradient(180deg, rgba(255,255,255,0.05), rgba(255,255,255,0.025))",
        boxShadow: "inset 0 1px 0 rgba(255,255,255,0.04)",
        padding: isMobile ? 11 : 12,
      } as CSSProperties,
      sideBlockTitle: {
        fontWeight: 900,
        fontSize: 12.5,
        color: "rgba(255,255,255,0.96)",
        marginBottom: 7,
        lineHeight: 1.45,
      } as CSSProperties,
      sideProgressRow: {
        marginTop: 7,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 8,
      } as CSSProperties,
      sideProgressBadge: {
        borderRadius: 999,
        border: "1px solid rgba(0,229,255,0.26)",
        background: "rgba(0,229,255,0.10)",
        color: "rgba(255,255,255,0.94)",
        fontSize: 11.5,
        fontWeight: 900,
        padding: "3px 7px",
        whiteSpace: "nowrap",
      } as CSSProperties,
      sideProgressMeta: {
        marginTop: 5,
        fontSize: 11.5,
        lineHeight: 1.45,
        color: "rgba(255,255,255,0.70)",
      } as CSSProperties,
      stageStatusChip: (tone: "ready" | "active" | "working" | "idle") =>
        ({
          display: "inline-flex",
          alignItems: "center",
          gap: 8,
          padding: "6px 10px",
          borderRadius: 999,
          fontSize: 12,
          fontWeight: 800,
          color: "white",
          border:
            tone === "ready"
              ? "1px solid rgba(0,255,133,0.28)"
              : tone === "active"
                ? "1px solid rgba(0,229,255,0.28)"
                : tone === "working"
                  ? "1px solid rgba(255,194,77,0.28)"
                  : "1px solid rgba(179,107,255,0.28)",
          background:
            tone === "ready"
              ? "rgba(0,255,133,0.10)"
              : tone === "active"
                ? "rgba(0,229,255,0.10)"
                : tone === "working"
                  ? "rgba(255,194,77,0.10)"
                  : "rgba(179,107,255,0.10)",
        } as CSSProperties),
      miniStatsGrid: {
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        gap: 10,
      } as CSSProperties,
      roleGuideGrid: {
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        gap: 8,
      } as CSSProperties,
      roleGuideChip: (enabled: boolean) =>
        ({
          borderRadius: 10,
          border: enabled
            ? "1px solid rgba(0,255,133,0.28)"
            : "1px solid rgba(255,255,255,0.14)",
          background: enabled ? "rgba(0,255,133,0.10)" : "rgba(255,255,255,0.035)",
          padding: "7px 8px",
          fontSize: 11.5,
          lineHeight: 1.45,
          color: "rgba(255,255,255,0.92)",
        } as CSSProperties),
      miniStat: {
        borderRadius: 12,
        border: "1px solid rgba(255,255,255,0.10)",
        background: "linear-gradient(180deg, rgba(255,255,255,0.06), rgba(255,255,255,0.03))",
        padding: "9px 10px",
      } as CSSProperties,
      miniStatLabel: {
        fontSize: textScale.tiny,
        color: "rgba(255,255,255,0.62)",
        marginBottom: 3,
      } as CSSProperties,
      miniStatValue: {
        fontSize: textScale.body,
        fontWeight: 900,
        color: "rgba(255,255,255,0.95)",
      } as CSSProperties,
      welcomeHero: {
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        textAlign: "center",
        padding: isMobile ? `${space.xs}px ${space.xs}px` : `${space.sm}px ${space.xs}px`,
      } as CSSProperties,
      welcomeTitle: {
        margin: `${space.sm}px 0 0 0`,
        fontSize: textScale.heroTitle,
        fontWeight: 900,
        letterSpacing: 0.3,
      } as CSSProperties,
      welcomeSubtitle: {
        marginTop: space.xs,
        color: "rgba(255,255,255,0.88)",
        fontSize: textScale.heroSubtitle,
        fontWeight: 900,
        letterSpacing: 0.2,
      } as CSSProperties,
      welcomeMessage: {
        marginTop: space.sm,
        marginBottom: 0,
        maxWidth: isMobile ? 340 : 760,
        color: "rgba(255,255,255,0.9)",
        fontSize: textScale.heroMessage,
        fontWeight: 800,
        lineHeight: isMobile ? 1.85 : 1.9,
        textAlign: "center",
      } as CSSProperties,
      stackAfterSection: {
        marginTop: 12,
        display: "grid",
        gap: 10,
      } as CSSProperties,
      stackAfterBlock: {
        marginTop: 10,
        display: "grid",
        gap: 10,
      } as CSSProperties,
      textPrimarySmall: {
        fontSize: 13,
        color: "rgba(255,255,255,0.9)",
      } as CSSProperties,
      textSecondarySmall: {
        marginTop: 8,
        fontSize: 12,
        color: "rgba(255,255,255,0.72)",
      } as CSSProperties,
      textTertiarySmall: {
        marginTop: 8,
        fontSize: 12,
        color: "rgba(255,255,255,0.62)",
      } as CSSProperties,
      textMutedSmall: {
        marginTop: 10,
        fontSize: 12,
        color: "rgba(255,255,255,0.65)",
      } as CSSProperties,
      textMutedSmallTop8: {
        marginTop: 8,
        fontSize: 12,
        color: "rgba(255,255,255,0.65)",
      } as CSSProperties,
      blockTop12: { marginTop: 12 } as CSSProperties,
      blockTop10: { marginTop: 10 } as CSSProperties,
      blockTop8: { marginTop: 8 } as CSSProperties,
      orgRolesGrid: {
        marginTop: 10,
        display: "grid",
        gridTemplateColumns: isNarrowMobile ? "1fr" : "1fr 1fr",
        gap: 10,
      } as CSSProperties,
      orgRoleCard: (active: boolean) =>
        ({
          borderRadius: 12,
          border: active
            ? "1px solid rgba(0,229,255,0.24)"
            : "1px solid rgba(255,255,255,0.10)",
          background: active
            ? "linear-gradient(180deg, rgba(0,229,255,0.09), rgba(255,255,255,0.03))"
            : "rgba(255,255,255,0.025)",
          padding: 10,
        } as CSSProperties),
      orgRoleHead: {
        display: "flex",
        justifyContent: "space-between",
        gap: 10,
        alignItems: "flex-start",
      } as CSSProperties,
      orgRoleIdentity: {
        minWidth: 0,
        flex: 1,
      } as CSSProperties,
      orgRoleTitle: {
        fontSize: 13,
        fontWeight: 900,
        color: "rgba(255,255,255,0.95)",
      } as CSSProperties,
      orgRoleSummary: {
        marginTop: 3,
        fontSize: 11.5,
        color: "rgba(255,255,255,0.72)",
        lineHeight: 1.5,
      } as CSSProperties,
      orgRoleToggle: (active: boolean) =>
        ({
          minHeight: 30,
          borderRadius: 999,
          border: active
            ? "1px solid rgba(0,255,133,0.30)"
            : "1px solid rgba(255,194,77,0.32)",
          background: active
            ? "rgba(0,255,133,0.12)"
            : "rgba(255,194,77,0.10)",
          color: "white",
          fontSize: 11.5,
          fontWeight: 800,
          padding: "5px 10px",
          cursor: "pointer",
          flexShrink: 0,
        } as CSSProperties),
      orgRoleMetaRow: {
        marginTop: 8,
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        gap: 8,
      } as CSSProperties,
      orgRoleMetaBox: {
        borderRadius: 10,
        border: "1px solid rgba(255,255,255,0.08)",
        background: "rgba(255,255,255,0.03)",
        padding: "7px 8px",
      } as CSSProperties,
      orgRoleMetaLabel: {
        fontSize: 11,
        color: "rgba(255,255,255,0.70)",
      } as CSSProperties,
      orgRoleMetaHead: {
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 8,
      } as CSSProperties,
      orgRoleInfoBtn: {
        width: 20,
        height: 20,
        borderRadius: 999,
        border: "1px solid rgba(0,229,255,0.32)",
        background: "rgba(0,229,255,0.10)",
        color: "white",
        fontSize: 11,
        fontWeight: 900,
        lineHeight: 1,
        padding: 0,
        cursor: "pointer",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
      } as CSSProperties,
      orgRoleMetaValue: {
        marginTop: 3,
        fontSize: 13,
        fontWeight: 900,
        color: "rgba(255,255,255,0.95)",
      } as CSSProperties,
      orgRoleDetailsPanel: {
        marginTop: 8,
        borderRadius: 10,
        border: "1px solid rgba(0,229,255,0.22)",
        background: "rgba(0,229,255,0.06)",
        padding: "8px 10px",
      } as CSSProperties,
      orgRoleDetailsTitle: {
        fontSize: 11.5,
        fontWeight: 800,
        color: "rgba(255,255,255,0.9)",
      } as CSSProperties,
      orgRoleDetailsItem: {
        marginTop: 6,
        fontSize: 11.5,
        lineHeight: 1.5,
        color: "rgba(255,255,255,0.86)",
      } as CSSProperties,
      orgRoleMetaText: {
        marginTop: 8,
        fontSize: 11.5,
        color: "rgba(255,255,255,0.78)",
        lineHeight: 1.5,
      } as CSSProperties,
      actionTrackerHead: {
        display: "flex",
        alignItems: isMobile ? "flex-start" : "center",
        justifyContent: "space-between",
        gap: 10,
        flexDirection: isMobile ? "column" : "row",
      } as CSSProperties,
      actionTrackerBadge: {
        borderRadius: 999,
        border: "1px solid rgba(0,229,255,0.26)",
        background: "rgba(0,229,255,0.10)",
        padding: "6px 10px",
        fontSize: 12,
        fontWeight: 800,
        color: "white",
      } as CSSProperties,
      actionTrackerStatsGrid: {
        marginTop: 10,
        display: "grid",
        gridTemplateColumns: isNarrowMobile ? "1fr 1fr" : "repeat(4, 1fr)",
        gap: 8,
      } as CSSProperties,
      actionTrackerStat: {
        borderRadius: 10,
        border: "1px solid rgba(255,255,255,0.08)",
        background: "rgba(255,255,255,0.03)",
        padding: "7px 8px",
      } as CSSProperties,
      actionTrackerStatLabel: {
        fontSize: 11,
        color: "rgba(255,255,255,0.70)",
      } as CSSProperties,
      actionTrackerStatValue: {
        marginTop: 3,
        fontSize: 14,
        fontWeight: 900,
        color: "rgba(255,255,255,0.96)",
      } as CSSProperties,
      actionTaskCard: (status: ActionTaskStatus) =>
        ({
          marginTop: 10,
          borderRadius: 12,
          border:
            status === "مكتمل"
              ? "1px solid rgba(0,255,133,0.26)"
              : status === "متعثر"
                ? "1px solid rgba(255,122,69,0.30)"
                : status === "جاري"
                  ? "1px solid rgba(0,229,255,0.25)"
                  : "1px solid rgba(255,255,255,0.10)",
          background:
            status === "مكتمل"
              ? "rgba(0,255,133,0.06)"
              : status === "متعثر"
                ? "rgba(255,122,69,0.08)"
                : status === "جاري"
                  ? "rgba(0,229,255,0.07)"
                  : "rgba(255,255,255,0.025)",
          padding: 10,
        } as CSSProperties),
      actionTaskHead: {
        display: "grid",
        gap: 4,
      } as CSSProperties,
      actionTaskTitle: {
        fontSize: 13,
        fontWeight: 900,
        color: "rgba(255,255,255,0.96)",
        lineHeight: 1.5,
      } as CSSProperties,
      actionTaskMeta: {
        fontSize: 11.5,
        color: "rgba(255,255,255,0.72)",
      } as CSSProperties,
      actionTaskGrid: {
        marginTop: 10,
        display: "grid",
        gridTemplateColumns: isNarrowMobile ? "1fr" : "1fr 1fr 1fr",
        gap: 8,
      } as CSSProperties,
      actionTaskNotes: {
        height: 84,
        marginTop: 8,
      } as CSSProperties,
      outputPackRow: {
        marginTop: 10,
        display: "grid",
        gridTemplateColumns: isNarrowMobile ? "1fr" : "1fr 1fr",
        gap: 10,
      } as CSSProperties,
      outputPackCard: {
        borderRadius: 12,
        border: "1px solid rgba(255,255,255,0.08)",
        background: "rgba(255,255,255,0.03)",
        padding: 10,
      } as CSSProperties,
      outputPackTitle: {
        fontSize: 13,
        fontWeight: 900,
        color: "rgba(255,255,255,0.96)",
      } as CSSProperties,
      outputPackActions: {
        marginTop: 8,
        display: "grid",
        gridTemplateColumns: isNarrowMobile ? "1fr" : "1fr 1fr",
        gap: 8,
      } as CSSProperties,
      outputPackTextarea: {
        height: isMobile ? 220 : 260,
        marginTop: 8,
        fontSize: 13,
        lineHeight: 1.75,
      } as CSSProperties,
      riskBoardHead: {
        display: "flex",
        alignItems: isMobile ? "flex-start" : "center",
        justifyContent: "space-between",
        gap: 10,
        flexDirection: isMobile ? "column" : "row",
      } as CSSProperties,
      riskBoardBadge: {
        borderRadius: 999,
        border: "1px solid rgba(255,194,77,0.30)",
        background: "rgba(255,194,77,0.10)",
        padding: "6px 10px",
        fontSize: 12,
        fontWeight: 800,
        color: "white",
      } as CSSProperties,
      riskBoardStatsGrid: {
        marginTop: 10,
        display: "grid",
        gridTemplateColumns: isNarrowMobile ? "1fr 1fr" : "repeat(5, 1fr)",
        gap: 8,
      } as CSSProperties,
      riskBoardStat: {
        borderRadius: 10,
        border: "1px solid rgba(255,255,255,0.08)",
        background: "rgba(255,255,255,0.03)",
        padding: "7px 8px",
      } as CSSProperties,
      riskBoardStatLabel: {
        fontSize: 11,
        color: "rgba(255,255,255,0.70)",
      } as CSSProperties,
      riskBoardStatValue: {
        marginTop: 3,
        fontSize: 14,
        fontWeight: 900,
        color: "rgba(255,255,255,0.95)",
      } as CSSProperties,
      riskLegendRow: {
        marginTop: 10,
        display: "grid",
        gridTemplateColumns: isNarrowMobile ? "1fr 1fr" : "repeat(4, 1fr)",
        gap: 8,
      } as CSSProperties,
      riskLegendItem: {
        borderRadius: 10,
        border: "1px solid rgba(255,255,255,0.10)",
        background: "rgba(255,255,255,0.03)",
        padding: "7px 8px",
        display: "flex",
        alignItems: "center",
        gap: 8,
        fontSize: 11.5,
        color: "rgba(255,255,255,0.88)",
      } as CSSProperties,
      riskLegendDot: (severity: RiskSeverity) =>
        ({
          width: 8,
          height: 8,
          borderRadius: 999,
          background:
            severity === "critical"
              ? "#FF4F8B"
              : severity === "high"
                ? "#FF7A45"
                : severity === "medium"
                  ? "#FFC24D"
                  : "#00E5FF",
          boxShadow:
            severity === "critical"
              ? "0 0 10px rgba(255,79,139,0.5)"
              : severity === "high"
                ? "0 0 10px rgba(255,122,69,0.45)"
                : severity === "medium"
                  ? "0 0 10px rgba(255,194,77,0.45)"
                  : "0 0 10px rgba(0,229,255,0.45)",
          flexShrink: 0,
        } as CSSProperties),
      riskCard: (severity: RiskSeverity, status: RiskStatus) =>
        ({
          marginTop: 10,
          borderRadius: 12,
          border:
            status === "مغلق"
              ? "1px solid rgba(0,255,133,0.28)"
              : severity === "critical"
                ? "1px solid rgba(255,79,139,0.42)"
                : severity === "high"
                  ? "1px solid rgba(255,122,69,0.38)"
                  : severity === "medium"
                    ? "1px solid rgba(255,194,77,0.34)"
                    : "1px solid rgba(0,229,255,0.28)",
          background:
            status === "مغلق"
              ? "rgba(0,255,133,0.06)"
              : severity === "critical"
                ? "linear-gradient(180deg, rgba(255,79,139,0.14), rgba(255,255,255,0.02))"
                : severity === "high"
                  ? "linear-gradient(180deg, rgba(255,122,69,0.13), rgba(255,255,255,0.02))"
                  : severity === "medium"
                    ? "linear-gradient(180deg, rgba(255,194,77,0.11), rgba(255,255,255,0.02))"
                    : "linear-gradient(180deg, rgba(0,229,255,0.10), rgba(255,255,255,0.02))",
          boxShadow:
            status === "مغلق"
              ? "none"
              : severity === "critical"
                ? "0 10px 24px rgba(255,79,139,0.14)"
                : severity === "high"
                  ? "0 10px 24px rgba(255,122,69,0.12)"
                  : severity === "medium"
                    ? "0 8px 20px rgba(255,194,77,0.10)"
                    : "0 8px 18px rgba(0,229,255,0.09)",
          padding: 10,
        } as CSSProperties),
      riskCardHead: {
        display: "flex",
        alignItems: isMobile ? "flex-start" : "center",
        justifyContent: "space-between",
        gap: 8,
        flexDirection: isMobile ? "column" : "row",
      } as CSSProperties,
      riskCardTitle: {
        fontSize: 13,
        fontWeight: 900,
        color: "rgba(255,255,255,0.96)",
      } as CSSProperties,
      riskSeverityBadge: (severity: RiskSeverity) =>
        ({
          borderRadius: 999,
          border:
            severity === "critical"
              ? "1px solid rgba(255,79,139,0.38)"
              : severity === "high"
                ? "1px solid rgba(255,122,69,0.34)"
                : severity === "medium"
                  ? "1px solid rgba(255,194,77,0.30)"
                  : "1px solid rgba(0,229,255,0.28)",
          background:
            severity === "critical"
              ? "rgba(255,79,139,0.14)"
              : severity === "high"
                ? "rgba(255,122,69,0.12)"
                : severity === "medium"
                  ? "rgba(255,194,77,0.10)"
                  : "rgba(0,229,255,0.10)",
          padding: "5px 9px",
          fontSize: 11.5,
          fontWeight: 800,
          color: "white",
          width: "fit-content",
        } as CSSProperties),
      riskStatusBadge: (status: RiskStatus) =>
        ({
          borderRadius: 999,
          border:
            status === "مغلق"
              ? "1px solid rgba(0,255,133,0.30)"
              : status === "مصعّد"
                ? "1px solid rgba(255,79,139,0.36)"
                : status === "قيد المعالجة"
                  ? "1px solid rgba(255,194,77,0.30)"
                  : "1px solid rgba(0,229,255,0.28)",
          background:
            status === "مغلق"
              ? "rgba(0,255,133,0.10)"
              : status === "مصعّد"
                ? "rgba(255,79,139,0.12)"
                : status === "قيد المعالجة"
                  ? "rgba(255,194,77,0.10)"
                  : "rgba(0,229,255,0.10)",
          padding: "5px 9px",
          fontSize: 11.5,
          fontWeight: 800,
          color: "white",
          width: "fit-content",
        } as CSSProperties),
      riskCardMeta: {
        marginTop: 4,
        fontSize: 11.5,
        color: "rgba(255,255,255,0.72)",
      } as CSSProperties,
      riskLevelSelect: (level: RiskLevel) =>
        ({
          border:
            level === "مرتفع"
              ? "1px solid rgba(255,79,139,0.40)"
              : level === "متوسط"
                ? "1px solid rgba(255,194,77,0.34)"
                : "1px solid rgba(0,229,255,0.30)",
          background:
            level === "مرتفع"
              ? "rgba(255,79,139,0.10)"
              : level === "متوسط"
                ? "rgba(255,194,77,0.10)"
                : "rgba(0,229,255,0.08)",
        } as CSSProperties),
      riskStatusSelect: (status: RiskStatus) =>
        ({
          border:
            status === "مغلق"
              ? "1px solid rgba(0,255,133,0.32)"
              : status === "مصعّد"
                ? "1px solid rgba(255,79,139,0.38)"
                : status === "قيد المعالجة"
                  ? "1px solid rgba(255,194,77,0.34)"
                  : "1px solid rgba(0,229,255,0.30)",
          background:
            status === "مغلق"
              ? "rgba(0,255,133,0.09)"
              : status === "مصعّد"
                ? "rgba(255,79,139,0.10)"
                : status === "قيد المعالجة"
                  ? "rgba(255,194,77,0.10)"
                  : "rgba(0,229,255,0.08)",
        } as CSSProperties),
      governanceBadge: (tone: "frozen" | "changed" | "idle") =>
        ({
          borderRadius: 999,
          border:
            tone === "frozen"
              ? "1px solid rgba(0,255,133,0.30)"
              : tone === "changed"
                ? "1px solid rgba(255,194,77,0.30)"
                : "1px solid rgba(255,255,255,0.16)",
          background:
            tone === "frozen"
              ? "rgba(0,255,133,0.10)"
              : tone === "changed"
                ? "rgba(255,194,77,0.10)"
                : "rgba(255,255,255,0.04)",
          padding: "6px 10px",
          fontSize: 12,
          fontWeight: 800,
          color: "white",
          width: "fit-content",
        } as CSSProperties),
      governanceGrid: {
        marginTop: 10,
        display: "grid",
        gridTemplateColumns: isNarrowMobile ? "1fr 1fr" : "repeat(3, 1fr)",
        gap: 8,
      } as CSSProperties,
      governanceStat: {
        borderRadius: 10,
        border: "1px solid rgba(255,255,255,0.08)",
        background: "rgba(255,255,255,0.03)",
        padding: "8px 9px",
      } as CSSProperties,
      governanceStatLabel: {
        fontSize: 11,
        color: "rgba(255,255,255,0.70)",
      } as CSSProperties,
      governanceStatValue: {
        marginTop: 3,
        fontSize: 14,
        fontWeight: 900,
        color: "rgba(255,255,255,0.96)",
      } as CSSProperties,
      crCard: (status: ChangeRequestStatus) =>
        ({
          marginTop: 8,
          borderRadius: 10,
          border:
            status === "معتمد"
              ? "1px solid rgba(0,255,133,0.26)"
              : status === "مرفوض"
                ? "1px solid rgba(255,79,216,0.28)"
                : "1px solid rgba(0,229,255,0.24)",
          background:
            status === "معتمد"
              ? "rgba(0,255,133,0.06)"
              : status === "مرفوض"
                ? "rgba(255,79,216,0.08)"
                : "rgba(0,229,255,0.06)",
          padding: "9px 10px",
        } as CSSProperties),
      crTitle: {
        fontSize: 13,
        fontWeight: 900,
        color: "rgba(255,255,255,0.96)",
      } as CSSProperties,
      crMeta: {
        marginTop: 4,
        fontSize: 11.5,
        color: "rgba(255,255,255,0.74)",
        lineHeight: 1.5,
      } as CSSProperties,
      radioLabel: {
        display: "flex",
        gap: 8,
        alignItems: "center",
        minHeight: touchTarget,
        padding: "4px 2px",
      } as CSSProperties,
      textNeutralSmall72: {
        fontSize: 12,
        color: "rgba(255,255,255,0.72)",
      } as CSSProperties,
      qualityHeaderRow: {
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        gap: 10,
        flexWrap: "wrap",
      } as CSSProperties,
      qualitySummaryText: {
        marginTop: 6,
        fontSize: 13,
        color: "rgba(255,255,255,0.75)",
        lineHeight: 1.6,
      } as CSSProperties,
      qualityPositiveText: {
        marginTop: 10,
        fontSize: 13,
        color: "rgba(255,255,255,0.72)",
      } as CSSProperties,
      inlineWarnBoxTop10: {
        marginTop: 10,
      } as CSSProperties,
      decisionActionRow: {
        display: "flex",
        alignItems: "center",
        gap: 8,
        flexDirection: "row",
        flexWrap: "wrap",
        width: "auto",
      } as CSSProperties,
      advisorRecoEmptyText: {
        marginTop: 10,
        color: "rgba(255,255,255,0.65)",
        fontSize: 13,
      } as CSSProperties,
      reportHintText: {
        fontSize: 12,
        color: "rgba(255,255,255,0.7)",
        marginTop: 2,
      } as CSSProperties,
      reportTextarea: {
        height: isMobile ? 360 : 340,
        marginTop: 10,
        padding: 16,
        lineHeight: 1.9,
        fontSize: isMobile ? 14 : 15,
        fontFamily: "Tahoma, Arial, sans-serif",
        border: "1px solid rgba(0, 229, 255, 0.14)",
        background: "linear-gradient(180deg, rgba(0,0,0,0.35), rgba(0,0,0,0.46))",
      } as CSSProperties,
      sideSummaryPrimaryText: {
        fontSize: 13.5,
        color: "rgba(255,255,255,0.92)",
        lineHeight: 1.7,
      } as CSSProperties,
      compactGhostBtn: {
        width: "auto",
        minHeight: touchTarget,
        padding: "8px 12px",
        borderRadius: 999,
        fontSize: 12,
        lineHeight: 1.2,
        border: "1px solid rgba(255,255,255,0.14)",
        background: "rgba(255,255,255,0.03)",
      } as CSSProperties,
      sideDurationText: {
        marginTop: 10,
        fontSize: 12,
        color: "rgba(255,255,255,0.76)",
        lineHeight: 1.5,
      } as CSSProperties,
      sideQualityText: {
        marginTop: 8,
        fontSize: 12,
        color: "rgba(255,255,255,0.72)",
        lineHeight: 1.5,
      } as CSSProperties,
      kpiGrid: {
        display: "grid",
        gridTemplateColumns: isNarrowMobile ? "1fr" : "1fr 1fr",
        gap: 8,
      } as CSSProperties,
      kpiCard: (tone: "ok" | "warn" | "risk") =>
        ({
          borderRadius: 12,
          border:
            tone === "ok"
              ? "1px solid rgba(0,255,133,0.22)"
              : tone === "warn"
                ? "1px solid rgba(255,194,77,0.24)"
                : "1px solid rgba(255,122,69,0.26)",
          background:
            tone === "ok"
              ? "rgba(0,255,133,0.06)"
              : tone === "warn"
                ? "rgba(255,194,77,0.06)"
                : "rgba(255,122,69,0.07)",
          padding: "10px 10px",
        } as CSSProperties),
      kpiLabel: {
        fontSize: 11.5,
        color: "rgba(255,255,255,0.8)",
      } as CSSProperties,
      kpiValue: {
        marginTop: 4,
        fontSize: 15,
        fontWeight: 900,
        color: "rgba(255,255,255,0.97)",
      } as CSSProperties,
      kpiHint: {
        marginTop: 5,
        fontSize: 11,
        color: "rgba(255,255,255,0.65)",
        lineHeight: 1.45,
      } as CSSProperties,
      kpiBarTrack: {
        marginTop: 6,
        height: 6,
        borderRadius: 999,
        background: "rgba(255,255,255,0.10)",
        overflow: "hidden",
      } as CSSProperties,
      kpiBarFill: (score: number, tone: "ok" | "warn" | "risk") =>
        ({
          height: "100%",
          width: `${Math.max(0, Math.min(100, score))}%`,
          background:
            tone === "ok"
              ? "linear-gradient(90deg, #00e5ff, #00ff85)"
              : tone === "warn"
                ? "linear-gradient(90deg, #ffc24d, #ff9d4d)"
                : "linear-gradient(90deg, #ff7a45, #ff4fd8)",
        } as CSSProperties),
      sectionHeading: {
        margin: 0,
        fontWeight: 900,
      } as CSSProperties,
      listItemGap6: {
        marginBottom: 6,
      } as CSSProperties,
      listItemGap4: {
        marginBottom: 4,
      } as CSSProperties,
      strongText92: {
        color: "rgba(255,255,255,0.92)",
      } as CSSProperties,
      strongText95: {
        color: "rgba(255,255,255,0.95)",
      } as CSSProperties,
      smallMutedTop4: {
        ...({
          marginTop: 4,
        } as CSSProperties),
      },
      projectTextarea: {
        height: 150,
      } as CSSProperties,
      additionTextarea: {
        height: 110,
      } as CSSProperties,
      emptyHintText: {
        color: "rgba(255,255,255,0.7)",
      } as CSSProperties,
      qTitleGap4: {
        ...({
          marginBottom: 4,
        } as CSSProperties),
      },
      metaItemNoTop: {
        marginTop: 0,
      } as CSSProperties,
      metaItemNoTopCenter: {
        marginTop: 0,
        alignItems: "center",
      } as CSSProperties,
      sideAlertItem: (tone: "warn" | "info" | "ok") =>
        ({
          borderRadius: 10,
          padding: "8px 10px",
          marginTop: 8,
          border:
            tone === "warn"
              ? "1px solid rgba(255,122,69,0.30)"
              : tone === "info"
                ? "1px solid rgba(0,229,255,0.28)"
                : "1px solid rgba(0,255,133,0.28)",
          background:
            tone === "warn"
              ? "rgba(255,122,69,0.10)"
              : tone === "info"
                ? "rgba(0,229,255,0.10)"
                : "rgba(0,255,133,0.10)",
          fontSize: 12,
          lineHeight: 1.5,
          color: "rgba(255,255,255,0.9)",
        } as CSSProperties),
      advisorRecoGrid: {
        display: "grid",
        gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr",
        gap: 12,
        marginTop: 10,
      } as CSSProperties,
      advisorRecoCard: (key: string) =>
        ({
          borderRadius: 14,
          border: `1px solid ${advisorColor(key)}26`,
          background: `linear-gradient(180deg, ${advisorColor(key)}10, rgba(255,255,255,0.02) 55%)`,
          padding: 12,
        } as CSSProperties),
      advisorRecoList: {
        display: "grid",
        gap: 8,
        marginTop: 10,
      } as CSSProperties,
      advisorRecoItem: {
        borderRadius: 10,
        border: "1px solid rgba(255,255,255,0.07)",
        background: "rgba(255,255,255,0.025)",
        padding: "8px 10px",
        color: "rgba(255,255,255,0.9)",
        lineHeight: 1.6,
      } as CSSProperties,
      inlineWarnBox: {
        marginTop: 10,
        padding: "10px 12px",
        borderRadius: 12,
        background: "rgba(255, 122, 69, 0.10)",
        border: "1px solid rgba(255, 122, 69, 0.26)",
        color: "rgba(255,255,255,0.92)",
      } as CSSProperties,
      analysisCard: (tone: "strength" | "opportunity" | "gap" | "risk") => {
        const palette = {
          strength: {
            accent: "#00E5FF",
            bg: "linear-gradient(180deg, rgba(0,229,255,0.10), rgba(255,255,255,0.02) 60%)",
          },
          opportunity: {
            accent: "#00FF85",
            bg: "linear-gradient(180deg, rgba(0,255,133,0.09), rgba(255,255,255,0.02) 60%)",
          },
          gap: {
            accent: "#FFC24D",
            bg: "linear-gradient(180deg, rgba(255,194,77,0.09), rgba(255,255,255,0.02) 60%)",
          },
          risk: {
            accent: "#FF4FD8",
            bg: "linear-gradient(180deg, rgba(255,79,216,0.09), rgba(255,255,255,0.02) 60%)",
          },
        }[tone];

        return {
          padding: 14,
          borderRadius: 14,
          marginTop: 12,
          border: `1px solid ${palette.accent}22`,
          background: palette.bg,
          boxShadow: `inset 0 0 0 1px rgba(255,255,255,0.02), 0 8px 22px ${palette.accent}10`,
        } as CSSProperties;
      },
      analysisCardHead: (_tone: "strength" | "opportunity" | "gap" | "risk") => {
        void _tone;
        return {
          display: "flex",
          alignItems: "center",
          gap: 8,
          marginBottom: 8,
          color: "rgba(255,255,255,0.95)",
          fontWeight: 900,
        } as CSSProperties;
      },
      analysisAccentDot: (tone: "strength" | "opportunity" | "gap" | "risk") => {
        const palette = {
          strength: "#00E5FF",
          opportunity: "#00FF85",
          gap: "#FFC24D",
          risk: "#FF4FD8",
        }[tone];

        return {
          width: 9,
          height: 9,
          borderRadius: 999,
          background: palette,
          boxShadow: `0 0 10px ${palette}88`,
          flexShrink: 0,
        } as CSSProperties;
      },
      analysisList: {
        display: "grid",
        gap: 8,
      } as CSSProperties,
      analysisListItem: {
        padding: "8px 10px",
        borderRadius: 10,
        border: "1px solid rgba(255,255,255,0.06)",
        background: "rgba(255,255,255,0.02)",
        color: "rgba(255,255,255,0.88)",
        lineHeight: 1.6,
      } as CSSProperties,
      upgradeSectionHint: {
        marginTop: 2,
        fontSize: 12,
        color: "rgba(255,255,255,0.72)",
      } as CSSProperties,
      upgradeGrid: {
        marginTop: 10,
        display: "grid",
        gridTemplateColumns: isNarrowMobile ? "1fr" : "repeat(3, minmax(0, 1fr))",
        gap: 10,
      } as CSSProperties,
      upgradeCard: (priorityIdx: number) => {
        const palette = [
          {
            border: "rgba(0,229,255,0.28)",
            bg: "linear-gradient(180deg, rgba(0,229,255,0.11), rgba(255,255,255,0.02) 65%)",
            glow: "rgba(0,229,255,0.12)",
          },
          {
            border: "rgba(0,255,133,0.28)",
            bg: "linear-gradient(180deg, rgba(0,255,133,0.11), rgba(255,255,255,0.02) 65%)",
            glow: "rgba(0,255,133,0.12)",
          },
          {
            border: "rgba(255,194,77,0.30)",
            bg: "linear-gradient(180deg, rgba(255,194,77,0.12), rgba(255,255,255,0.02) 65%)",
            glow: "rgba(255,194,77,0.12)",
          },
        ][Math.max(0, Math.min(2, priorityIdx))];

        return {
          borderRadius: 12,
          border: `1px solid ${palette.border}`,
          background: palette.bg,
          boxShadow: `inset 0 0 0 1px rgba(255,255,255,0.02), 0 8px 20px ${palette.glow}`,
          padding: 11,
          minHeight: 112,
        } as CSSProperties;
      },
      upgradeCardHead: {
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
      } as CSSProperties,
      upgradePriorityBadge: (priorityIdx: number) => {
        const palette = [
          {
            border: "rgba(0,229,255,0.35)",
            bg: "rgba(0,229,255,0.14)",
          },
          {
            border: "rgba(0,255,133,0.35)",
            bg: "rgba(0,255,133,0.14)",
          },
          {
            border: "rgba(255,194,77,0.36)",
            bg: "rgba(255,194,77,0.14)",
          },
        ][Math.max(0, Math.min(2, priorityIdx))];

        return {
          borderRadius: 999,
          border: `1px solid ${palette.border}`,
          background: palette.bg,
          padding: "4px 9px",
          fontSize: 11.5,
          fontWeight: 900,
          color: "white",
          width: "fit-content",
        } as CSSProperties;
      },
      upgradeTitle: {
        marginTop: 8,
        fontSize: 13.5,
        fontWeight: 900,
        color: "rgba(255,255,255,0.96)",
        lineHeight: 1.6,
      } as CSSProperties,
      upgradeDetail: {
        marginTop: 6,
        fontSize: 12.5,
        color: "rgba(255,255,255,0.76)",
        lineHeight: 1.65,
      } as CSSProperties,
    });
    },
    [isMobile, isNarrowMobile]
  );

  const answerQuality = analyzeAnswerQuality();
  const indicators = projectIndicators();

  return (
    <main style={styles.page} dir="rtl">
      <style>{`
        @keyframes toastSlideUp {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        button:focus-visible,
        input:focus-visible,
        select:focus-visible,
        textarea:focus-visible {
          outline: 2px solid rgba(0, 229, 255, 0.95);
          outline-offset: 2px;
          box-shadow: 0 0 0 4px rgba(0, 229, 255, 0.16);
        }

        @media (prefers-reduced-motion: reduce) {
          * {
            animation-duration: 0.01ms !important;
            animation-iteration-count: 1 !important;
          }
        }
      `}</style>
      <div style={styles.glow} />
      <div style={styles.container}>
        {/* Header */}
        <div style={styles.headerShell}>
          {isWelcome ? (
            <div style={styles.welcomeHero}>
              <Image
                src="/logo.svg"
                alt="One Minute Strategy"
                width={isMobile ? 280 : 420}
                height={isMobile ? 94 : 142}
                style={{
                  height: isMobile ? 94 : 142,
                  width: "auto",
                  filter: "drop-shadow(0 0 24px rgba(128,0,255,0.6))",
                }}
              />
              <h1 style={styles.welcomeTitle}>
                One Minute Strategy
              </h1>
              <div style={styles.welcomeSubtitle}>
                Executive Decision Intelligence Platform
              </div>
              <p style={styles.welcomeMessage}>
                فكرتك تحتاج قرار، وقرارك يحتاج وضوح. مع One Minute Strategy تحصل على مجلس
                استشاري متكامل يحلل مشروعك من كل زاوية خلال دقيقة واحدة. نختصر الفوضى، نصنع
                التركيز، ونحوّل الفكرة إلى خطة تنفيذية جاهزة. في عالم السرعة، القرار الأسرع هو
                الأقوى.
              </p>
              <button
                style={{
                  marginTop: 18,
                  ...styles.primaryBtn(false),
                  width: isMobile ? "100%" : 280,
                }}
                onClick={() => {
                  setInitStep("session");
                  setStage("init");
                }}
              >
                🚀 انطلق الآن
              </button>
              <button
                style={{
                  marginTop: 10,
                  ...styles.secondaryBtn(!canLoadDemo),
                  width: isMobile ? "100%" : 280,
                }}
                disabled={!canLoadDemo}
                title={
                  canLoadDemo
                    ? undefined
                    : permissionHintText(
                        "تحميل النموذج التجريبي",
                        ["project_manager", "operations_manager", "finance_manager"],
                        userRole
                      )
                }
                onClick={fillFullTestModel}
              >
                🧪 تحميل نموذج تجريبي كامل
              </button>
            </div>
          ) : (
            <header style={styles.header}>
              <div style={styles.headerBrand}>
                <Image
                  src="/logo.svg"
                  alt="One Minute Strategy"
                  width={180}
                  height={44}
                  style={{
                    height: isMobile ? 36 : 44,
                    width: "auto",
                    filter: "drop-shadow(0 0 18px rgba(128,0,255,0.7))",
                  }}
                />

                <div>
                  <h1 style={styles.logo}>One Minute Strategy</h1>
                  <div style={styles.subtitle}>
                    Executive Decision Intelligence Platform
                  </div>
                </div>
              </div>

              <div style={styles.headerActions}>
                <div style={{ minWidth: isMobile ? "100%" : 190 }}>
                  <div style={styles.label}>الدور الحالي</div>
                  <select
                    value={userRole}
                    onChange={(e) => setUserRole(e.target.value as UserRole)}
                    style={styles.input}
                  >
                    <option value="project_manager">مدير مشروع</option>
                    <option value="operations_manager">عمليات</option>
                    <option value="finance_manager">مالي</option>
                    <option value="viewer">مشاهد فقط</option>
                  </select>
                </div>

                {stage === "done" && reportText?.trim() ? (
                  <button style={styles.ghostBtn} onClick={copyReport}>
                    نسخ التقرير
                  </button>
                ) : null}

                {!isSelectionStep ? (
                  <button
                    style={styles.ghostBtn}
                    onClick={clearSession}
                    disabled={!canResetSession}
                    title={
                      canResetSession
                        ? undefined
                        : permissionHintText("مسح الجلسة", ["project_manager"], userRole)
                    }
                  >
                    مسح الجلسة
                  </button>
                ) : null}
              </div>
            </header>
          )}
        </div>

        {/* Progress */}
        {!isWelcome && !isSelectionStep ? (
          <div style={styles.progressWrapper}>
            <div style={styles.progressHeadRow}>
              <div style={styles.progressTitle}>✨ مسار التقدم</div>
              <div style={styles.progressPercentBadge}>{progressPercent()}%</div>
            </div>
            <div style={styles.progressCurrentStage}>
              <strong style={styles.strongText95}>{stageLabel()}</strong>
            </div>
            {progressMetaText() ? (
              <div style={styles.progressMetaLine}>{progressMetaText()}</div>
            ) : null}
            <div style={styles.progressBar}>
              <div
                style={{
                  ...styles.progressFill,
                  width: `${progressPercent()}%`,
                }}
              />
            </div>
            <div style={styles.progressFooterText}>{stageStatusText()}</div>
          </div>
        ) : null}

        {/* Layout */}
        {!isWelcome ? <div style={styles.grid}>
          {/* Main */}
          <section style={styles.card}>
            <h2 style={styles.cardTitle}>الجلسة الإستشارية</h2>
            <p style={styles.muted}>
              {initStep === "session"
                ? "اختر نوع الجلسة وحدد المستشارين المشاركين. اختر طريقة العمل (سريعة أو معمّقة)، ثم حدد من سيشارك في الجلسة قبل الانتقال إلى تفاصيل المشروع."
                : sessionSectionLead()}
            </p>

            <hr style={styles.hr} />

            {stagePermissionHints.length > 0 ? (
              <div style={styles.permissionHintBox}>
                <div style={styles.permissionHintTitle}>قيود الصلاحية في هذه المرحلة</div>
                {stagePermissionHints.map((hint, idx) => (
                  <div key={idx} style={styles.permissionHintItem}>
                    • {hint}
                  </div>
                ))}
              </div>
            ) : null}

            {/* INIT */}
            {stage === "init" && (
              <>
                {initStep === "session" && (
                  <>
                    <div style={styles.selectorRow}>
                      <button
                        type="button"
                        style={styles.selectorBtn(advisorSelectionMode === "all")}
                        disabled={!canEditSessionSetup}
                        onClick={() => {
                          setAdvisorSelectionMode("all");
                          setSelectedAdvisors(ALL_ADVISOR_KEYS);
                        }}
                      >
                        جلسة كاملة (كل المستشارين)
                      </button>
                      <button
                        type="button"
                        style={styles.selectorBtn(advisorSelectionMode === "custom")}
                        disabled={!canEditSessionSetup}
                        onClick={() => {
                          if (advisorSelectionMode === "custom") return;
                          setAdvisorSelectionMode("custom");
                          setSelectedAdvisors([]);
                        }}
                      >
                        اختيار مخصص (مستشار واحد أو أكثر)
                      </button>
                    </div>

                    <div style={styles.blockTop12}>
                      <div style={styles.label}>نوع الجلسة</div>
                      <div style={styles.sessionModeGrid}>
                        <button
                          type="button"
                          style={styles.sessionModeCard(mode === "مراجعة تنفيذية سريعة")}
                          disabled={!canEditSessionSetup}
                          onClick={() => setMode("مراجعة تنفيذية سريعة")}
                        >
                          <div style={styles.sessionModeTitle}>مراجعة تنفيذية سريعة</div>
                          <div style={styles.sessionModeDesc}>
                            مناسبة للحصول على قرار سريع بأسئلة أقل ومخرجات مختصرة.
                          </div>
                        </button>
                        <button
                          type="button"
                          style={styles.sessionModeCard(mode === "تحليل معمّق")}
                          disabled={!canEditSessionSetup}
                          onClick={() => setMode("تحليل معمّق")}
                        >
                          <div style={styles.sessionModeTitle}>تحليل معمّق</div>
                          <div style={styles.sessionModeDesc}>
                            أسئلة أكثر وحوار أعمق لتقييم المشروع بشكل تفصيلي.
                          </div>
                        </button>
                      </div>
                    </div>

                    <div style={styles.blockTop12}>
                      <div style={styles.label}>مسار التنفيذ</div>
                      <div style={styles.selectorRow}>
                        <button
                          type="button"
                          style={styles.selectorBtn(deliveryTrack === "fast")}
                          disabled={!canEditSessionSetup}
                          onClick={() => setDeliveryTrack("fast")}
                        >
                          المسار السريع (النموذج الحالي)
                        </button>
                        <button
                          type="button"
                          style={styles.selectorBtn(deliveryTrack === "advanced")}
                          disabled={!canEditSessionSetup}
                          onClick={() => setDeliveryTrack("advanced")}
                        >
                          المسار المتقدم (اختياري)
                        </button>
                      </div>
                    </div>

                    <div style={styles.smallMuted}>
                      {advisorSelectionMode === "all"
                        ? "المستشارون المشاركون"
                        : "المستشارون المشاركون (اختيار مخصص)"}
                    </div>

                    <div style={{ ...styles.smallMuted, ...styles.smallMutedTop4 }}>
                      {advisorSelectionMode === "all"
                        ? "سيتم إشراك جميع المستشارين في الأسئلة والحوار والتحليل."
                        : `المحددون حاليًا: ${toArabicDigits(
                            selectedAdvisors.length
                          )} من ${toArabicDigits(ALL_ADVISOR_KEYS.length)}`}
                    </div>

                    <div style={styles.advisorsGrid}>
                      {[
                        "financial_advisor",
                        "regulatory_advisor",
                        "operations_advisor",
                        "marketing_advisor",
                        "risk_advisor",
                        ...(isMobile ? [] : ["__empty__"]),
                      ].map((key) => {
                        if (key === "__empty__") {
                          return <div key="empty" style={styles.advisorTileEmpty} />;
                        }

                        return (
                          <button
                            type="button"
                            key={key}
                            onClick={() => {
                              if (advisorSelectionMode === "custom") {
                                toggleAdvisorSelection(key as AdvisorKey);
                              }
                            }}
                            disabled={!canEditSessionSetup || advisorSelectionMode !== "custom"}
                            aria-disabled={!canEditSessionSetup || advisorSelectionMode !== "custom"}
                            style={
                              advisorSelectionMode === "custom"
                                ? styles.advisorTileSelectable(
                                    key,
                                    selectedAdvisors.includes(key as AdvisorKey)
                                  )
                                : {
                                    ...styles.advisorTile(key),
                                    cursor: "default",
                                    opacity: 1,
                                    position: "relative",
                                  }
                            }
                          >
                            <span
                              style={styles.advisorSelectDot(
                                effectiveSelectedAdvisors.includes(key as AdvisorKey)
                              )}
                            />
                            <div style={styles.advisorIconS}>{advisorIcon(key)}</div>
                            <div style={styles.advisorNameS}>{advisorName(key)}</div>
                          </button>
                        );
                      })}
                    </div>

                    {advisorSelectionMode === "custom" && selectedAdvisors.length === 0 ? (
                      <div style={styles.warnBox}>
                        <strong>تنبيه:</strong> اختر مستشارًا واحدًا على الأقل للمتابعة.
                      </div>
                    ) : null}

                    <div style={styles.stackAfterSection}>
                      <button
                        style={styles.primaryBtn(!canMoveToProjectStep || !canEditSessionSetup)}
                        disabled={!canMoveToProjectStep || !canEditSessionSetup}
                        title={
                          !canEditSessionSetup
                            ? permissionHintText(
                                "الانتقال لتفاصيل المشروع",
                                ["project_manager", "operations_manager"],
                                userRole
                              )
                            : undefined
                        }
                        onClick={() => setInitStep("project")}
                      >
                        التالي: تفاصيل المشروع
                      </button>
                    </div>
                  </>
                )}

                {initStep === "project" && (
                  <>
                    <div style={styles.initFormGrid}>
                  <div>
                    <div style={styles.label}>نوع الفعالية</div>
                    <select
                      value={eventType}
                      onChange={(e) => setEventType(e.target.value)}
                      disabled={!canEditProjectCore}
                      style={styles.input}
                    >
                      <option>فعالية مفتوحة عامة</option>
                      <option>فعالية موسمية</option>
                      <option>مؤتمر احترافي مدفوع</option>
                      <option>فعالية برعاية رئيسية</option>
                      <option>فعالية مؤسسية (حكومية / قطاع خاص)</option>
                      <option>نموذج هجين</option>
                    </select>
                  </div>

                  <div>
                    <div style={styles.label}>نوع الموقع</div>
                    <select
                      value={venueType}
                      onChange={(e) => {
                        if (isVenueType(e.target.value)) {
                          setVenueType(e.target.value);
                        }
                      }}
                      disabled={!canEditProjectCore}
                      style={styles.input}
                    >
                      <option value="غير محدد">غير محدد</option>
                      <option value="منتجع">منتجع</option>
                      <option value="فندق">فندق</option>
                      <option value="قاعة">قاعة</option>
                      <option value="مساحة عامة">مساحة عامة</option>
                    </select>
                  </div>

                  <div>
                    <div style={styles.label}>الميزانية (اختياري)</div>
                    <div style={styles.inputSuffixWrap}>
                      <input
                        value={budget}
                        onChange={(e) => setBudget(normalizeDigitsToEnglish(e.target.value))}
                        disabled={!canEditBudget}
                        style={{ ...styles.input, paddingLeft: 44 }}
                        placeholder="مثال: 250000"
                      />
                      <span style={styles.inputSuffix}>{renderRiyalSuffix()}</span>
                    </div>
                  </div>

                  <div>
                    <div style={styles.label}>بداية الفعالية</div>
                    <input
                      type="datetime-local"
                      value={startAt}
                      onChange={(e) => setStartAt(e.target.value)}
                      disabled={!canEditProjectCore}
                      style={styles.input}
                    />
                  </div>

                  <div>
                    <div style={styles.label}>نهاية الفعالية</div>
                    <input
                      type="datetime-local"
                      value={endAt}
                      onChange={(e) => setEndAt(e.target.value)}
                      disabled={!canEditProjectCore}
                      style={styles.input}
                    />
                  </div>
                    </div>

                    <div style={styles.blockTop12}>
                      <div style={styles.label}>وصف المشروع</div>
                      <textarea
                        value={project}
                        onChange={(e) => setProject(e.target.value)}
                        disabled={!canEditProjectCore}
                        style={{ ...styles.textarea, ...styles.projectTextarea }}
                        placeholder="اكتب الفكرة: الهدف، الجمهور، البوثات/التذاكر/الرعاة، التكاليف، الزمن..."
                      />
                    </div>

                    <div style={styles.stackAfterSection}>
                      {hasInvalidTimeRange() ? (
                        <div style={{ ...styles.warnBox, marginBottom: 0 }}>
                          <strong>تنبيه:</strong> وقت النهاية يجب أن يكون بعد وقت البداية.
                        </div>
                      ) : null}

                      <button
                        style={styles.primaryBtn(
                          !canStart || isProcessing() || hasInvalidTimeRange() || !canRunAnalysisFlow
                        )}
                        disabled={!canStart || isProcessing() || hasInvalidTimeRange() || !canRunAnalysisFlow}
                        title={
                          !canRunAnalysisFlow
                            ? permissionHintText(
                                "بدء الجلسة",
                                ["project_manager", "operations_manager"],
                                userRole
                              )
                            : undefined
                        }
                        onClick={startSession}
                      >
                        {actionLabel("ابدأ الجلسة", "start_session")}
                      </button>

                      <button
                        style={styles.secondaryBtn(isProcessing())}
                        disabled={isProcessing()}
                        onClick={() => setInitStep("session")}
                      >
                        رجوع: نوع الجلسة والمستشارون
                      </button>
                    </div>
                  </>
                )}
              </>
            )}

            {/* ROUND 1 */}
            {stage === "round1" && (
              <>
                <h3 style={styles.sectionHeading}>
                  المرحلة 1: أسئلة الجولة الأولى
                </h3>

                {round1Questions.map((q) => {
                  const a = answers.find((x) => x.id === q.id);

                  return (
                    <div key={q.id} style={styles.qCard}>
                      <div style={styles.advisorQuestionHeader(q.advisor_key)}>
                        <span style={styles.advisorQuestionIcon(q.advisor_key)}>
                          {advisorIcon(q.advisor_key)}
                        </span>
                        <span style={styles.advisorQuestionText}>
                          {advisorTitle(q.advisor_key)}
                        </span>
                      </div>

                      <div style={styles.questionPromptText}>• {q.question}</div>
                      <div style={styles.qHint}>سبب السؤال: {q.intent}</div>

                      <textarea
                        value={a?.answer ?? ""}
                        onChange={(e) => {
                          const val = e.target.value;
                          setAnswers((prev) =>
                            prev.map((x) =>
                              x.id === q.id ? { ...x, answer: val } : x
                            )
                          );
                        }}
                        disabled={!canEditAnswers}
                        placeholder="اكتب إجابتك..."
                        style={{ ...styles.textarea, ...styles.questionTextarea }}
                      />
                    </div>
                  );
                })}

                <div style={styles.stackAfterSection}>
                  <button
                    style={styles.primaryBtn(isProcessing())}
                    disabled={isProcessing() || !canRunAnalysisFlow}
                    title={
                      !canRunAnalysisFlow
                        ? permissionHintText(
                            "متابعة الجولة التالية",
                            ["project_manager", "operations_manager"],
                            userRole
                          )
                        : undefined
                    }
                    onClick={submitRound1}
                  >
                    {actionLabel("التالي: تدقيق إضافي", "submit_round1")}
                  </button>

                  <button
                    style={styles.secondaryBtn(isProcessing())}
                    disabled={isProcessing()}
                    onClick={() => setStage("init")}
                  >
                    رجوع للإعدادات
                  </button>
                </div>
              </>
            )}

            {/* ROUND 2 */}
            {stage === "round2" && (
              <>
                <h3 style={styles.sectionHeading}>المرحلة 2: تدقيق إضافي</h3>

                {followupQuestions.map((q) => {
                  const a = answers.find((x) => x.id === q.id);
                  return (
                    <div key={q.id} style={styles.qCard}>
                      <div style={styles.advisorQuestionHeader(q.advisor_key)}>
                        <span style={styles.advisorQuestionIcon(q.advisor_key)}>
                          {advisorIcon(q.advisor_key)}
                        </span>
                        <span style={styles.advisorQuestionText}>
                          {advisorTitle(q.advisor_key)}
                        </span>
                      </div>
                      <div style={styles.questionPromptText}>• {q.question}</div>
                      <div style={styles.qHint}>
                        {q.advisor_name} • سبب السؤال: {q.intent}
                      </div>

                      <textarea
                        value={a?.answer ?? ""}
                        onChange={(e) => {
                          const val = e.target.value;
                          setAnswers((prev) =>
                            prev.map((x) =>
                              x.id === q.id ? { ...x, answer: val } : x
                            )
                          );
                        }}
                        disabled={!canEditAnswers}
                        placeholder="اكتب إجابتك..."
                        style={{ ...styles.textarea, ...styles.questionTextarea }}
                      />
                    </div>
                  );
                })}

                <div style={styles.stackAfterSection}>
                  <button
                    style={styles.primaryBtn(isProcessing())}
                    disabled={isProcessing() || !canRunAnalysisFlow}
                    title={
                      !canRunAnalysisFlow
                        ? permissionHintText(
                            "متابعة الحوار",
                            ["project_manager", "operations_manager"],
                            userRole
                          )
                        : undefined
                    }
                    onClick={submitRound2}
                  >
                    {actionLabel("التالي: حوار المستشارين", "build_dialogue")}
                  </button>

                  <button
                    style={styles.secondaryBtn(isProcessing())}
                    disabled={isProcessing()}
                    onClick={() => setStage("round1")}
                  >
                    رجوع: الجولة الأولى
                  </button>
                </div>
              </>
            )}

            {/* DIALOGUE */}
            {stage === "dialogue" && (
              <>
                <h3 style={styles.sectionHeading}>المرحلة 3: حوار المستشارين</h3>

                <div style={styles.stackAfterBlock}>
                  {dialogue.map((m, i) => (
                    <div key={i} style={styles.qCard}>
                      <div style={styles.advisorQuestionHeader(m.advisor)}>
                        <span style={styles.advisorQuestionIcon(m.advisor)}>
                          {advisorIcon(m.advisor)}
                        </span>
                        <span style={styles.advisorQuestionText}>
                          {advisorTitle(m.advisor)}
                        </span>
                      </div>

                      <div style={styles.finalBodyText}>
                        {m.statement}
                      </div>
                    </div>
                  ))}
                </div>

                {openIssues.length > 0 ? (
                  <div style={styles.blockTop12}>
                    <div style={styles.qCard}>
                      <div style={styles.qTitle}>نقاط مفتوحة قبل القرار</div>
                      {openIssues.map((x, idx) => (
                          <div key={idx} style={styles.listItemGap6}>
                            • {x}
                          </div>
                      ))}
                    </div>
                  </div>
                ) : null}

                <div style={styles.stackAfterSection}>
                  <button
                    style={styles.primaryBtn(isProcessing())}
                    disabled={isProcessing() || !canRunAnalysisFlow}
                    title={
                      !canRunAnalysisFlow
                        ? permissionHintText(
                            "الانتقال لمرحلة الإضافة",
                            ["project_manager", "operations_manager"],
                            userRole
                          )
                        : undefined
                    }
                    onClick={() => setStage("addition")}
                  >
                    التالي: هل لديك إضافة؟
                  </button>

                  <button
                    style={styles.secondaryBtn(isProcessing())}
                    disabled={isProcessing()}
                    onClick={() =>
                      setStage(followupQuestions.length > 0 ? "round2" : "round1")
                    }
                  >
                    رجوع: مراجعة الإجابات
                  </button>
                </div>
              </>
            )}

            {/* ADDITION */}
            {stage === "addition" && (
              <>
                <h3 style={styles.sectionHeading}>
                  المرحلة 4: مراجعة قبل التحليل
                </h3>

                <div style={styles.radioRow}>
                  <label style={styles.radioLabel}>
                    <input
                      type="radio"
                      checked={hasAddition === "no"}
                      disabled={!canEditAnswers}
                      onChange={() => setHasAddition("no")}
                    />
                    لا يوجد
                  </label>

                  <label style={styles.radioLabel}>
                    <input
                      type="radio"
                      checked={hasAddition === "yes"}
                      disabled={!canEditAnswers}
                      onChange={() => setHasAddition("yes")}
                    />
                    يوجد إضافة
                  </label>
                </div>

                {hasAddition === "yes" && (
                  <div style={styles.blockTop10}>
                    <textarea
                      value={userAddition}
                      onChange={(e) => setUserAddition(e.target.value)}
                      disabled={!canEditAnswers}
                      style={{ ...styles.textarea, ...styles.additionTextarea }}
                      placeholder="اكتب الإضافة (ميزانية/موقع/مدة/بوثات/تسعير/راعي محتمل...)"
                    />
                  </div>
                )}

                <div style={styles.qualityCard}>
                  <div style={styles.qualityHeaderRow}>
                    <div style={{ fontWeight: 900 }}>مؤشر جودة الإجابات قبل التحليل</div>
                    <div style={styles.qualityBadge(answerQuality.level)}>
                      {answerQuality.level}
                    </div>
                  </div>

                  <div style={styles.qualitySummaryText}>
                    جودة تقديرية: {toArabicDigits(answerQuality.score)}٪
                    {" • "}
                    إجابات قوية: {toArabicDigits(answerQuality.strongCount)}
                    {" • "}
                    إجابات تحتاج تفصيل: {toArabicDigits(answerQuality.weakCount)}
                  </div>

                  <div style={styles.qualityMeterTrack}>
                    <div
                      style={styles.qualityMeterFill(
                        answerQuality.level,
                        answerQuality.score
                      )}
                    />
                  </div>

                  {answerQuality.weakCount > 0 ? (
                    <div style={{ ...styles.inlineWarnBox, ...styles.inlineWarnBoxTop10 }}>
                      <strong>ملاحظة مهمة:</strong> بعض الإجابات قصيرة أو عامة جدًا، وهذا
                      يضعف دقة التحليل النهائي.
                      {answerQuality.weakExamples.length > 0 ? (
                        <div style={styles.blockTop8}>
                          {answerQuality.weakExamples.map((x, i) => (
                            <div key={i} style={styles.listItemGap4}>
                              • {x.question}
                            </div>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  ) : (
                    <div style={styles.qualityPositiveText}>
                      ممتاز، مستوى الإجابات الحالي مناسب لإنتاج تحليل أقوى.
                    </div>
                  )}
                </div>

                {needsReanalysisHint ? (
                  <div style={{ ...styles.inlineWarnBox, ...styles.inlineWarnBoxTop10 }}>
                    <strong>تنبيه:</strong> هذه النتائج مبنية على تحليل سابق.{" "}
                    {UX_MESSAGES.reanalysisRequired}
                  </div>
                ) : null}

                <div style={styles.stackAfterSection}>
                  <button
                    style={styles.primaryBtn(isProcessing())}
                    disabled={isProcessing() || !canRunAnalysisFlow}
                    title={
                      !canRunAnalysisFlow
                        ? permissionHintText(
                            "تشغيل التحليل",
                            ["project_manager", "operations_manager"],
                            userRole
                          )
                        : undefined
                    }
                    onClick={runAnalysis}
                  >
                    {actionLabel("ابدأ التحليل + القرار + التوصيات", "run_analysis")}
                  </button>

                  {analysis ? (
                    <button
                      style={styles.secondaryBtn(isProcessing())}
                      disabled={isProcessing()}
                      onClick={() => {
                        showSuccess(UX_MESSAGES.openedCurrentResults);
                        setNeedsReanalysisHint(false);
                        setStage("done");
                      }}
                    >
                      الانتقال إلى النتائج الحالية
                    </button>
                  ) : null}

                  <button
                    style={styles.secondaryBtn(isProcessing())}
                    disabled={isProcessing()}
                    onClick={() => setStage("dialogue")}
                  >
                    رجوع: حوار المستشارين
                  </button>
                </div>
              </>
            )}

            {/* DONE */}
            {stage === "done" && analysis && (
              <>
                <h3 style={styles.sectionHeading}>
                  المرحلة 5: المخرجات النهائية
                </h3>

                <div style={styles.blockTop12}>
                  <div style={styles.finalHeroCard}>
                    <div style={styles.finalHeroHead}>
                      <div style={styles.qTitle}>القرار التنفيذي</div>
                      <div style={styles.decisionActionRow}>
                        <div style={styles.decisionBadge(analysis?.executive_decision?.decision)}>
                          <span
                            style={{
                              width: 8,
                              height: 8,
                              borderRadius: 999,
                              background:
                                readinessAccent(analysis?.strategic_analysis?.readiness_level),
                              display: "inline-block",
                            }}
                          />
                          {analysis?.strategic_analysis?.readiness_level
                            ? `الجاهزية: ${analysis.strategic_analysis.readiness_level}`
                            : "الجاهزية: —"}
                        </div>

                        <button
                          style={{
                            ...styles.ghostBtn,
                            ...styles.compactGhostBtn,
                          }}
                          onClick={copyExecutiveDecision}
                        >
                          نسخ القرار
                        </button>
                      </div>
                    </div>

                    <div style={styles.decisionTitle}>
                      {analysis?.executive_decision?.decision ?? "—"}
                    </div>

                    <div style={styles.decisionReasons}>
                      <div style={styles.decisionReasonItem}>
                        • {analysis?.executive_decision?.reason_1 ?? "—"}
                      </div>
                      <div style={styles.decisionReasonItem}>
                        • {analysis?.executive_decision?.reason_2 ?? "—"}
                      </div>
                    </div>
                  </div>
                </div>

                <div style={styles.quickStatsGrid}>
                  <div style={styles.statTile}>
                    <div style={styles.statLabel}>مستوى الجاهزية</div>
                    <div
                      style={{
                        ...styles.statValue,
                        color: readinessAccent(analysis?.strategic_analysis?.readiness_level),
                      }}
                    >
                      {analysis?.strategic_analysis?.readiness_level ?? "—"}
                    </div>
                  </div>
                  <div style={styles.statTile}>
                    <div style={styles.statLabel}>نقاط القوة</div>
                    <div style={styles.statValue}>
                      {(analysis?.strategic_analysis?.strengths || []).length}
                    </div>
                  </div>
                  <div style={styles.statTile}>
                    <div style={styles.statLabel}>الفجوات</div>
                    <div style={styles.statValue}>
                      {(analysis?.strategic_analysis?.gaps || []).length}
                    </div>
                  </div>
                  <div style={styles.statTile}>
                    <div style={styles.statLabel}>المخاطر</div>
                    <div style={styles.statValue}>
                      {(analysis?.strategic_analysis?.risks || []).length}
                    </div>
                  </div>
                </div>

                <div style={styles.row2}>
                  <div style={styles.analysisCard("strength")}>
                    <div style={styles.analysisCardHead("strength")}>
                      <span style={styles.analysisAccentDot("strength")} />
                      نقاط القوة
                    </div>
                    <div style={styles.analysisList}>
                      {(analysis?.strategic_analysis?.strengths || []).map(
                        (x: string, i: number) => (
                          <div key={i} style={styles.analysisListItem}>
                            • {x}
                          </div>
                        )
                      )}
                    </div>
                  </div>

                  <div style={styles.analysisCard("opportunity")}>
                    <div style={styles.analysisCardHead("opportunity")}>
                      <span style={styles.analysisAccentDot("opportunity")} />
                      فرص التعظيم
                    </div>
                    <div style={styles.analysisList}>
                      {(analysis?.strategic_analysis?.amplification_opportunities || []).map(
                        (x: string, i: number) => (
                          <div key={i} style={styles.analysisListItem}>
                            • {x}
                          </div>
                        )
                      )}
                    </div>
                  </div>

                  <div style={styles.analysisCard("gap")}>
                    <div style={styles.analysisCardHead("gap")}>
                      <span style={styles.analysisAccentDot("gap")} />
                      فجوات تحتاج معالجة
                    </div>
                    <div style={styles.analysisList}>
                      {(analysis?.strategic_analysis?.gaps || []).map(
                        (x: string, i: number) => (
                          <div key={i} style={styles.analysisListItem}>
                            • {x}
                          </div>
                        )
                      )}
                    </div>
                  </div>

                  <div style={styles.analysisCard("risk")}>
                    <div style={styles.analysisCardHead("risk")}>
                      <span style={styles.analysisAccentDot("risk")} />
                      مخاطر محتملة
                    </div>
                    <div style={styles.analysisList}>
                      {(analysis?.strategic_analysis?.risks || []).map(
                        (x: string, i: number) => (
                          <div key={i} style={styles.analysisListItem}>
                            • {x}
                          </div>
                        )
                      )}
                    </div>
                  </div>
                </div>

                <div style={styles.finalSectionBlock}>
                  <div style={styles.qCard}>
                    <div style={styles.sectionHeaderRow}>
                      <div>
                        <div style={styles.qTitle}>الترقيات التنفيذية المقترحة</div>
                        <div style={styles.upgradeSectionHint}>
                          مرتبة حسب الأولوية للتنفيذ ضمن خطة التحسين.
                        </div>
                      </div>
                      {(analysis?.strategic_analysis?.top_3_upgrades || []).length > 0 ? (
                        <button
                          style={{ ...styles.ghostBtn, ...styles.compactGhostBtn }}
                          onClick={copyTopUpgrades}
                        >
                          نسخ الترقيات الثلاث
                        </button>
                      ) : null}
                    </div>
                    {(analysis?.strategic_analysis?.top_3_upgrades || []).length ? (
                      <div style={styles.upgradeGrid}>
                        {(analysis?.strategic_analysis?.top_3_upgrades || []).map(
                          (x: string, i: number) => {
                            const parsed = splitUpgradeText(x);
                            return (
                              <div key={i} style={styles.upgradeCard(i)}>
                                <div style={styles.upgradeCardHead}>
                                  <div style={styles.upgradePriorityBadge(i)}>
                                    الأولوية {toArabicDigits(i + 1)}
                                  </div>
                                </div>
                                <div style={styles.upgradeTitle}>{parsed.title}</div>
                                {parsed.detail ? (
                                  <div style={styles.upgradeDetail}>{parsed.detail}</div>
                                ) : null}
                              </div>
                            );
                          }
                        )}
                      </div>
                    ) : (
                      <div style={styles.emptyHintText}>
                        لا توجد ترقيات محددة في النتيجة الحالية.
                      </div>
                    )}
                  </div>
                </div>

                <div style={styles.finalSectionBlock}>
                  <div style={styles.qCard}>
                    <div style={styles.sectionHeaderRow}>
                      <div style={styles.qTitle}>توصيات المستشارين</div>
                    </div>

                    <div style={styles.advisorRecoGrid}>
                      {Object.entries(analysis?.advisor_recommendations || {}).map(
                        ([k, v]) => (
                          <div key={k} style={styles.advisorRecoCard(k)}>
                            <div style={styles.advisorQuestionHeader(k)}>
                              <span style={styles.advisorQuestionIcon(k)}>
                                {advisorIcon(k)}
                              </span>
                              <span style={styles.advisorQuestionText}>
                                {advisorTitle(k)}
                              </span>
                            </div>

                            {(v?.recommendations || []).length ? (
                              <div style={styles.advisorRecoList}>
                                {(v?.recommendations || []).map((r: string, i: number) => (
                                  <div key={i} style={styles.advisorRecoItem}>
                                    • {r}
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <div style={styles.advisorRecoEmptyText}>
                                لا توجد توصيات مفصلة من هذا المستشار في هذه النتيجة.
                              </div>
                            )}

                            {v?.strategic_warning ? (
                              <div style={styles.inlineWarnBox}>
                                <strong>تنبيه استراتيجي:</strong> {v.strategic_warning}
                              </div>
                            ) : null}
                          </div>
                        )
                      )}
                    </div>
                  </div>
                </div>

                <div style={styles.finalSectionBlock}>
                  <div style={styles.qCard}>
                    <div style={styles.finalReportHeaderRow}>
                      <div style={styles.qTitle}>التقرير النهائي (قابل للنسخ لوورد)</div>
                      <button
                        style={{ ...styles.ghostBtn, ...styles.finalReportCopyBtn }}
                        onClick={copyReport}
                      >
                        نسخ
                      </button>
                    </div>

                    <div style={styles.reportHintText}>
                      صياغة جاهزة للنسخ المباشر إلى Word مع الحفاظ على العناوين والفقرات.
                    </div>

                    <textarea
                      readOnly
                      value={reportText}
                      style={{ ...styles.textarea, ...styles.reportTextarea }}
                      placeholder="سيظهر هنا التقرير النهائي..."
                    />
                  </div>
                </div>

                <div style={styles.stackAfterSection}>
		                  <button
		                    style={styles.primaryBtn(
		                      isProcessing() || (!canEditAdvancedExecution && !canEditGovernance)
		                    )}
		                    disabled={
		                      isProcessing() || (!canEditAdvancedExecution && !canEditGovernance)
		                    }
                        title={
                          !canEditAdvancedExecution && !canEditGovernance
                            ? permissionHintText(
                                "فتح المسار المتقدم",
                                ["project_manager", "operations_manager", "finance_manager"],
                                userRole
                              )
                            : undefined
                        }
		                    onClick={openAdvancedTrack}
		                  >
                    {deliveryTrack === "advanced"
                      ? "التالي: استكمال المسار المتقدم"
                      : "ترقية إلى المسار المتقدم"}
                  </button>

                  <button
                    style={styles.secondaryBtn(isProcessing())}
                    disabled={isProcessing() || !canRunAnalysisFlow}
                    onClick={() => {
                      setStage("addition");
                      setNeedsReanalysisHint(true);
                      showError(UX_MESSAGES.reanalysisRequired);
                    }}
                  >
                    رجوع: تعديل قبل التحليل
                  </button>
                </div>
              </>
            )}

            {stage === "advanced_scope" && (
              <>
                <h3 style={styles.sectionHeading}>المرحلة 6: النطاق والهيكل التشغيلي</h3>
                <div style={styles.textMutedSmallTop8}>
                  حدّد نطاق التنفيذ ثم وزّع الأدوار قبل الانتقال لمرحلة التخطيط التشغيلي.
                </div>

                <div style={styles.blockTop12}>
                  <div style={styles.advancedScopeNavCard}>
                    <div style={styles.selectorRow}>
                      <button
                        type="button"
                        style={styles.selectorBtn(advancedScopeStep === "scope")}
                        disabled={isProcessing()}
                        onClick={() => setAdvancedScopeStep("scope")}
                      >
                        النطاق والاستراتيجية
                      </button>
                      <button
                        type="button"
                        style={styles.selectorBtn(advancedScopeStep === "org")}
                        disabled={isProcessing()}
                        onClick={() => setAdvancedScopeStep("org")}
                      >
                        الهيكل التشغيلي
                      </button>
                    </div>
                    <div style={styles.advancedScopeMetaRow}>
                      {advancedScopeStep === "scope" ? (
                        <>
                          <div style={styles.advancedScopeMetaChip("info")}>
                            الخطوة الحالية: {toArabicDigits(1)} من {toArabicDigits(2)}
                          </div>
                          <div
                            style={styles.advancedScopeMetaChip(
                              advancedScopeCompletedCount === advancedScopeTotalCount ? "ok" : "info"
                            )}
                          >
                            اكتمال النطاق:{" "}
                            {toArabicDigits(advancedScopeCompletedCount)}/{toArabicDigits(advancedScopeTotalCount)}
                          </div>
                          <div style={styles.advancedScopeMetaText}>
                            ابدأ بتجهيز النطاق والاستراتيجية ثم انتقل للهيكل التشغيلي.
                          </div>
                        </>
                      ) : (
                        <>
                          <div style={styles.advancedScopeMetaChip("info")}>
                            الخطوة الحالية: {toArabicDigits(2)} من {toArabicDigits(2)}
                          </div>
                          <div
                            style={styles.advancedScopeMetaChip(
                              activeOrgRoles.length > 0 ? "ok" : "info"
                            )}
                          >
                            الأدوار المفعلة: {toArabicDigits(activeOrgRoles.length)}/{toArabicDigits(orgRoles.length)}
                          </div>
                          <div style={styles.advancedScopeMetaText}>
                            راجع توزيع المسؤوليات قبل الانتقال إلى جدول الكميات.
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {advancedScopeStep === "scope" ? (
                  <>
                    <div style={styles.blockTop12}>
                      <div style={styles.qCard}>
                        <div style={styles.sectionHeaderRow}>
                          <div style={styles.qTitle}>الإطار الزمني للمشروع</div>
                          <div style={styles.stageStatusChip(advancedTimelineStatus.tone)}>
                            {advancedTimelineStatus.label}
                          </div>
                        </div>

                        <div style={styles.timelineGrid}>
                          <div style={styles.timelineFieldCard}>
                            <div style={styles.timelineFieldHead}>
                              <div style={styles.timelineFieldLabel}>تاريخ التعميد</div>
                              <div style={styles.timelineStatusChip(advancedTimelineInfo.dateStatus.commissioning.tone)}>
                                {advancedTimelineInfo.dateStatus.commissioning.label}
                              </div>
                            </div>
                            <input
                              type="date"
                              value={commissioningDate}
                              onChange={(e) => setCommissioningDate(e.target.value)}
                              disabled={!canEditAdvancedExecution}
                              style={styles.input}
                            />
                            <div style={styles.timelineFieldHint}>
                              نقطة بداية التجهيز الرسمية للمشروع.
                            </div>
                          </div>

                          <div style={styles.timelineFieldCard}>
                            <div style={styles.timelineFieldHead}>
                              <div style={styles.timelineFieldLabel}>تاريخ بداية المشروع</div>
                              <div style={styles.timelineStatusChip(advancedTimelineInfo.dateStatus.projectStart.tone)}>
                                {advancedTimelineInfo.dateStatus.projectStart.label}
                              </div>
                            </div>
                            <input
                              type="date"
                              value={projectStartDate}
                              onChange={(e) => setProjectStartDate(e.target.value)}
                              disabled={!canEditAdvancedExecution}
                              style={styles.input}
                            />
                            <div style={styles.timelineFieldHint}>
                              اختياري. إذا تُرك فارغًا يعتمد تاريخ التعميد كبداية للمشروع.
                            </div>
                          </div>

                          <div style={styles.timelineFieldCard}>
                            <div style={styles.timelineFieldHead}>
                              <div style={styles.timelineFieldLabel}>بداية الفعالية</div>
                              <div style={styles.timelineStatusChip(advancedTimelineInfo.dateStatus.eventStart.tone)}>
                                {advancedTimelineInfo.dateStatus.eventStart.label}
                              </div>
                            </div>
                            <input
                              type="datetime-local"
                              value={startAt}
                              onChange={(e) => setStartAt(e.target.value)}
                              disabled={!canEditProjectCore}
                              style={styles.input}
                            />
                            <div style={styles.timelineFieldHint}>
                              يمكنك تعديلها من هنا لتحديث مدة التجهيز والتنفيذ.
                            </div>
                          </div>

                          <div style={styles.timelineFieldCard}>
                            <div style={styles.timelineFieldHead}>
                              <div style={styles.timelineFieldLabel}>نهاية الفعالية</div>
                              <div style={styles.timelineStatusChip(advancedTimelineInfo.dateStatus.eventEnd.tone)}>
                                {advancedTimelineInfo.dateStatus.eventEnd.label}
                              </div>
                            </div>
                            <input
                              type="datetime-local"
                              value={endAt}
                              onChange={(e) => setEndAt(e.target.value)}
                              disabled={!canEditProjectCore}
                              style={styles.input}
                            />
                            <div style={styles.timelineFieldHint}>
                              يجب أن تكون بعد وقت البداية لضمان صحة الجدول.
                            </div>
                          </div>
                        </div>

                        <div style={styles.timelineSummaryGrid}>
                          <div style={styles.timelineSummaryItem}>
                            <div style={styles.timelineSummaryLabel}>مدة التجهيز (تعميد ← بداية فعالية)</div>
                            <div style={styles.timelineSummaryValue(advancedTimelineInfo.prepFromCommissioning.tone)}>
                              {advancedTimelineInfo.prepFromCommissioning.label}
                            </div>
                          </div>
                          <div style={styles.timelineSummaryItem}>
                            <div style={styles.timelineSummaryLabel}>مدة التجهيز (بداية مشروع ← بداية فعالية)</div>
                            <div style={styles.timelineSummaryValue(advancedTimelineInfo.prepFromProjectStart.tone)}>
                              {advancedTimelineInfo.prepFromProjectStart.label}
                            </div>
                          </div>
                          <div style={styles.timelineSummaryItem}>
                            <div style={styles.timelineSummaryLabel}>مدة التنفيذ التشغيلي</div>
                            <div style={styles.timelineSummaryValue(advancedTimelineInfo.executionDuration.tone)}>
                              {advancedTimelineInfo.executionDuration.label}
                            </div>
                          </div>
                        </div>

                        {advancedTimelineInfo.issues.length > 0 ? (
                          <div style={styles.warnBox}>
                            <strong>تنبيه زمني:</strong>
                            <div style={styles.blockTop8}>
                              {advancedTimelineInfo.issues.map((issue, idx) => (
                                <div key={idx} style={styles.listItemGap4}>
                                  • {issue}
                                </div>
                              ))}
                            </div>
                          </div>
                        ) : null}
                      </div>
                    </div>

                    <div style={styles.blockTop12}>
                      <div style={styles.qCard}>
                        <div style={styles.scopeSectionTitle}>2.1 نطاق العمل</div>
                        <div style={styles.scopeSectionHint}>
                          حدّد مكونات النطاق لكل محور تشغيلي قبل الانتقال إلى جدول الكميات.
                        </div>

                        <div style={styles.scopeFieldsGrid}>
                          <div style={styles.scopeFieldCard}>
                            <div style={styles.scopeFieldTitle}>الموقع والتجهيزات</div>
                            <textarea
                              value={scopeSite}
                              onChange={(e) => setScopeSite(e.target.value)}
                              disabled={!canEditAdvancedExecution}
                              style={{ ...styles.textarea, ...styles.scopeTextarea }}
                              placeholder="اكتب نطاق الموقع والتجهيزات..."
                            />
                          </div>

                          <div style={styles.scopeFieldCard}>
                            <div style={styles.scopeFieldTitle}>التجهيزات الفنية</div>
                            <textarea
                              value={scopeTechnical}
                              onChange={(e) => setScopeTechnical(e.target.value)}
                              disabled={!canEditAdvancedExecution}
                              style={{ ...styles.textarea, ...styles.scopeTextarea }}
                              placeholder="اكتب نطاق التجهيزات الفنية..."
                            />
                          </div>

                          <div style={styles.scopeFieldCard}>
                            <div style={styles.scopeFieldTitle}>البرنامج التنفيذي</div>
                            <textarea
                              value={scopeProgram}
                              onChange={(e) => setScopeProgram(e.target.value)}
                              disabled={!canEditAdvancedExecution}
                              style={{ ...styles.textarea, ...styles.scopeTextarea }}
                              placeholder="اكتب نطاق البرنامج التنفيذي..."
                            />
                          </div>

                          <div style={styles.scopeFieldCard}>
                            <div style={styles.scopeFieldTitle}>المراسم والتوثيق</div>
                            <textarea
                              value={scopeCeremony}
                              onChange={(e) => setScopeCeremony(e.target.value)}
                              disabled={!canEditAdvancedExecution}
                              style={{ ...styles.textarea, ...styles.scopeTextarea }}
                              placeholder="اكتب نطاق المراسم والتوثيق..."
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    <div style={styles.blockTop12}>
                      <div style={styles.qCard}>
                        <div style={styles.scopeSectionTitle}>2.2 استراتيجية التنفيذ</div>
                        <div style={styles.scopeSectionHint}>
                          اكتب منهجية التنفيذ والتنسيق والتشغيل الميداني بشكل مباشر.
                        </div>

                        <div style={styles.scopeStrategyCard}>
                          <div style={styles.scopeStrategyTitle}>الخطة التشغيلية والتنفيذية</div>
                          <textarea
                            value={executionStrategy}
                            onChange={(e) => setExecutionStrategy(e.target.value)}
                            disabled={!canEditAdvancedExecution}
                            style={{ ...styles.textarea, ...styles.scopeStrategyTextarea }}
                            placeholder="اكتب الاستراتيجية التشغيلية والتنفيذية..."
                          />
                        </div>
                      </div>
                    </div>
                  </>
                ) : (
                  <div style={styles.blockTop12}>
                    <div style={styles.label}>2.8 الهيكل التشغيلي للكوادر</div>
                    <div style={styles.textMutedSmallTop8}>
                      فعّل الأدوار المطلوبة للمشروع وحدد اسم المسؤول لكل دور (اختياري).
                    </div>
                    <div style={styles.orgRolesGrid}>
                      {orgRoles.map((role) => (
                        <div key={role.id} style={styles.orgRoleCard(role.enabled)}>
                          <div style={styles.orgRoleHead}>
                            <div style={styles.orgRoleIdentity}>
                              <div style={styles.orgRoleTitle}>{role.title}</div>
                              <div style={styles.orgRoleSummary}>{role.summary}</div>
                            </div>
                            <button
                              type="button"
                              style={styles.orgRoleToggle(role.enabled)}
                              disabled={!canEditAdvancedExecution}
                              onClick={() =>
                                updateOrgRole(role.id, { enabled: !role.enabled })
                              }
                            >
                              {role.enabled ? "مفعّل" : "غير مفعّل"}
                            </button>
                          </div>

                          <div style={styles.blockTop8}>
                            <input
                              value={role.assignee}
                              onChange={(e) =>
                                updateOrgRole(role.id, { assignee: e.target.value })
                              }
                              style={styles.input}
                              disabled={!canEditAdvancedExecution || !role.enabled}
                              placeholder="اسم المسؤول (اختياري)"
                            />
                          </div>

                          <div style={styles.orgRoleMetaRow}>
                            <div style={styles.orgRoleMetaBox}>
                              <div style={styles.orgRoleMetaHead}>
                                <div style={styles.orgRoleMetaLabel}>عدد المهام</div>
                                <button
                                  type="button"
                                  style={styles.orgRoleInfoBtn}
                                  disabled={!canEditAdvancedExecution}
                                  onClick={() => toggleOrgRoleDetail(role.id, "tasks")}
                                  aria-expanded={orgRoleDetailsOpen[role.id] === "tasks"}
                                >
                                  ؟
                                </button>
                              </div>
                              <div style={styles.orgRoleMetaValue}>
                                {toArabicDigits(role.responsibilities.length)}
                              </div>
                            </div>
                            <div style={styles.orgRoleMetaBox}>
                              <div style={styles.orgRoleMetaHead}>
                                <div style={styles.orgRoleMetaLabel}>عدد KPIs</div>
                                <button
                                  type="button"
                                  style={styles.orgRoleInfoBtn}
                                  disabled={!canEditAdvancedExecution}
                                  onClick={() => toggleOrgRoleDetail(role.id, "kpis")}
                                  aria-expanded={orgRoleDetailsOpen[role.id] === "kpis"}
                                >
                                  ؟
                                </button>
                              </div>
                              <div style={styles.orgRoleMetaValue}>
                                {toArabicDigits(role.kpis.length)}
                              </div>
                            </div>
                          </div>

                          {orgRoleDetailsOpen[role.id] ? (
                            <div style={styles.orgRoleDetailsPanel}>
                              <div style={styles.orgRoleDetailsTitle}>
                                {orgRoleDetailsOpen[role.id] === "tasks"
                                  ? "المهام الكاملة"
                                  : "KPIs الكاملة"}
                              </div>
                              {(orgRoleDetailsOpen[role.id] === "tasks"
                                ? role.responsibilities
                                : role.kpis
                              ).map((item, idx) => (
                                <div key={idx} style={styles.orgRoleDetailsItem}>
                                  • {item}
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div style={styles.orgRoleMetaText}>
                              اضغط (؟) لعرض التفاصيل الكاملة.
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div style={styles.stackAfterSection}>
                  <button
                    style={styles.secondaryBtn(isProcessing())}
                    disabled={isProcessing() || !canEditAdvancedExecution}
                    onClick={fillAdvancedTestData}
                  >
                    تعبئة سريعة للاختبار
                  </button>
                  {advancedScopeStep === "scope" ? (
                    <button
                      style={styles.primaryBtn(isProcessing())}
                      disabled={isProcessing()}
                      onClick={() => setAdvancedScopeStep("org")}
                  >
                      التالي: الهيكل التشغيلي
                    </button>
                  ) : (
                    <button
                      style={styles.primaryBtn(isProcessing())}
                      disabled={isProcessing() || !canEditAdvancedExecution}
                      onClick={() => {
                        setAdvancedBoqStep("boq");
                        setStage("advanced_boq");
                      }}
                    >
                      التالي: التخطيط التشغيلي التفصيلي
                    </button>
                  )}
                  {advancedScopeStep === "org" ? (
                    <button
                      style={styles.secondaryBtn(isProcessing())}
                      disabled={isProcessing()}
                      onClick={() => setAdvancedScopeStep("scope")}
                    >
                      رجوع: النطاق والاستراتيجية
                    </button>
                  ) : null}
                  <button
                    style={styles.secondaryBtn(isProcessing())}
                    disabled={isProcessing()}
                    onClick={() => setStage("done")}
                  >
                    رجوع: التقرير والنتائج
                  </button>
                </div>
              </>
            )}

            {stage === "advanced_boq" && (
              <>
                <h3 style={styles.sectionHeading}>المرحلة 7: التخطيط التشغيلي التفصيلي</h3>
                <div style={styles.textMutedSmallTop8}>
                  أكمل جدول الكميات، ثم الجودة والمخاطر، ثم الجاهزية التشغيلية قبل توليد الخطة.
                </div>

                <div style={styles.blockTop12}>
                  <div style={styles.advancedScopeNavCard}>
                    <div style={styles.advancedBoqNavGrid}>
                      <button
                        type="button"
                        style={styles.selectorBtn(advancedBoqStep === "boq")}
                        disabled={isProcessing()}
                        onClick={() => setAdvancedBoqStep("boq")}
                      >
                        جدول الكميات
                      </button>
                      <button
                        type="button"
                        style={styles.selectorBtn(advancedBoqStep === "quality_risk")}
                        disabled={isProcessing()}
                        onClick={() => setAdvancedBoqStep("quality_risk")}
                      >
                        الجودة والمخاطر
                      </button>
                      <button
                        type="button"
                        style={styles.selectorBtn(advancedBoqStep === "operations")}
                        disabled={isProcessing()}
                        onClick={() => setAdvancedBoqStep("operations")}
                      >
                        التشغيل والجاهزية
                      </button>
                    </div>
                    <div style={styles.advancedScopeMetaRow}>
                      {advancedBoqStep === "boq" ? (
                        <>
                          <div style={styles.advancedScopeMetaChip("info")}>
                            الخطوة الحالية: {toArabicDigits(1)} من {toArabicDigits(3)}
                          </div>
                          <div
                            style={styles.advancedScopeMetaChip(
                              advancedBoqFilledCount > 0 ? "ok" : "info"
                            )}
                          >
                            بنود جدول الكميات المعبأة: {toArabicDigits(advancedBoqFilledCount)}/{toArabicDigits(advancedBoqTotalCount)}
                          </div>
                          <div style={styles.advancedScopeMetaText}>
                            أكمِل البنود الأساسية ثم انتقل إلى الجودة والمخاطر.
                          </div>
                        </>
                      ) : advancedBoqStep === "quality_risk" ? (
                        <>
                          <div style={styles.advancedScopeMetaChip("info")}>
                            الخطوة الحالية: {toArabicDigits(2)} من {toArabicDigits(3)}
                          </div>
                          <div
                            style={styles.advancedScopeMetaChip(
                              advancedQualityRiskCompletedCount === advancedQualityRiskTotalCount
                                ? "ok"
                                : "info"
                            )}
                          >
                            الجودة والمخاطر:{" "}
                            {toArabicDigits(advancedQualityRiskCompletedCount)}/{toArabicDigits(advancedQualityRiskTotalCount)}
                          </div>
                          <div style={styles.advancedScopeMetaText}>
                            حدّد معايير الجودة وسجل المخاطر قبل الإعداد التشغيلي النهائي.
                          </div>
                        </>
                      ) : (
                        <>
                          <div style={styles.advancedScopeMetaChip("info")}>
                            الخطوة الحالية: {toArabicDigits(3)} من {toArabicDigits(3)}
                          </div>
                          <div
                            style={styles.advancedScopeMetaChip(
                              advancedOpsCompletedCount === advancedOpsTotalCount ? "ok" : "info"
                            )}
                          >
                            جاهزية التشغيل: {toArabicDigits(advancedOpsCompletedCount)}/{toArabicDigits(advancedOpsTotalCount)}
                          </div>
                          <div style={styles.advancedScopeMetaText}>
                            راجع لوحة المخاطر وسرعة الاستجابة قبل توليد الخطة المتقدمة.
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {advancedBoqStep === "boq" ? (
                <div style={styles.blockTop12}>
                  <div style={styles.label}>2.3 جدول الكميات والمواصفات (نسخة مختصرة)</div>
                  <div style={styles.textMutedSmallTop8}>
                    خصص مسؤول لكل بند من الهيكل التشغيلي المفعّل لضبط الملكية التنفيذية.
                  </div>
                  {activeOrgRoles.length === 0 ? (
                    <div style={styles.warnBox}>
                      <strong>تنبيه:</strong> لا توجد أدوار مفعّلة حاليًا في الهيكل التشغيلي.
                      فعّل دورًا واحدًا على الأقل لتخصيص المسؤولين في جدول الكميات.
                    </div>
                  ) : null}
                  {boqDependencyIssues.length > 0 ? (
                    <div style={styles.warnBox}>
                      <strong>تنبيه:</strong> توجد تعارضات في تبعيات جدول الكميات ويجب تصحيحها قبل
                      توليد الخطة:
                      <div style={styles.blockTop8}>
                        {boqDependencyIssues.slice(0, 6).map((issue, idx) => (
                          <div key={idx} style={styles.listItemGap4}>
                            • {issue}
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null}
                  <div style={{ ...styles.qCard, marginTop: 0 }}>
                    {boqItems.map((row) => {
                      const assignedRole = row.ownerRoleId
                        ? orgRoles.find((role) => role.id === row.ownerRoleId)
                        : null;
                      const hasAssignedInactiveRole = !!assignedRole && !assignedRole.enabled;
                      const dependencyRow = row.dependsOnBoqId
                        ? boqItems.find((candidate) => candidate.id === row.dependsOnBoqId)
                        : null;
                      const dependencyRowIndex = dependencyRow
                        ? boqItems.findIndex((candidate) => candidate.id === dependencyRow.id)
                        : -1;
                      const hasInvalidDependency = !!row.dependsOnBoqId && !dependencyRow;
                      const hasIncompleteDependency =
                        !!dependencyRow && dependencyRow.item.trim().length === 0;
                      const isSelfDependency = row.dependsOnBoqId === row.id;
                      const financialRow = boqFinancialRowMap.get(row.id);
                      const suggestedUnitSellPrice = financialRow?.suggestedUnitSellPrice;
                      const hasSuggestedSell = typeof suggestedUnitSellPrice === "number";
                      const canApplySuggestedSell =
                        !!financialRow &&
                        hasSuggestedSell &&
                        (row.unitSellPrice.trim().length === 0 ||
                          Math.abs(financialRow.sellGapVsSuggested ?? 0) > 0.009);
                      return (
                      <div key={row.id} style={styles.blockTop12}>
                        <div style={styles.initFormGrid}>
                          <input
                            value={row.category}
                            onChange={(e) => updateBoqItem(row.id, { category: e.target.value })}
                            style={styles.input}
                            disabled={!canEditAdvancedExecution}
                            placeholder="التصنيف"
                          />
                          <input
                            value={row.item}
                            onChange={(e) => updateBoqItem(row.id, { item: e.target.value })}
                            style={styles.input}
                            disabled={!canEditAdvancedExecution}
                            placeholder="اسم البند"
                          />
                        </div>
                        <div style={styles.blockTop8}>
                          <textarea
                            value={row.spec}
                            onChange={(e) => updateBoqItem(row.id, { spec: e.target.value })}
                            style={styles.textarea}
                            disabled={!canEditAdvancedExecution}
                            placeholder="المواصفة الفنية المختصرة"
                          />
                        </div>
                        <div style={{ ...styles.initFormGrid, marginTop: 8 }}>
                          <input
                            value={row.unit}
                            onChange={(e) => updateBoqItem(row.id, { unit: e.target.value })}
                            style={styles.input}
                            disabled={!canEditAdvancedExecution}
                            placeholder="الوحدة"
                          />
                          <input
                            value={row.qty}
                            onChange={(e) => updateBoqItem(row.id, { qty: e.target.value })}
                            style={styles.input}
                            disabled={!canEditAdvancedExecution}
                            placeholder="الكمية"
                          />
                          <div style={styles.inputSuffixWrap}>
                            <input
                              value={row.unitCost}
                              onChange={(e) =>
                                updateBoqItem(row.id, { unitCost: e.target.value })
                              }
                              onBlur={() => {
                                if (row.unitSellPrice.trim().length > 0) {
                                  syncBoqTargetMarginFromManualSell(row.id);
                                }
                              }}
                              style={{ ...styles.input, paddingLeft: 44 }}
                              disabled={!canEditBoqPricing}
                              placeholder="سعر التكلفة للوحدة"
                            />
                            <span style={styles.inputSuffix}>{renderRiyalSuffix()}</span>
                          </div>
                          <div style={styles.inputSuffixWrap}>
                            <input
                              value={row.targetMarginPct}
                              onChange={(e) =>
                                updateBoqItem(row.id, { targetMarginPct: e.target.value })
                              }
                              style={{ ...styles.input, paddingLeft: 30 }}
                              disabled={!canEditBoqPricing}
                              placeholder="نسبة الربح المستهدفة ٪ (اختياري)"
                            />
                            <span style={styles.inputSuffix}>٪</span>
                          </div>
                          <div style={styles.inputSuffixWrap}>
                            <input
                              value={row.unitSellPrice}
                              onChange={(e) =>
                                updateBoqItem(row.id, { unitSellPrice: e.target.value })
                              }
                              onBlur={() => syncBoqTargetMarginFromManualSell(row.id)}
                              style={{ ...styles.input, paddingLeft: 44 }}
                              disabled={!canEditBoqPricing}
                              placeholder="سعر البيع للوحدة (يدوي)"
                            />
                            <span style={styles.inputSuffix}>{renderRiyalSuffix()}</span>
                          </div>
                          <select
                            value={row.source}
                            onChange={(e) =>
                              updateBoqItem(row.id, {
                                source:
                                  e.target.value === "أصل داخلي" ? "أصل داخلي" : "مورد",
                              })
                            }
                            style={styles.input}
                            disabled={!canEditAdvancedExecution}
                          >
                            <option value="مورد">مورد</option>
                            <option value="أصل داخلي">أصل داخلي</option>
                          </select>
                          <input
                            value={row.leadTimeDays}
                            onChange={(e) =>
                              updateBoqItem(row.id, { leadTimeDays: e.target.value })
                            }
                            style={styles.input}
                            disabled={!canEditAdvancedExecution}
                            placeholder="زمن التوريد (يوم)"
                          />
                          <select
                            value={row.ownerRoleId}
                            onChange={(e) =>
                              updateBoqItem(row.id, {
                                ownerRoleId: e.target.value as OrgRoleId | "",
                              })
                            }
                            style={styles.input}
                            disabled={!canEditAdvancedExecution}
                          >
                            <option value="">المسؤول (اختياري)</option>
                            {activeOrgRoles.map((role) => (
                              <option key={role.id} value={role.id}>
                                {orgRoleDisplay(role)}
                              </option>
                            ))}
                            {hasAssignedInactiveRole ? (
                              <option value={assignedRole.id}>
                                {orgRoleDisplay(assignedRole)} (غير مفعّل)
                              </option>
                            ) : null}
                          </select>
                        </div>
                        <div style={styles.textMutedSmallTop8}>
                          {(() => {
                            if (!financialRow) {
                              return "أدخل الكمية والتكلفة وسعر البيع أو نسبة الربح لحساب الربحية.";
                            }
                            const suggestedLine =
                              financialRow.suggestedUnitSellPrice !== null ? (
                                <>
                                  {" • "}البيع المقترح:{" "}
                                  {renderMoneyValue(financialRow.suggestedUnitSellPrice)}
                                </>
                              ) : null;
                            const modeLine = financialRow.usesSuggestedSellPrice
                              ? " • التسعير الحالي: مقترح تلقائي"
                              : row.unitSellPrice.trim().length > 0
                                ? " • التسعير الحالي: يدوي"
                                : "";
                            const gapLine =
                              financialRow.sellGapVsSuggested === null ? null : (
                                <>
                                  {" • "}فرق اليدوي عن المقترح:{" "}
                                  {renderMoneyValue(financialRow.sellGapVsSuggested)}
                                </>
                              );
                            return (
                              <>
                                التكلفة الإجمالية: {renderMoneyValue(financialRow.totalCost)}
                                {" • "}البيع الإجمالي: {renderMoneyValue(financialRow.totalSell)}
                                {" • "}الربح: {renderMoneyValue(financialRow.profit)}
                                {suggestedLine}
                                {modeLine}
                                {gapLine}
                              </>
                            );
                          })()}
                        </div>
                        {hasSuggestedSell ? (
                          <div style={styles.blockTop8}>
                            <button
                              type="button"
                              style={styles.compactGhostBtn}
                              onClick={() =>
                                updateBoqItem(row.id, {
                                  unitSellPrice: formatNumericForInput(suggestedUnitSellPrice ?? 0),
                                })
                              }
                              disabled={!canEditBoqPricing || !canApplySuggestedSell}
                            >
                              {row.unitSellPrice.trim().length > 0
                                ? "اعتماد البيع المقترح"
                                : "تثبيت البيع المقترح يدويًا"}
                            </button>
                          </div>
                        ) : null}
                        <div style={{ ...styles.initFormGrid, marginTop: 8 }}>
                          <select
                            value={row.dependsOnBoqId}
                            onChange={(e) =>
                              updateBoqItem(row.id, {
                                dependsOnBoqId: e.target.value,
                                dependencyType: "FS",
                              })
                            }
                            style={styles.input}
                            disabled={!canEditAdvancedExecution}
                          >
                            <option value="">يعتمد على بند (اختياري)</option>
                            {boqItems
                              .filter(
                                (candidate) =>
                                  candidate.id !== row.id && candidate.item.trim().length > 0
                              )
                              .map((candidate) => {
                                const candidateRowIndex = boqItems.findIndex(
                                  (lookup) => lookup.id === candidate.id
                                );
                                const safeCandidateIndex =
                                  candidateRowIndex >= 0 ? candidateRowIndex : 0;
                                return (
                                <option key={candidate.id} value={candidate.id}>
                                  {boqRowLabel(candidate, safeCandidateIndex)}
                                </option>
                                );
                              })}
                            {(hasInvalidDependency || hasIncompleteDependency || isSelfDependency) &&
                            row.dependsOnBoqId ? (
                              <option value={row.dependsOnBoqId}>
                                تبعية غير صالحة (راجع الاختيار)
                              </option>
                            ) : null}
                          </select>
                          <select
                            value={row.dependencyType}
                            onChange={(e) =>
                              updateBoqItem(row.id, {
                                dependencyType: e.target.value === "FS" ? "FS" : "FS",
                              })
                            }
                            style={styles.input}
                            disabled={!canEditAdvancedExecution}
                          >
                            <option value="FS">Finish-to-Start (FS)</option>
                          </select>
                        </div>
                        {dependencyRow ? (
                          <div style={styles.textMutedSmallTop8}>
                            هذا البند يبدأ بعد اكتمال:{" "}
                            <strong>{boqRowLabel(dependencyRow, Math.max(0, dependencyRowIndex))}</strong>
                          </div>
                        ) : null}
                        <div style={styles.blockTop8}>
                          <button
                            style={styles.ghostBtn}
                            onClick={() => removeBoqRow(row.id)}
                            disabled={boqItems.length <= 1 || !canEditAdvancedExecution}
                          >
                            حذف البند
                          </button>
                        </div>
                      </div>
                      );
                    })}

                    <div style={styles.blockTop12}>
                      <div style={styles.label}>ملخص مالي داخلي (جدول الكميات)</div>
                      <div style={styles.miniStatsGrid}>
                        <div style={styles.miniStat}>
                          <div style={styles.miniStatLabel}>إجمالي التكلفة</div>
                          <div style={styles.miniStatValue}>
                            {renderMoneyValue(boqFinancialSummary.totalCost)}
                          </div>
                        </div>
                        <div style={styles.miniStat}>
                          <div style={styles.miniStatLabel}>إجمالي البيع</div>
                          <div style={styles.miniStatValue}>
                            {renderMoneyValue(boqFinancialSummary.totalSell)}
                          </div>
                        </div>
                        <div style={styles.miniStat}>
                          <div style={styles.miniStatLabel}>صافي الربح/الخسارة</div>
                          <div
                            style={{
                              ...styles.miniStatValue,
                              color:
                                boqFinancialSummary.status === "رابح"
                                  ? "#00FF85"
                                  : boqFinancialSummary.status === "خاسر"
                                    ? "#FF7A45"
                                    : "rgba(255,255,255,0.95)",
                            }}
                          >
                            {renderMoneyValue(boqFinancialSummary.profit)}
                          </div>
                        </div>
                        <div style={styles.miniStat}>
                          <div style={styles.miniStatLabel}>حالة الربحية</div>
                          <div style={styles.miniStatValue}>{boqFinancialSummary.status}</div>
                        </div>
                      </div>
                      <div style={styles.textMutedSmallTop8}>
                        هامش الربح:{" "}
                        <strong>
                          {boqFinancialSummary.margin === null
                            ? "غير متاح"
                            : `${toArabicDigits(boqFinancialSummary.margin.toFixed(1))}%`}
                        </strong>
                        {" • "}
                        نقطة التعادل:{" "}
                        <strong>
                          {boqFinancialSummary.status === "تعادل"
                            ? "تم تحقيق التعادل"
                            : boqFinancialSummary.breakEvenGap >= 0 ? (
                              <>
                                فوق التعادل بـ {renderMoneyValue(boqFinancialSummary.breakEvenGap)}
                              </>
                            ) : (
                              <>
                                تحتاج{" "}
                                {renderMoneyValue(
                                  Math.abs(boqFinancialSummary.breakEvenGap)
                                )}{" "}
                                للوصول للتعادل
                              </>
                            )}
                        </strong>
                      </div>
                      <div style={styles.textMutedSmallTop8}>
                        مقارنة الميزانية:{" "}
                        <strong>
                          {boqFinancialSummary.budgetValue > 0
                            ? `استهلاك ${toArabicDigits(
                                (boqFinancialSummary.budgetUsagePercent ?? 0).toFixed(1)
                              )}% من الميزانية`
                            : "الميزانية غير محددة"}
                        </strong>
                      </div>
                      {boqFinancialSummary.budgetValue > 0 ? (
                        <div style={styles.textMutedSmallTop8}>
                          {boqFinancialSummary.budgetVariance !== null &&
                          boqFinancialSummary.budgetVariance >= 0 ? (
                            <>
                              متبقٍ من الميزانية:{" "}
                              {renderMoneyValue(boqFinancialSummary.budgetVariance)}
                            </>
                          ) : (
                            <>
                              تجاوز الميزانية بمقدار:{" "}
                              {renderMoneyValue(
                                Math.abs(boqFinancialSummary.budgetVariance ?? 0)
                              )}
                            </>
                          )}
                        </div>
                      ) : null}
                    </div>

                    <div style={styles.blockTop12}>
                      <button
                        style={styles.secondaryBtn(isProcessing() || !canEditAdvancedExecution)}
                        disabled={isProcessing() || !canEditAdvancedExecution}
                        onClick={addBoqRow}
                      >
                        إضافة بند في جدول الكميات
                      </button>
                    </div>
                  </div>
                </div>

                ) : null}

                {advancedBoqStep === "quality_risk" ? (
                  <>
                    <div style={styles.blockTop12}>
                      <div style={styles.qCard}>
                        <div style={styles.scopeSectionTitle}>2.5 معايير الجودة</div>
                        <div style={styles.scopeSectionHint}>
                          اكتب معايير الجودة وآلية التحقق الميداني والاعتماد قبل التنفيذ.
                        </div>
                        <textarea
                          value={qualityStandards}
                          onChange={(e) => setQualityStandards(e.target.value)}
                          style={{ ...styles.textarea, ...styles.scopeStrategyTextarea }}
                          disabled={!canEditAdvancedExecution}
                          placeholder="اكتب معايير الجودة وآلية التحقق..."
                        />
                      </div>
                    </div>

                    <div style={styles.blockTop12}>
                      <div style={styles.qCard}>
                        <div style={styles.scopeSectionTitle}>2.6 إدارة المخاطر</div>
                        <div style={styles.scopeSectionHint}>
                          وثّق المخاطر الرئيسية وخطط الاستجابة قبل بناء لوحة المخاطر الحية.
                        </div>
                        <textarea
                          value={riskManagement}
                          onChange={(e) => setRiskManagement(e.target.value)}
                          style={{ ...styles.textarea, ...styles.scopeStrategyTextarea }}
                          disabled={!canEditAdvancedExecution}
                          placeholder="اكتب سجل المخاطر المختصر وخطط المعالجة..."
                        />
                      </div>
                    </div>
                  </>
                ) : null}

                {advancedBoqStep === "operations" ? (
                  <>

                <div style={styles.blockTop12}>
                  <div style={styles.qCard}>
                    <div style={styles.riskBoardHead}>
                      <div style={styles.qTitle}>لوحة المخاطر الحية</div>
                      <div style={styles.riskBoardBadge}>
                        مخاطر حرجة: {toArabicDigits(liveRiskStats.critical)}
                      </div>
                    </div>

                    <div style={styles.riskBoardStatsGrid}>
                      <div style={styles.riskBoardStat}>
                        <div style={styles.riskBoardStatLabel}>إجمالي</div>
                        <div style={styles.riskBoardStatValue}>
                          {toArabicDigits(liveRiskStats.total)}
                        </div>
                      </div>
                      <div style={styles.riskBoardStat}>
                        <div style={styles.riskBoardStatLabel}>نشطة</div>
                        <div style={styles.riskBoardStatValue}>
                          {toArabicDigits(liveRiskStats.active)}
                        </div>
                      </div>
                      <div style={styles.riskBoardStat}>
                        <div style={styles.riskBoardStatLabel}>مصعّدة</div>
                        <div style={styles.riskBoardStatValue}>
                          {toArabicDigits(liveRiskStats.escalated)}
                        </div>
                      </div>
                      <div style={styles.riskBoardStat}>
                        <div style={styles.riskBoardStatLabel}>مغلقة</div>
                        <div style={styles.riskBoardStatValue}>
                          {toArabicDigits(liveRiskStats.closed)}
                        </div>
                      </div>
                      <div style={styles.riskBoardStat}>
                        <div style={styles.riskBoardStatLabel}>متأخرة مراجعة</div>
                        <div style={styles.riskBoardStatValue}>
                          {toArabicDigits(liveRiskStats.overdue)}
                        </div>
                      </div>
                    </div>

                    <div style={styles.riskLegendRow}>
                      <div style={styles.riskLegendItem}>
                        <span style={styles.riskLegendDot("low")} />
                        منخفض (1-2)
                      </div>
                      <div style={styles.riskLegendItem}>
                        <span style={styles.riskLegendDot("medium")} />
                        متوسط (3-4)
                      </div>
                      <div style={styles.riskLegendItem}>
                        <span style={styles.riskLegendDot("high")} />
                        عالي (6)
                      </div>
                      <div style={styles.riskLegendItem}>
                        <span style={styles.riskLegendDot("critical")} />
                        حرج (9)
                      </div>
                    </div>

                    <div style={styles.stackAfterBlock}>
                      <button
                        style={styles.secondaryBtn(isProcessing() || !canEditAdvancedExecution)}
                        disabled={isProcessing() || !canEditAdvancedExecution}
                        onClick={generateLiveRisksFromText}
                      >
                        توليد بنود مخاطر من النص
                      </button>
                      <button
                        style={styles.secondaryBtn(isProcessing() || !canEditAdvancedExecution)}
                        disabled={isProcessing() || !canEditAdvancedExecution}
                        onClick={addLiveRiskItem}
                      >
                        إضافة خطر يدوي
                      </button>
                    </div>

                    {liveRiskItems.length === 0 ? (
                      <div style={styles.textMutedSmall}>
                        لا توجد مخاطر في اللوحة. ابدأ بالتوليد من نص المخاطر أو الإضافة اليدوية.
                      </div>
                    ) : (
                      liveRiskItems.map((risk, idx) => {
                        const score = riskLevelScore(risk.probability) * riskLevelScore(risk.impact);
                        const severity = riskSeverityFromScore(score);
                        return (
                          <div key={risk.id} style={styles.riskCard(severity, risk.status)}>
                            <div style={styles.riskCardHead}>
                              <div style={styles.riskCardTitle}>
                                {toArabicDigits(idx + 1)}. {risk.title || "خطر بدون عنوان"}
                              </div>
                              <div style={styles.riskSeverityBadge(severity)}>
                                شدة: {riskSeverityLabel(severity)} ({toArabicDigits(score)}/9)
                              </div>
                            </div>
                            <div style={styles.riskCardMeta}>
                              <span style={styles.riskStatusBadge(risk.status)}>
                                الحالة: {risk.status}
                              </span>
                            </div>

                            <div style={styles.actionTaskGrid}>
                              <div>
                                <div style={styles.label}>عنوان الخطر</div>
                                <input
                                  value={risk.title}
                                  onChange={(e) =>
                                    updateLiveRiskItem(risk.id, { title: e.target.value })
                                  }
                                  style={styles.input}
                                  disabled={!canEditAdvancedExecution}
                                  placeholder="اكتب عنوان الخطر"
                                />
                              </div>
                              <div>
                                <div style={styles.label}>الاحتمال</div>
                                <select
                                  value={risk.probability}
                                  onChange={(e) =>
                                    updateLiveRiskItem(risk.id, {
                                      probability: e.target.value as RiskLevel,
                                    })
                                  }
                                  style={{ ...styles.input, ...styles.riskLevelSelect(risk.probability) }}
                                  disabled={!canEditAdvancedExecution}
                                >
                                  <option value="منخفض">منخفض</option>
                                  <option value="متوسط">متوسط</option>
                                  <option value="مرتفع">مرتفع</option>
                                </select>
                              </div>
                              <div>
                                <div style={styles.label}>الأثر</div>
                                <select
                                  value={risk.impact}
                                  onChange={(e) =>
                                    updateLiveRiskItem(risk.id, {
                                      impact: e.target.value as RiskLevel,
                                    })
                                  }
                                  style={{ ...styles.input, ...styles.riskLevelSelect(risk.impact) }}
                                  disabled={!canEditAdvancedExecution}
                                >
                                  <option value="منخفض">منخفض</option>
                                  <option value="متوسط">متوسط</option>
                                  <option value="مرتفع">مرتفع</option>
                                </select>
                              </div>
                            </div>

                            <div style={{ ...styles.actionTaskGrid, marginTop: 8 }}>
                              <div>
                                <div style={styles.label}>الحالة</div>
                                <select
                                  value={risk.status}
                                  onChange={(e) =>
                                    updateLiveRiskItem(risk.id, {
                                      status: e.target.value as RiskStatus,
                                    })
                                  }
                                  style={{ ...styles.input, ...styles.riskStatusSelect(risk.status) }}
                                  disabled={!canEditAdvancedExecution}
                                >
                                  <option value="مفتوح">مفتوح</option>
                                  <option value="قيد المعالجة">قيد المعالجة</option>
                                  <option value="مصعّد">مصعّد</option>
                                  <option value="مغلق">مغلق</option>
                                </select>
                              </div>
                              <div>
                                <div style={styles.label}>مالك الخطر</div>
                                <input
                                  value={risk.owner}
                                  onChange={(e) =>
                                    updateLiveRiskItem(risk.id, { owner: e.target.value })
                                  }
                                  style={styles.input}
                                  disabled={!canEditAdvancedExecution}
                                  placeholder="اسم المالك"
                                />
                              </div>
                              <div>
                                <div style={styles.label}>تاريخ المراجعة</div>
                                <input
                                  type="date"
                                  value={risk.reviewDate}
                                  onChange={(e) =>
                                    updateLiveRiskItem(risk.id, { reviewDate: e.target.value })
                                  }
                                  style={styles.input}
                                  disabled={!canEditAdvancedExecution}
                                />
                              </div>
                            </div>

                            <div style={styles.blockTop8}>
                              <div style={styles.label}>خطة المعالجة</div>
                              <textarea
                                value={risk.mitigation}
                                onChange={(e) =>
                                  updateLiveRiskItem(risk.id, { mitigation: e.target.value })
                                }
                                style={{ ...styles.textarea, ...styles.actionTaskNotes }}
                                disabled={!canEditAdvancedExecution}
                                placeholder="اكتب إجراء المعالجة وخطة الاستجابة..."
                              />
                            </div>

                            <div style={styles.blockTop8}>
                              <button
                                style={styles.ghostBtn}
                                onClick={() => removeLiveRiskItem(risk.id)}
                                disabled={!canEditAdvancedExecution}
                              >
                                حذف الخطر
                              </button>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>

                <div style={styles.blockTop12}>
                  <div style={styles.label}>2.7 سرعة الاستجابة (SLA)</div>
                  <textarea
                    value={responseSla}
                    onChange={(e) => setResponseSla(e.target.value)}
                    style={styles.textarea}
                    disabled={!canEditAdvancedExecution}
                    placeholder="اكتب أزمنة الاستجابة التشغيلية والفنية..."
                  />
                </div>

                <div style={styles.blockTop12}>
                  <div style={styles.label}>مدة الإزالة/الإقفال (بالساعات)</div>
                  <input
                    value={closureRemovalHours}
                    onChange={(e) => setClosureRemovalHours(normalizeDigitsToEnglish(e.target.value))}
                    style={styles.input}
                    disabled={!canEditAdvancedExecution}
                    placeholder="مثال: 6"
                  />
                </div>

                {!canBuildAdvancedPlan ? (
                  <div style={styles.warnBox}>
                    <strong>تنبيه:</strong> الحقول الناقصة قبل توليد الخطة:
                    <div style={styles.blockTop8}>
                      {advancedMissingFields.map((x, idx) => (
                        <div key={idx} style={styles.listItemGap4}>
                          • {x}
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}

                <div style={styles.stackAfterSection}>
                  <button
                    style={styles.primaryBtn(
                      !canBuildAdvancedPlan || isProcessing() || !canEditAdvancedExecution
                    )}
                    disabled={!canBuildAdvancedPlan || isProcessing() || !canEditAdvancedExecution}
                    title={
                      !canEditAdvancedExecution
                        ? permissionHintText(
                            "توليد خطة التنفيذ المتقدمة",
                            ["project_manager", "operations_manager"],
                            userRole
                          )
                        : undefined
                    }
                    onClick={buildAdvancedPlan}
                  >
                    توليد خطة التنفيذ المتقدمة
                  </button>
                  <button
                    style={styles.secondaryBtn(isProcessing())}
                    disabled={isProcessing()}
                    onClick={() => setAdvancedBoqStep("quality_risk")}
                  >
                    رجوع: الجودة والمخاطر
                  </button>
                  <button
                    style={styles.secondaryBtn(isProcessing())}
                    disabled={isProcessing()}
                    onClick={() => {
                      setAdvancedScopeStep("org");
                      setStage("advanced_scope");
                    }}
                  >
                    رجوع: الهيكل التشغيلي
                  </button>
                </div>
                </>
                ) : null}

                {advancedBoqStep === "boq" ? (
                  <div style={styles.stackAfterSection}>
                    <button
                      style={styles.primaryBtn(isProcessing())}
                      disabled={isProcessing()}
                      onClick={() => setAdvancedBoqStep("quality_risk")}
                    >
                      التالي: الجودة والمخاطر
                    </button>
                    <button
                      style={styles.secondaryBtn(isProcessing())}
                      disabled={isProcessing()}
                      onClick={() => {
                        setAdvancedScopeStep("org");
                        setStage("advanced_scope");
                      }}
                    >
                      رجوع: الهيكل التشغيلي
                    </button>
                  </div>
                ) : null}

                {advancedBoqStep === "quality_risk" ? (
                  <div style={styles.stackAfterSection}>
                    <button
                      style={styles.primaryBtn(isProcessing())}
                      disabled={isProcessing()}
                      onClick={() => setAdvancedBoqStep("operations")}
                    >
                      التالي: التشغيل والجاهزية
                    </button>
                    <button
                      style={styles.secondaryBtn(isProcessing())}
                      disabled={isProcessing()}
                      onClick={() => setAdvancedBoqStep("boq")}
                    >
                      رجوع: جدول الكميات
                    </button>
                    <button
                      style={styles.secondaryBtn(isProcessing())}
                      disabled={isProcessing()}
                      onClick={() => {
                        setAdvancedScopeStep("org");
                        setStage("advanced_scope");
                      }}
                    >
                      رجوع: الهيكل التشغيلي
                    </button>
                  </div>
                ) : null}
              </>
            )}

            {stage === "advanced_plan" && (
              <>
                <h3 style={styles.sectionHeading}>المرحلة 8: خطة التنفيذ المتقدمة</h3>

                <div style={styles.blockTop12}>
                  <div style={styles.qCard}>
                    <div style={styles.qTitle}>خطة العمل المتكاملة</div>
                    <textarea
                      readOnly
                      value={advancedPlanText}
                      style={{ ...styles.textarea, ...styles.reportTextarea }}
                      placeholder="سيظهر هنا ملخص الخطة المتقدمة..."
                    />
                  </div>
                </div>

                <div style={styles.blockTop12}>
                  <div style={styles.qCard}>
                    <div style={styles.actionTrackerHead}>
                      <div style={styles.qTitle}>متابعة التنفيذ (Action Tracker)</div>
                      <div style={styles.actionTrackerBadge}>
                        نسبة الإنجاز: {toArabicDigits(actionTrackerProgress)}%
                      </div>
                    </div>

                    <div style={styles.actionTrackerStatsGrid}>
                      <div style={styles.actionTrackerStat}>
                        <div style={styles.actionTrackerStatLabel}>إجمالي المهام</div>
                        <div style={styles.actionTrackerStatValue}>
                          {toArabicDigits(actionTrackerStats.total)}
                        </div>
                      </div>
                      <div style={styles.actionTrackerStat}>
                        <div style={styles.actionTrackerStatLabel}>لم تبدأ</div>
                        <div style={styles.actionTrackerStatValue}>
                          {toArabicDigits(actionTrackerStats.notStarted)}
                        </div>
                      </div>
                      <div style={styles.actionTrackerStat}>
                        <div style={styles.actionTrackerStatLabel}>جاري</div>
                        <div style={styles.actionTrackerStatValue}>
                          {toArabicDigits(actionTrackerStats.inProgress)}
                        </div>
                      </div>
                      <div style={styles.actionTrackerStat}>
                        <div style={styles.actionTrackerStatLabel}>مكتمل / متعثر</div>
                        <div style={styles.actionTrackerStatValue}>
                          {toArabicDigits(actionTrackerStats.done)}
                          {" / "}
                          {toArabicDigits(actionTrackerStats.blocked)}
                        </div>
                      </div>
                    </div>

                    {actionTrackerItems.length === 0 ? (
                      <div style={styles.textMutedSmall}>
                        لا توجد مهام متابعة حتى الآن. اضغط «توليد خطة التنفيذ المتقدمة» من
                        المرحلة السابقة لإنشاء قائمة التنفيذ.
                      </div>
                    ) : (
                      actionTrackerItems.map((item, idx) => (
                        <div key={item.id} style={styles.actionTaskCard(item.status)}>
                          <div style={styles.actionTaskHead}>
                            <div style={styles.actionTaskTitle}>
                              {toArabicDigits(idx + 1)}. {item.task}
                            </div>
                            <div style={styles.actionTaskMeta}>
                              {item.phase} • {item.stream}
                            </div>
                          </div>

                          <div style={styles.actionTaskGrid}>
                            <div>
                              <div style={styles.label}>الحالة</div>
                              <select
                                value={item.status}
                                onChange={(e) =>
                                  updateActionTrackerItem(item.id, {
                                    status: e.target.value as ActionTaskStatus,
                                  })
                                }
                                style={styles.input}
                                disabled={!canEditAdvancedExecution}
                              >
                                <option value="لم تبدأ">لم تبدأ</option>
                                <option value="جاري">جاري</option>
                                <option value="مكتمل">مكتمل</option>
                                <option value="متعثر">متعثر</option>
                              </select>
                            </div>
                            <div>
                              <div style={styles.label}>المسؤول</div>
                              <input
                                value={item.owner}
                                onChange={(e) =>
                                  updateActionTrackerItem(item.id, { owner: e.target.value })
                                }
                                style={styles.input}
                                disabled={!canEditAdvancedExecution}
                                placeholder="اسم المسؤول"
                              />
                            </div>
                            <div>
                              <div style={styles.label}>تاريخ الاستحقاق</div>
                              <input
                                type="date"
                                value={item.dueDate}
                                onChange={(e) =>
                                  updateActionTrackerItem(item.id, { dueDate: e.target.value })
                                }
                                style={styles.input}
                                disabled={!canEditAdvancedExecution}
                              />
                            </div>
                          </div>

                          <div style={styles.blockTop8}>
                            <div style={styles.label}>ملاحظات تنفيذية</div>
                            <textarea
                              value={item.notes}
                              onChange={(e) =>
                                updateActionTrackerItem(item.id, { notes: e.target.value })
                              }
                              style={{ ...styles.textarea, ...styles.actionTaskNotes }}
                              disabled={!canEditAdvancedExecution}
                              placeholder="اكتب تحديث الحالة أو سبب التعثر أو الإجراء المطلوب..."
                            />
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                <div style={styles.blockTop12}>
                  <div style={styles.qCard}>
                    <div style={styles.actionTrackerHead}>
                      <div style={styles.qTitle}>حوكمة النسخة (Freeze + Change Request)</div>
                      <div
                        style={styles.governanceBadge(
                          !hasFrozenBaseline
                            ? "idle"
                            : hasChangesAfterFreeze
                              ? "changed"
                              : "frozen"
                        )}
                      >
                        {!hasFrozenBaseline
                          ? "غير مجمّدة"
                          : hasChangesAfterFreeze
                            ? "مجمّدة مع تعديلات"
                            : "مجمّدة بدون تعديلات"}
                      </div>
                    </div>

                    <div style={styles.textMutedSmallTop8}>
                      {hasFrozenBaseline
                        ? `آخر تجميد: ${formatDateTimeLabel(baselineFreeze.frozenAt)}`
                        : "جمّد النسخة بعد مراجعة الخطة، ثم استخدم طلبات التغيير لأي تعديل لاحق."}
                    </div>

                    <div style={styles.governanceGrid}>
                      <div style={styles.governanceStat}>
                        <div style={styles.governanceStatLabel}>طلبات مفتوحة</div>
                        <div style={styles.governanceStatValue}>
                          {toArabicDigits(openChangeRequests)}
                        </div>
                      </div>
                      <div style={styles.governanceStat}>
                        <div style={styles.governanceStatLabel}>طلبات معتمدة</div>
                        <div style={styles.governanceStatValue}>
                          {toArabicDigits(approvedChangeRequests)}
                        </div>
                      </div>
                      <div style={styles.governanceStat}>
                        <div style={styles.governanceStatLabel}>طلبات مرفوضة</div>
                        <div style={styles.governanceStatValue}>
                          {toArabicDigits(rejectedChangeRequests)}
                        </div>
                      </div>
                    </div>

                    {hasFrozenBaseline && hasChangesAfterFreeze && openChangeRequests === 0 ? (
                      <div style={styles.warnBox}>
                        <strong>تنبيه:</strong> تم تعديل البيانات بعد التجميد. أنشئ طلب تغيير
                        قبل اعتماد نسخة جديدة.
                      </div>
                    ) : null}

                    <div style={styles.blockTop12}>
                      <button
                        style={styles.secondaryBtn(isProcessing() || !canEditGovernance)}
                        disabled={isProcessing() || !advancedPlanText.trim() || !canEditGovernance}
                        title={
                          !canEditGovernance
                            ? permissionHintText(
                                "تجميد النسخة",
                                ["project_manager", "finance_manager"],
                                userRole
                              )
                            : undefined
                        }
                        onClick={freezeCurrentBaseline}
                      >
                        {hasFrozenBaseline ? "تجميد نسخة جديدة" : "تجميد النسخة الحالية"}
                      </button>
                    </div>

                    {hasFrozenBaseline ? (
                      <>
                        <div style={styles.blockTop12}>
                          <div style={styles.label}>عنوان طلب التغيير</div>
                          <input
                            value={crTitle}
                            onChange={(e) => setCrTitle(e.target.value)}
                            style={styles.input}
                            disabled={!canEditGovernance}
                            placeholder="مثال: تعديل جدول التوريد الفني"
                          />
                        </div>

                        <div style={styles.blockTop8}>
                          <div style={styles.label}>مقدّم الطلب</div>
                          <input
                            value={crRequestedBy}
                            onChange={(e) => setCrRequestedBy(e.target.value)}
                            style={styles.input}
                            disabled={!canEditGovernance}
                            placeholder="اسم مقدم الطلب"
                          />
                        </div>

                        <div style={styles.blockTop8}>
                          <div style={styles.label}>سبب طلب التغيير</div>
                          <textarea
                            value={crReason}
                            onChange={(e) => setCrReason(e.target.value)}
                            style={styles.textarea}
                            disabled={!canEditGovernance}
                            placeholder="اكتب سبب التغيير والأثر المتوقع..."
                          />
                        </div>

                        <div style={{ ...styles.actionTaskGrid, marginTop: 8 }}>
                          <div>
                            <div style={styles.label}>أثر الوقت</div>
                            <select
                              value={crImpactTime}
                              onChange={(e) => setCrImpactTime(e.target.value)}
                              style={styles.input}
                              disabled={!canEditGovernance}
                            >
                              <option value="منخفض">منخفض</option>
                              <option value="متوسط">متوسط</option>
                              <option value="مرتفع">مرتفع</option>
                            </select>
                          </div>
                          <div>
                            <div style={styles.label}>أثر التكلفة</div>
                            <select
                              value={crImpactCost}
                              onChange={(e) => setCrImpactCost(e.target.value)}
                              style={styles.input}
                              disabled={!canEditGovernance}
                            >
                              <option value="منخفض">منخفض</option>
                              <option value="متوسط">متوسط</option>
                              <option value="مرتفع">مرتفع</option>
                            </select>
                          </div>
                          <div>
                            <div style={styles.label}>أثر النطاق</div>
                            <select
                              value={crImpactScope}
                              onChange={(e) => setCrImpactScope(e.target.value)}
                              style={styles.input}
                              disabled={!canEditGovernance}
                            >
                              <option value="منخفض">منخفض</option>
                              <option value="متوسط">متوسط</option>
                              <option value="مرتفع">مرتفع</option>
                            </select>
                          </div>
                        </div>

                        <div style={styles.blockTop12}>
                          <button
                            style={styles.primaryBtn(isProcessing() || !canEditGovernance)}
                            disabled={isProcessing() || !canEditGovernance}
                            title={
                              !canEditGovernance
                                ? permissionHintText(
                                    "إنشاء طلب تغيير",
                                    ["project_manager", "finance_manager"],
                                    userRole
                                  )
                                : undefined
                            }
                            onClick={createChangeRequest}
                          >
                            إنشاء طلب تغيير
                          </button>
                        </div>

                        {changeRequests.length > 0 ? (
                          <div style={styles.blockTop12}>
                            <div style={styles.label}>سجل طلبات التغيير</div>
                            {changeRequests.slice(0, 6).map((request) => (
                              <div key={request.id} style={styles.crCard(request.status)}>
                                <div style={styles.crTitle}>{request.title}</div>
                                <div style={styles.crMeta}>
                                  {request.reason}
                                  <br />
                                  مقدم الطلب: {request.requestedBy} • التاريخ:{" "}
                                  {formatDateTimeLabel(request.createdAt)}
                                  <br />
                                  الأثر (وقت/تكلفة/نطاق): {request.impactTime} /{" "}
                                  {request.impactCost} / {request.impactScope}
                                </div>
                                <div style={styles.blockTop8}>
                                  <div style={styles.label}>حالة الطلب</div>
                                  <select
                                    value={request.status}
                                    onChange={(e) =>
                                      updateChangeRequest(request.id, {
                                        status: e.target.value as ChangeRequestStatus,
                                      })
                                    }
                                    style={styles.input}
                                    disabled={!canEditGovernance}
                                  >
                                    <option value="مفتوح">مفتوح</option>
                                    <option value="معتمد">معتمد</option>
                                    <option value="مرفوض">مرفوض</option>
                                  </select>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : null}
                      </>
                    ) : null}
                  </div>
                </div>

                <div style={styles.blockTop12}>
                  <div style={styles.qCard}>
                    <div style={styles.actionTrackerHead}>
                      <div style={styles.qTitle}>حزمة مخرجات التنفيذ الجاهزة للطباعة</div>
                      <button
                        style={styles.secondaryBtn(
                          isProcessing() ||
                            (!canEditAdvancedExecution && !canEditGovernance)
                        )}
                        disabled={
                          isProcessing() || (!canEditAdvancedExecution && !canEditGovernance)
                        }
                        onClick={() => refreshExecutionOutputPack()}
                      >
                        تحديث حزمة المخرجات
                      </button>
                    </div>
                    <div style={styles.textMutedSmallTop8}>
                      يمكنك نسخ المخرجات مباشرة أو فتح نافذة الطباعة وتحويلها إلى PDF.
                    </div>

                    <div style={styles.outputPackRow}>
                      <div style={styles.outputPackCard}>
                        <div style={styles.outputPackTitle}>نسخة الإدارة المختصرة</div>
                        <div style={styles.outputPackActions}>
                          <button
                            style={styles.ghostBtn}
                            onClick={() =>
                              copyOutputText(
                                managementBriefText,
                                "تم نسخ نسخة الإدارة المختصرة."
                              )
                            }
                          >
                            نسخ
                          </button>
                          <button
                            style={styles.ghostBtn}
                            onClick={() =>
                              printOutputDocument("نسخة الإدارة المختصرة", managementBriefText)
                            }
                          >
                            طباعة / PDF
                          </button>
                        </div>
                        <textarea
                          readOnly
                          value={managementBriefText}
                          style={{ ...styles.textarea, ...styles.outputPackTextarea }}
                          placeholder="اضغط تحديث حزمة المخرجات لتوليد نسخة الإدارة."
                        />
                      </div>

                      <div style={styles.outputPackCard}>
                        <div style={styles.outputPackTitle}>نسخة التشغيل الميداني (Checklist)</div>
                        <div style={styles.outputPackActions}>
                          <button
                            style={styles.ghostBtn}
                            onClick={() =>
                              copyOutputText(
                                fieldChecklistText,
                                "تم نسخ نسخة التشغيل الميداني."
                              )
                            }
                          >
                            نسخ
                          </button>
                          <button
                            style={styles.ghostBtn}
                            onClick={() =>
                              printOutputDocument("نسخة التشغيل الميداني", fieldChecklistText)
                            }
                          >
                            طباعة / PDF
                          </button>
                        </div>
                        <textarea
                          readOnly
                          value={fieldChecklistText}
                          style={{ ...styles.textarea, ...styles.outputPackTextarea }}
                          placeholder="اضغط تحديث حزمة المخرجات لتوليد نسخة التشغيل الميداني."
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div style={styles.blockTop12}>
                  <label style={styles.radioLabel}>
                    <input
                      type="checkbox"
                      checked={advancedApproved}
                      onChange={(e) => setAdvancedApproved(e.target.checked)}
                      disabled={!canApproveAdvancedPlan}
                    />
                    اعتماد نهائي للخطة (V1)
                  </label>
                </div>

                <div style={styles.stackAfterSection}>
                  <button
                    style={styles.primaryBtn(isProcessing() || !canApproveAdvancedPlan)}
                    disabled={isProcessing() || !canApproveAdvancedPlan}
                    title={
                      !canApproveAdvancedPlan
                        ? permissionHintText("اعتماد الخطة", ["project_manager"], userRole)
                        : undefined
                    }
                    onClick={() =>
                      showSuccess(
                        advancedApproved
                          ? "تم اعتماد الخطة المتقدمة بنجاح."
                          : "يمكنك اعتماد الخطة عند الجاهزية."
                      )
                    }
                  >
                    حفظ واعتماد
                  </button>
                  <button
                    style={styles.secondaryBtn(isProcessing())}
                    disabled={isProcessing()}
                    onClick={() => {
                      setAdvancedBoqStep("operations");
                      setStage("advanced_boq");
                    }}
                  >
                    رجوع: جدول الكميات والجودة والمخاطر
                  </button>
                </div>
              </>
            )}
          </section>

          {/* Side Summary */}
          <aside style={styles.sidePanel}>
            {stage === "init" && initStep === "session" ? (
              <>
                <h3 style={styles.cardTitle}>خطوة البداية</h3>
                <p style={styles.muted}>
                  اختر نوع الجلسة والمستشارين المشاركين أولًا، ثم انتقل إلى تفاصيل المشروع.
                </p>

                <div style={styles.sideSectionTitle}>تجهيز الجلسة</div>
                <div style={styles.sideBlock}>
                  <div style={styles.sideBlockTitle}>ما الذي ستحدده هنا؟</div>
                  <div style={styles.sideAlertItem("info")}>
                    نوع الجلسة: سريعة أو معمّقة
                  </div>
                  <div style={styles.sideAlertItem("info")}>
                    المستشارون المشاركون في الجلسة
                  </div>
                </div>

                <div style={styles.sideBlock}>
                  <div style={styles.sideBlockTitle}>اختيارك الحالي</div>
                  <div style={styles.textPrimarySmall}>
                    نوع الجلسة: <strong>{mode}</strong>
                  </div>
                  <div style={{ ...styles.textPrimarySmall, ...styles.blockTop8 }}>
                    مسار التنفيذ:{" "}
                    <strong>{deliveryTrack === "advanced" ? "متقدم" : "سريع"}</strong>
                  </div>
                  <div style={{ ...styles.textPrimarySmall, ...styles.blockTop8 }}>
                    المستشارون:{" "}
                    <strong>{selectedAdvisorsSummary()}</strong>
                  </div>
                </div>
              </>
            ) : (
	              <>
	                <h3 style={styles.cardTitle}>ملخص الجلسة</h3>
	                <p style={styles.muted}>لوحة حالة مختصرة تتغير حسب المرحلة الحالية.</p>

            <div style={styles.sideSectionTitle}>التحكم والصلاحيات</div>
            <div style={styles.sideBlock}>
              <div style={styles.sideBlockTitle}>الصلاحية الحالية</div>
              <div style={styles.sideSummaryPrimaryText}>{userRoleLabel(userRole)}</div>
              <div style={styles.textTertiarySmall}>
                {userRole === "viewer"
                  ? "عرض فقط بدون تعديل."
                  : userRole === "finance_manager"
                    ? "يمكنك تعديل الميزانية وتسعير جدول الكميات والحوكمة."
                    : "يمكنك تعديل التدفق التنفيذي حسب دورك."}
              </div>
            </div>

            <div style={styles.sideBlock}>
              <div style={styles.sideBlockTitle}>دليل الصلاحيات</div>
              <div style={styles.roleGuideGrid}>
                {roleCapabilities.map((cap) => (
                  <div key={cap.id} style={styles.roleGuideChip(cap.enabled)}>
                    {cap.enabled ? "✓" : "—"} {cap.label}
                  </div>
                ))}
              </div>
              <div style={styles.blockTop8}>
                <button style={styles.secondaryBtn(false)} onClick={runRolePermissionQACheck}>
                  تشغيل فحص الصلاحيات (QA)
                </button>
              </div>
              <div style={styles.blockTop8}>
                <button
                  style={styles.secondaryBtn(roleQaReport.status === "idle")}
                  disabled={roleQaReport.status === "idle"}
                  onClick={copyRoleQaReport}
                >
                  نسخ تقرير QA
                </button>
              </div>
              <div style={styles.textMutedSmallTop8}>
                غيّر الدور من أعلى الصفحة لمراجعة الصلاحيات المتاحة لكل شاشة.
              </div>
              {roleQaReport.status !== "idle" ? (
                <div style={roleQaReport.status === "pass" ? styles.successBox : styles.warnBox}>
                  <div style={styles.permissionHintTitle}>
                    {roleQaReport.status === "pass"
                      ? "نتيجة فحص QA: ناجح"
                      : "نتيجة فحص QA: يوجد تعارض"}
                  </div>
                  <div style={styles.textMutedSmall}>{roleQaReport.summary}</div>
                  <div style={styles.textMutedSmallTop8}>
                    آخر تشغيل: {formatDateTimeLabel(roleQaReport.ranAt)}
                  </div>
                  <div style={styles.blockTop8}>
                    {roleQaReport.lines.slice(0, 6).map((line, idx) => (
                      <div key={idx} style={styles.listItemGap4}>
                        • {line}
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>

            <div style={styles.sideSectionTitle}>حالة الجلسة</div>
            <div style={styles.sideBlock}>
              <div style={styles.sideBlockTitle}>حالة الجلسة</div>
              <div style={styles.stageStatusChip(stageStatusTone())}>
                {stageStatusText()}
              </div>
              <div style={styles.blockTop10}>
                <div style={styles.progressBar}>
                  <div
                    style={{
                      ...styles.progressFill,
                      width: `${progressPercent()}%`,
                    }}
                  />
                </div>
              </div>
              <div style={styles.sideProgressRow}>
                <div style={styles.textSecondarySmall}>{stageLabel()}</div>
                <div style={styles.sideProgressBadge}>{progressPercent()}%</div>
              </div>
              {progressMetaText() ? (
                <div style={styles.sideProgressMeta}>{progressMetaText()}</div>
              ) : null}
            </div>

            <div style={styles.sideBlock}>
              <div style={styles.sideBlockTitle}>المستشارون المشاركون</div>
              <div style={styles.sideSummaryPrimaryText}>
                {selectedAdvisorsSummary()}
              </div>
              <div style={styles.textTertiarySmall}>
                العدد:
                {" "}
                {toArabicDigits(effectiveSelectedAdvisors.length)}
              </div>
            </div>

            <div style={styles.sideBlock}>
              <div style={styles.sideBlockTitle}>مؤشرات سريعة</div>
              <div style={styles.miniStatsGrid}>
                <div style={styles.miniStat}>
                  <div style={styles.miniStatLabel}>الجولة الأولى</div>
                  <div style={styles.miniStatValue}>
                    {toArabicDigits(round1Questions.length)}
                  </div>
                </div>
                <div style={styles.miniStat}>
                  <div style={styles.miniStatLabel}>المتابعة</div>
                  <div style={styles.miniStatValue}>
                    {toArabicDigits(followupQuestions.length)}
                  </div>
                </div>
                <div style={styles.miniStat}>
                  <div style={styles.miniStatLabel}>الحوار</div>
                  <div style={styles.miniStatValue}>
                    {toArabicDigits(dialogue.length)}
                  </div>
                </div>
                <div style={styles.miniStat}>
                  <div style={styles.miniStatLabel}>النتائج</div>
                  <div style={styles.miniStatValue}>
                    {analysis ? "جاهزة" : "—"}
                  </div>
                </div>
              </div>

              {eventDurationSummary() ? (
                <div style={styles.sideDurationText}>
                  مدة الفعالية:{" "}
                  <strong style={styles.strongText95}>
                    {eventDurationSummary()?.label}
                  </strong>
                </div>
              ) : null}
            </div>

            <div style={styles.sideSectionTitle}>قراءة المشروع</div>
            <div style={styles.sideBlock}>
              <div style={styles.sideBlockTitle}>مؤشرات المشروع</div>
              <div style={styles.kpiGrid}>
                {indicators.map((item) => {
                  const tone = scoreTone(item.score);
                  return (
                    <div key={item.key} style={styles.kpiCard(tone)}>
                      <div style={styles.kpiLabel}>{item.label}</div>
                      <div style={styles.kpiValue}>
                        {toArabicDigits(item.score)}%
                      </div>
                      <div style={styles.kpiBarTrack}>
                        <div style={styles.kpiBarFill(item.score, tone)} />
                      </div>
                      <div style={styles.kpiHint}>{item.hint}</div>
                    </div>
                  );
                })}
              </div>
            </div>

            {deliveryTrack === "advanced" &&
            (stage === "advanced_boq" || stage === "advanced_plan") ? (
              <div style={styles.sideSectionTitle}>التنفيذ المتقدم</div>
            ) : null}
            {deliveryTrack === "advanced" &&
            (stage === "advanced_boq" || stage === "advanced_plan") ? (
              <div style={styles.sideBlock}>
                <div style={styles.sideBlockTitle}>مخاطر التنفيذ الحية</div>
                <div style={styles.sideSummaryPrimaryText}>
                  النشطة: <strong>{toArabicDigits(liveRiskStats.active)}</strong> • الحرجة:{" "}
                  <strong>{toArabicDigits(liveRiskStats.critical)}</strong>
                </div>
                <div style={styles.textMutedSmallTop8}>
                  مصعّدة: {toArabicDigits(liveRiskStats.escalated)} • متأخرة:{" "}
                  {toArabicDigits(liveRiskStats.overdue)}
                </div>
              </div>
            ) : null}

            {deliveryTrack === "advanced" &&
            (stage === "advanced_boq" || stage === "advanced_plan") ? (
              <div style={styles.sideBlock}>
                <div style={styles.sideBlockTitle}>الربحية الداخلية (جدول الكميات)</div>
                <div style={styles.sideSummaryPrimaryText}>
                  التكلفة: <strong>{renderMoneyValue(boqFinancialSummary.totalCost)}</strong>
                </div>
                <div style={styles.sideSummaryPrimaryText}>
                  البيع: <strong>{renderMoneyValue(boqFinancialSummary.totalSell)}</strong>
                </div>
                <div style={styles.textMutedSmallTop8}>
                  صافي النتيجة:{" "}
                  <strong
                    style={{
                      color:
                        boqFinancialSummary.status === "رابح"
                          ? "#00FF85"
                          : boqFinancialSummary.status === "خاسر"
                            ? "#FF7A45"
                            : "rgba(255,255,255,0.95)",
                    }}
                  >
                    {renderMoneyValue(boqFinancialSummary.profit)} ({boqFinancialSummary.status})
                  </strong>
                </div>
                <div style={styles.textMutedSmallTop8}>
                  نقطة التعادل:{" "}
                  <strong>
                    {boqFinancialSummary.status === "تعادل"
                      ? "محققة"
                      : boqFinancialSummary.breakEvenGap >= 0
                        ? "فوق التعادل"
                        : "أقل من التعادل"}
                  </strong>
                </div>
              </div>
            ) : null}

            {stage === "advanced_plan" ? (
              <div style={styles.sideBlock}>
                <div style={styles.sideBlockTitle}>متابعة التنفيذ</div>
                <div style={styles.sideSummaryPrimaryText}>
                  الإنجاز الحالي: <strong>{toArabicDigits(actionTrackerProgress)}%</strong>
                </div>
                <div style={styles.textMutedSmallTop8}>
                  مكتمل: {toArabicDigits(actionTrackerStats.done)} • متعثر:{" "}
                  {toArabicDigits(actionTrackerStats.blocked)}
                </div>
              </div>
            ) : null}

            {stage === "advanced_plan" ? (
              <div style={styles.sideBlock}>
                <div style={styles.sideBlockTitle}>حوكمة التغيير</div>
                <div style={styles.sideSummaryPrimaryText}>
                  النسخة:{" "}
                  <strong>
                    {!hasFrozenBaseline
                      ? "غير مجمّدة"
                      : hasChangesAfterFreeze
                        ? "مجمّدة مع تعديلات"
                        : "مجمّدة"}
                  </strong>
                </div>
                <div style={styles.textMutedSmallTop8}>
                  طلبات مفتوحة: {toArabicDigits(openChangeRequests)} • معتمدة:{" "}
                  {toArabicDigits(approvedChangeRequests)}
                </div>
              </div>
            ) : null}

            {stage === "advanced_plan" ? (
              <div style={styles.sideBlock}>
                <div style={styles.sideBlockTitle}>مخرجات الطباعة</div>
                <div style={styles.sideSummaryPrimaryText}>
                  رقم النسخة: <strong>{documentRevisionLabel}</strong>
                </div>
                <div style={styles.sideSummaryPrimaryText}>
                  نسخة الإدارة:{" "}
                  <strong>{managementBriefText.trim() ? "جاهزة" : "غير محدثة"}</strong>
                </div>
                <div style={styles.textMutedSmallTop8}>
                  نسخة الميدان:{" "}
                  <strong>{fieldChecklistText.trim() ? "جاهزة" : "غير محدثة"}</strong>
                </div>
              </div>
            ) : null}

            {stage === "addition" || stage === "done" ? (
              <div style={styles.sideSectionTitle}>جودة القرار</div>
            ) : null}
            {(stage === "addition" || stage === "done") ? (
              <div style={styles.sideBlock}>
                <div style={styles.sideBlockTitle}>جودة المدخلات</div>
                <div style={styles.qualityBadge(answerQuality.level)}>{answerQuality.level}</div>
                <div style={styles.sideQualityText}>
                  جودة تقديرية {toArabicDigits(answerQuality.score)}٪ • إجابات تحتاج تفصيل:
                  {" "}
                  {toArabicDigits(answerQuality.weakCount)}
                </div>
                <div style={styles.qualityMeterTrack}>
                  <div
                    style={styles.qualityMeterFill(answerQuality.level, answerQuality.score)}
                  />
                </div>
              </div>
            ) : null}

            {stage === "done" && analysis ? (
              <div style={styles.sideBlock}>
                <div style={styles.sideBlockTitle}>ملخص القرار</div>
                <div style={{ ...styles.qTitle, ...styles.qTitleGap4 }}>
                  {analysis?.executive_decision?.decision ?? "—"}
                </div>
                <div style={styles.textNeutralSmall72}>
                  الجاهزية:
                  {" "}
                  <span
                    style={{
                      color: readinessAccent(analysis?.strategic_analysis?.readiness_level),
                      fontWeight: 900,
                    }}
                  >
                    {analysis?.strategic_analysis?.readiness_level ?? "—"}
                  </span>
                </div>
                <div style={styles.miniStatsGrid}>
                  <div style={styles.miniStat}>
                    <div style={styles.miniStatLabel}>الفجوات</div>
                    <div style={styles.miniStatValue}>
                      {toArabicDigits((analysis?.strategic_analysis?.gaps || []).length)}
                    </div>
                  </div>
                  <div style={styles.miniStat}>
                    <div style={styles.miniStatLabel}>المخاطر</div>
                    <div style={styles.miniStatValue}>
                      {toArabicDigits((analysis?.strategic_analysis?.risks || []).length)}
                    </div>
                  </div>
                </div>
              </div>
            ) : null}

            <div style={styles.sideSectionTitle}>بيانات أساسية</div>
            <div style={styles.sideBlock}>
              <div style={styles.sideBlockTitle}>بيانات المشروع</div>
              <div style={styles.summaryMetaGrid}>
                <div style={{ ...styles.metaItem, ...styles.metaItemNoTop }}>
                  <span style={styles.k}>نوع الفعالية</span>
                  <span style={styles.v}>{eventType}</span>
                </div>
                <div style={{ ...styles.metaItem, ...styles.metaItemNoTop }}>
                  <span style={styles.k}>وضع الجلسة</span>
                  <span style={styles.v}>{mode}</span>
                </div>
                <div style={{ ...styles.metaItem, ...styles.metaItemNoTop }}>
                  <span style={styles.k}>مسار التنفيذ</span>
                  <span style={styles.v}>
                    {deliveryTrack === "advanced" ? "متقدم" : "سريع"}
                  </span>
                </div>
                <div style={{ ...styles.metaItem, ...styles.metaItemNoTop }}>
                  <span style={styles.k}>الموقع</span>
                  <span style={styles.v}>{venueType}</span>
                </div>
                <div style={{ ...styles.metaItem, ...styles.metaItemNoTop }}>
                  <span style={styles.k}>البداية</span>
                  <span style={styles.v}>{startAt ? "محدد" : "غير محدد"}</span>
                </div>
                <div style={{ ...styles.metaItem, ...styles.metaItemNoTop }}>
                  <span style={styles.k}>النهاية</span>
                  <span style={styles.v}>{endAt ? "محدد" : "غير محدد"}</span>
                </div>
                <div style={{ ...styles.metaItem, ...styles.metaItemNoTop }}>
                  <span style={styles.k}>الميزانية</span>
                  <span style={styles.v}>
                    {budget?.trim()
                      ? /[\d٠-٩]/.test(budget)
                        ? renderMoneyValue(parseNumericInput(budget))
                        : budget
                      : "غير محدد"}
                  </span>
                </div>
                <div style={{ ...styles.metaItem, ...styles.metaItemNoTop }}>
                  <span style={styles.k}>مدة الفعالية</span>
                  <span style={styles.v}>{eventDurationSummary()?.label ?? "غير مكتملة"}</span>
                </div>
              </div>
            </div>

            {deliveryTrack === "advanced" ? (
              <div style={styles.sideBlock}>
                <div style={styles.sideBlockTitle}>الهيكل التشغيلي</div>
                <div style={styles.sideSummaryPrimaryText}>
                  الأدوار المفعلة: <strong>{toArabicDigits(activeOrgRoles.length)}</strong>
                </div>
                <div style={styles.textMutedSmallTop8}>
                  {activeOrgRoles.length > 0
                    ? activeOrgRoles
                        .map((role) =>
                          role.assignee.trim()
                            ? `${role.title} (${role.assignee.trim()})`
                            : role.title
                        )
                        .join("، ")
                    : "لا توجد أدوار مفعلة حالياً."}
                </div>
              </div>
            ) : null}

            <div style={styles.sideSectionTitle}>تنبيهات وتشغيل</div>
            <div style={styles.sideBlock}>
              <div style={styles.sideBlockTitle}>تنبيهات سريعة</div>
              {sessionAlerts().map((alert, idx) => (
                <div key={idx} style={styles.sideAlertItem(alert.tone)}>
                  {alert.text}
                </div>
              ))}
            </div>

            <div style={styles.sideBlock}>
              <div style={{ ...styles.metaItem, ...styles.metaItemNoTopCenter }}>
                <span style={styles.k}>الحفظ التلقائي</span>
                <span style={styles.v}>مفعل ✓</span>
              </div>
              <div style={styles.textMutedSmall}>
                يتم حفظ التغييرات تلقائيًا أثناء العمل.
              </div>
              <div style={styles.textMutedSmallTop8}>
                تفعيل بعض الأزرار يعتمد على نسبة الإجابات (60%).
              </div>
            </div>
              </>
            )}
          </aside>
        </div> : null}
      </div>

      {uiError ? (
        <div style={styles.toastWrap}>
          <div
            style={{
              ...styles.toastBox,
              background:
                "linear-gradient(180deg, rgba(179, 0, 255, 0.18), rgba(106, 0, 255, 0.12))",
              border: "1px solid rgba(179, 0, 255, 0.35)",
              color: "white",
            }}
            role="alert"
            aria-live="assertive"
          >
            <strong>ملاحظة:</strong> {uiError}
          </div>
        </div>
      ) : null}

      {!uiError && uiSuccess ? (
        <div style={styles.toastWrap}>
          <div
            style={{
              ...styles.toastBox,
              background:
                "linear-gradient(180deg, rgba(0, 229, 255, 0.16), rgba(106, 0, 255, 0.10))",
              border: "1px solid rgba(0, 229, 255, 0.28)",
              color: "white",
            }}
            role="status"
            aria-live="polite"
          >
            <strong>نجاح:</strong> {uiSuccess}
          </div>
        </div>
      ) : null}
    </main>
  );
}
