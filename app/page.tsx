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
  advancedPlanText?: string;
  advancedApproved?: boolean;
};

type BoqItem = {
  id: string;
  category: string;
  item: string;
  spec: string;
  unit: string;
  qty: string;
  source: "أصل داخلي" | "مورد";
  leadTimeDays: string;
};

type LoadingContext =
  | ""
  | "start_session"
  | "submit_round1"
  | "build_dialogue"
  | "run_analysis";

const UX_MESSAGES = {
  reanalysisRequired:
    "إذا عدّلت الإجابات أو الإضافة، اضغط «ابدأ التحليل» مرة أخرى لتحديث النتائج.",
  openedCurrentResults: "تم فتح النتائج الحالية بدون إعادة تحليل جديد.",
  reusedCurrentAnalysis: "لا توجد تغييرات جديدة؛ تم فتح النتائج الحالية.",
} as const;

function isVenueType(value: string): value is VenueType {
  return ["منتجع", "فندق", "قاعة", "مساحة عامة", "غير محدد"].includes(value);
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

function toArabicDigits(value: number | string) {
  return String(value).replace(/\d/g, (d) => "٠١٢٣٤٥٦٧٨٩"[Number(d)]);
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
    source: "مورد",
    leadTimeDays: "",
  },
];

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
    initialSaved.boqItems?.length ? initialSaved.boqItems : DEFAULT_BOQ_ITEMS
  );
  const [advancedPlanText, setAdvancedPlanText] = useState(
    initialSaved.advancedPlanText ?? ""
  );
  const [advancedApproved, setAdvancedApproved] = useState(
    initialSaved.advancedApproved ?? false
  );

  // ============ Flow ============
  const [stage, setStage] = useState<StageUI>("welcome");
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
  const [loadingContext, setLoadingContext] = useState<LoadingContext>("");
  const [needsReanalysisHint, setNeedsReanalysisHint] = useState(false);
  const [viewportWidth, setViewportWidth] = useState(() =>
    typeof window === "undefined" ? 1200 : window.innerWidth
  );

  const effectiveSelectedAdvisors =
    advisorSelectionMode === "all" ? ALL_ADVISOR_KEYS : selectedAdvisors;

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
    boqItems.some((row) => row.item.trim().length > 0);
  const advancedMissingFields: string[] = [];
  if (!commissioningDate.trim()) advancedMissingFields.push("تاريخ التعميد");
  if (!scopeSite.trim()) advancedMissingFields.push("نطاق الموقع والتجهيزات");
  if (!scopeTechnical.trim()) advancedMissingFields.push("نطاق التجهيزات الفنية");
  if (!scopeProgram.trim()) advancedMissingFields.push("نطاق البرنامج التنفيذي");
  if (!executionStrategy.trim()) advancedMissingFields.push("استراتيجية التنفيذ");
  if (!boqItems.some((row) => row.item.trim().length > 0)) {
    advancedMissingFields.push("بند واحد على الأقل في BOQ (اسم البند)");
  }
  const isMobile = viewportWidth <= 768;
  const isNarrowMobile = viewportWidth <= 480;

  // ============ Save (no save while loading) ============
  useEffect(() => {
    if (loading) return;

    const snapshot = {
      eventType,
      mode,
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
      advancedPlanText,
      advancedApproved,
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
    advancedPlanText,
    advancedApproved,
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
    setBoqItems((prev) =>
      prev.map((row) => (row.id === id ? { ...row, ...patch } : row))
    );
  }

  function addBoqRow() {
    const nextId = String(Date.now());
    setBoqItems((prev) => [
      ...prev,
      {
        id: nextId,
        category: "التجهيزات الفنية",
        item: "",
        spec: "",
        unit: "قطعة",
        qty: "",
        source: "مورد",
        leadTimeDays: "",
      },
    ]);
  }

  function removeBoqRow(id: string) {
    setBoqItems((prev) => {
      if (prev.length <= 1) return prev;
      return prev.filter((row) => row.id !== id);
    });
  }

  function openAdvancedTrack() {
    if (!commissioningDate.trim() && startAt) {
      setCommissioningDate(startAt.slice(0, 10));
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
    setStage("advanced_scope");
    showSuccess("تم تفعيل المسار المتقدم. أكمل البيانات لبناء خطة تنفيذ تفصيلية.");
  }

  function buildAdvancedPlan() {
    const commissioning = commissioningDate ? new Date(commissioningDate) : null;
    const start = startAt ? new Date(startAt) : null;
    const end = endAt ? new Date(endAt) : null;

    let prepDaysText = "غير محدد";
    let execDaysText = "غير محدد";

    if (
      commissioning &&
      start &&
      Number.isFinite(commissioning.getTime()) &&
      Number.isFinite(start.getTime())
    ) {
      const days = Math.ceil(
        (start.getTime() - commissioning.getTime()) / (1000 * 60 * 60 * 24)
      );
      prepDaysText = toArabicDigits(Math.max(0, days));
    }

    if (start && end && Number.isFinite(start.getTime()) && Number.isFinite(end.getTime())) {
      const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
      execDaysText = toArabicDigits(Math.max(1, days));
    }

    const boqSummary = boqItems
      .filter((row) => row.item.trim())
      .map(
        (row, idx) =>
          `${toArabicDigits(idx + 1)}. ${row.item} — ${row.qty || "؟"} ${row.unit} (${row.source})`
      )
      .join("\n");

    const plan = [
      "خطة تنفيذ متكاملة (V1)",
      "",
      "الأساس الزمني:",
      `- تاريخ التعميد: ${commissioningDate || "غير محدد"}`,
      `- بداية الفعالية: ${startAt || "غير محدد"}`,
      `- نهاية الفعالية: ${endAt || "غير محدد"}`,
      `- مدة الإعداد التقديرية: ${prepDaysText} يوم`,
      `- مدة التنفيذ التقديرية: ${execDaysText} يوم`,
      `- مدة الإزالة/الإقفال: ${closureRemovalHours || "6"} ساعة`,
      "",
      "١) الإعداد:",
      "- اعتماد نطاق العمل والتصاميم.",
      "- استكمال التوريد حسب BOQ المختصر.",
      "- اختبارات ما قبل التشغيل (صوت/إضاءة/شاشة/ضيافة).",
      "",
      "٢) التنفيذ:",
      "- تشغيل ميداني حسب السيناريو المعتمد.",
      "- إدارة البرنامج والفقرات والمراسم.",
      "- مراقبة فورية للمخاطر والاستجابة.",
      "",
      "٣) المتابعة:",
      "- مراجعة يومية للجودة ومؤشرات الأداء.",
      "- معالجة الانحرافات ورفع تقارير الحالة.",
      "",
      "٤) الإقفال:",
      "- إيقاف التشغيل وفق خطة آمنة.",
      "- إزالة التجهيزات خلال المدة المحددة.",
      "- تسليم الموقع وإغلاق المحاضر.",
      "",
      "نطاق البرنامج والمراسم:",
      scopeProgram || "- غير مدخل.",
      "",
      "نطاق المراسم والتوثيق:",
      scopeCeremony || "- غير مدخل.",
      "",
      "BOQ المختصر:",
      boqSummary || "- لا توجد بنود BOQ مدخلة بعد.",
      "",
      "معايير الجودة:",
      qualityStandards || "- غير مدخلة.",
      "",
      "إدارة المخاطر:",
      riskManagement || "- غير مدخلة.",
      "",
      "سرعة الاستجابة (SLA):",
      responseSla || "- غير مدخلة.",
    ].join("\n");

    setAdvancedPlanText(plan);
    setStage("advanced_plan");
    showSuccess("تم توليد خطة التنفيذ المتقدمة بنجاح.");
  }

  function fillAdvancedTestData() {
    setCommissioningDate((prev) => prev || (startAt ? startAt.slice(0, 10) : "2026-03-01"));
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
          source: "مورد",
          leadTimeDays: "5",
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
      "١) الإعداد: اعتماد النطاق والتصاميم وتجهيز الموردين.",
      "٢) التنفيذ: تشغيل البرنامج وإدارة الفقرات والمراسم.",
      "٣) المتابعة: مراقبة الجودة والمخاطر ورفع التقارير.",
      "٤) الإقفال: إزالة التجهيزات وتسليم الموقع خلال 6 ساعات.",
    ].join("\n");

    setDeliveryTrack("advanced");
    setAdvisorSelectionMode("all");
    setSelectedAdvisors(ALL_ADVISOR_KEYS);
    setMode("تحليل معمّق");
    setInitStep("session");
    setEventType("مؤتمر احترافي مدفوع");
    setVenueType("فندق");
    setCommissioningDate("2026-03-10");
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
    setBoqItems([
      {
        id: "demo-1",
        category: "التجهيزات الفنية",
        item: "شاشة LED رئيسية",
        spec: "دقة عالية مع اختبار تجريبي كامل",
        unit: "قطعة",
        qty: "1",
        source: "مورد",
        leadTimeDays: "5",
      },
      {
        id: "demo-2",
        category: "الموقع والتجهيزات",
        item: "تجهيز قاعة كبار الشخصيات",
        spec: "أثاث وضيافة وتجهيز بروتوكولي",
        unit: "باكدج",
        qty: "1",
        source: "أصل داخلي",
        leadTimeDays: "2",
      },
    ]);
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
        return "المسار المتقدم: نطاق واستراتيجية";
      case "advanced_boq":
        return "المسار المتقدم: BOQ والجودة والمخاطر";
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
      return "أنت في المسار المتقدم لبناء خطة تنفيذ متكاملة تعتمد على النطاق، BOQ، والجودة والمخاطر.";
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
      return "تجهيز نطاق العمل والاستراتيجية";
    }

    if (stage === "advanced_boq") {
      return "استكمال BOQ والجودة والمخاطر";
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
        return "تجهيز النطاق المتقدم";
      case "advanced_boq":
        return "تجهيز BOQ والمخاطر";
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
    if (stage === "advanced_plan" && !advancedApproved) {
      alerts.push({
        text: "خطة التنفيذ المتقدمة تحتاج اعتماد نهائي قبل التجميد.",
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
      progressWrapper: { marginBottom: 18 },
      progressLabel: {
        marginBottom: space.xs,
        fontSize: textScale.small,
        lineHeight: 1.6,
        color: "rgba(255,255,255,0.72)",
      },
      progressBar: {
        height: 8,
        background: "rgba(255,255,255,0.10)",
        borderRadius: 20,
        overflow: "hidden",
      },
      progressFill: {
        height: "100%",
        background: "linear-gradient(90deg, #6a00ff, #b300ff)",
      },
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
        background: "rgba(255,255,255,0.04)",
        backdropFilter: "blur(14px)",
        border: "1px solid rgba(255,255,255,0.08)",
        borderRadius: 16,
        padding: isMobile ? 14 : 18,
        position: "sticky" as const,
        top: 12,
        alignSelf: "start",
      } as CSSProperties,
      sideBlock: {
        marginTop: 12,
        borderRadius: 14,
        border: "1px solid rgba(255,255,255,0.06)",
        background: "rgba(255,255,255,0.02)",
        padding: 12,
      } as CSSProperties,
      sideBlockTitle: {
        fontWeight: 900,
        fontSize: textScale.small,
        color: "rgba(255,255,255,0.92)",
        marginBottom: space.xs,
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
      miniStat: {
        borderRadius: 12,
        border: "1px solid rgba(255,255,255,0.06)",
        background: "rgba(255,255,255,0.025)",
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
        fontSize: 13,
        color: "rgba(255,255,255,0.9)",
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
              ? "1px solid rgba(255,122,69,0.22)"
              : tone === "info"
                ? "1px solid rgba(0,229,255,0.20)"
                : "1px solid rgba(0,255,133,0.20)",
          background:
            tone === "warn"
              ? "rgba(255,122,69,0.07)"
              : tone === "info"
                ? "rgba(0,229,255,0.06)"
                : "rgba(0,255,133,0.06)",
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
    });
    },
    [isMobile, isNarrowMobile]
  );

  const answerQuality = analyzeAnswerQuality();

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
                  ...styles.secondaryBtn(false),
                  width: isMobile ? "100%" : 280,
                }}
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
                {stage === "done" && reportText?.trim() ? (
                  <button style={styles.ghostBtn} onClick={copyReport}>
                    نسخ التقرير
                  </button>
                ) : null}

                {!isSelectionStep ? (
                  <button style={styles.ghostBtn} onClick={clearSession}>
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
            <div style={styles.progressLabel}>
              ✨ خطوة بخطوة لصنع القرار —{" "}
              <strong style={styles.strongText92}>{stageLabel()}</strong>
              {progressMetaText() ? ` — ${progressMetaText()}` : ""}
            </div>
            <div style={styles.progressBar}>
              <div
                style={{
                  ...styles.progressFill,
                  width: `${progressPercent()}%`,
                }}
              />
            </div>
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

            {/* INIT */}
            {stage === "init" && (
              <>
                {initStep === "session" && (
                  <>
                    <div style={styles.selectorRow}>
                      <button
                        type="button"
                        style={styles.selectorBtn(advisorSelectionMode === "all")}
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
                          onClick={() => setDeliveryTrack("fast")}
                        >
                          المسار السريع (النموذج الحالي)
                        </button>
                        <button
                          type="button"
                          style={styles.selectorBtn(deliveryTrack === "advanced")}
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
                            disabled={advisorSelectionMode !== "custom"}
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
                        style={styles.primaryBtn(!canMoveToProjectStep)}
                        disabled={!canMoveToProjectStep}
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
                    <input
                      value={budget}
                      onChange={(e) => setBudget(e.target.value)}
                      style={styles.input}
                      placeholder="مثال: 250000"
                    />
                  </div>

                  <div>
                    <div style={styles.label}>بداية الفعالية</div>
                    <input
                      type="datetime-local"
                      value={startAt}
                      onChange={(e) => setStartAt(e.target.value)}
                      style={styles.input}
                    />
                  </div>

                  <div>
                    <div style={styles.label}>نهاية الفعالية</div>
                    <input
                      type="datetime-local"
                      value={endAt}
                      onChange={(e) => setEndAt(e.target.value)}
                      style={styles.input}
                    />
                  </div>
                    </div>

                    <div style={styles.blockTop12}>
                      <div style={styles.label}>وصف المشروع</div>
                      <textarea
                        value={project}
                        onChange={(e) => setProject(e.target.value)}
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
                          !canStart || isProcessing() || hasInvalidTimeRange()
                        )}
                        disabled={!canStart || isProcessing() || hasInvalidTimeRange()}
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
                  1) أسئلة الجولة الأولى
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
                        placeholder="اكتب إجابتك..."
                        style={{ ...styles.textarea, ...styles.questionTextarea }}
                      />
                    </div>
                  );
                })}

                <div style={styles.stackAfterSection}>
                  <button
                    style={styles.primaryBtn(isProcessing())}
                    disabled={isProcessing()}
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
                <h3 style={styles.sectionHeading}>2) تدقيق إضافي</h3>

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
                        placeholder="اكتب إجابتك..."
                        style={{ ...styles.textarea, ...styles.questionTextarea }}
                      />
                    </div>
                  );
                })}

                <div style={styles.stackAfterSection}>
                  <button
                    style={styles.primaryBtn(isProcessing())}
                    disabled={isProcessing()}
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
                <h3 style={styles.sectionHeading}>3) حوار المستشارين</h3>

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
                    disabled={isProcessing()}
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
                  4) قبل التحليل: هل لديك إضافة؟
                </h3>

                <div style={styles.radioRow}>
                  <label style={styles.radioLabel}>
                    <input
                      type="radio"
                      checked={hasAddition === "no"}
                      onChange={() => setHasAddition("no")}
                    />
                    لا يوجد
                  </label>

                  <label style={styles.radioLabel}>
                    <input
                      type="radio"
                      checked={hasAddition === "yes"}
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
                    disabled={isProcessing()}
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
                  5) المخرجات النهائية: التحليل والقرار والتوصيات
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
                      <div style={styles.qTitle}>أفضل 3 ترقيات مقترحة</div>
                    </div>
                    {(analysis?.strategic_analysis?.top_3_upgrades || []).length ? (
                      (analysis?.strategic_analysis?.top_3_upgrades || []).map(
                        (x: string, i: number) => (
                          <div key={i} style={styles.listItemGap6}>
                            • {x}
                          </div>
                        )
                      )
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
                    style={styles.primaryBtn(isProcessing())}
                    disabled={isProcessing()}
                    onClick={openAdvancedTrack}
                  >
                    {deliveryTrack === "advanced"
                      ? "التالي: استكمال المسار المتقدم"
                      : "ترقية إلى المسار المتقدم"}
                  </button>

                  <button
                    style={styles.secondaryBtn(isProcessing())}
                    disabled={isProcessing()}
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
                <h3 style={styles.sectionHeading}>6) المسار المتقدم: نطاق واستراتيجية</h3>

                <div style={styles.blockTop12}>
                  <div style={styles.label}>تاريخ التعميد</div>
                  <input
                    type="date"
                    value={commissioningDate}
                    onChange={(e) => setCommissioningDate(e.target.value)}
                    style={styles.input}
                  />
                </div>

                <div style={styles.blockTop12}>
                  <div style={styles.label}>٢.١ نطاق العمل - الموقع والتجهيزات</div>
                  <textarea
                    value={scopeSite}
                    onChange={(e) => setScopeSite(e.target.value)}
                    style={styles.textarea}
                    placeholder="اكتب نطاق الموقع والتجهيزات..."
                  />
                </div>

                <div style={styles.blockTop12}>
                  <div style={styles.label}>٢.١ نطاق العمل - التجهيزات الفنية</div>
                  <textarea
                    value={scopeTechnical}
                    onChange={(e) => setScopeTechnical(e.target.value)}
                    style={styles.textarea}
                    placeholder="اكتب نطاق التجهيزات الفنية..."
                  />
                </div>

                <div style={styles.blockTop12}>
                  <div style={styles.label}>٢.١ نطاق العمل - البرنامج التنفيذي / المراسم</div>
                  <textarea
                    value={scopeProgram}
                    onChange={(e) => setScopeProgram(e.target.value)}
                    style={styles.textarea}
                    placeholder="اكتب نطاق البرنامج التنفيذي..."
                  />
                </div>

                <div style={styles.blockTop12}>
                  <div style={styles.label}>٢.١ نطاق العمل - المراسم والتوثيق</div>
                  <textarea
                    value={scopeCeremony}
                    onChange={(e) => setScopeCeremony(e.target.value)}
                    style={styles.textarea}
                    placeholder="اكتب نطاق المراسم والتوثيق..."
                  />
                </div>

                <div style={styles.blockTop12}>
                  <div style={styles.label}>٢.٢ استراتيجية التنفيذ</div>
                  <textarea
                    value={executionStrategy}
                    onChange={(e) => setExecutionStrategy(e.target.value)}
                    style={styles.textarea}
                    placeholder="اكتب الاستراتيجية التشغيلية والتنفيذية..."
                  />
                </div>

                <div style={styles.stackAfterSection}>
                  <button
                    style={styles.secondaryBtn(isProcessing())}
                    disabled={isProcessing()}
                    onClick={fillAdvancedTestData}
                  >
                    تعبئة سريعة للاختبار
                  </button>
                  <button
                    style={styles.primaryBtn(isProcessing())}
                    disabled={isProcessing()}
                    onClick={() => setStage("advanced_boq")}
                  >
                    التالي: BOQ + الجودة + المخاطر
                  </button>
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
                <h3 style={styles.sectionHeading}>7) المسار المتقدم: BOQ والجودة والمخاطر</h3>

                <div style={styles.blockTop12}>
                  <div style={styles.label}>٢.٣ جدول الكميات والمواصفات (مختصر V1)</div>
                  <div style={{ ...styles.qCard, marginTop: 0 }}>
                    {boqItems.map((row) => (
                      <div key={row.id} style={styles.blockTop12}>
                        <div style={styles.initFormGrid}>
                          <input
                            value={row.category}
                            onChange={(e) => updateBoqItem(row.id, { category: e.target.value })}
                            style={styles.input}
                            placeholder="التصنيف"
                          />
                          <input
                            value={row.item}
                            onChange={(e) => updateBoqItem(row.id, { item: e.target.value })}
                            style={styles.input}
                            placeholder="اسم البند"
                          />
                        </div>
                        <div style={styles.blockTop8}>
                          <textarea
                            value={row.spec}
                            onChange={(e) => updateBoqItem(row.id, { spec: e.target.value })}
                            style={styles.textarea}
                            placeholder="المواصفة الفنية المختصرة"
                          />
                        </div>
                        <div style={{ ...styles.initFormGrid, marginTop: 8 }}>
                          <input
                            value={row.unit}
                            onChange={(e) => updateBoqItem(row.id, { unit: e.target.value })}
                            style={styles.input}
                            placeholder="الوحدة"
                          />
                          <input
                            value={row.qty}
                            onChange={(e) => updateBoqItem(row.id, { qty: e.target.value })}
                            style={styles.input}
                            placeholder="الكمية"
                          />
                          <select
                            value={row.source}
                            onChange={(e) =>
                              updateBoqItem(row.id, {
                                source:
                                  e.target.value === "أصل داخلي" ? "أصل داخلي" : "مورد",
                              })
                            }
                            style={styles.input}
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
                            placeholder="زمن التوريد (يوم)"
                          />
                        </div>
                        <div style={styles.blockTop8}>
                          <button
                            style={styles.ghostBtn}
                            onClick={() => removeBoqRow(row.id)}
                            disabled={boqItems.length <= 1}
                          >
                            حذف البند
                          </button>
                        </div>
                      </div>
                    ))}

                    <div style={styles.blockTop12}>
                      <button
                        style={styles.secondaryBtn(isProcessing())}
                        disabled={isProcessing()}
                        onClick={addBoqRow}
                      >
                        إضافة بند BOQ
                      </button>
                    </div>
                  </div>
                </div>

                <div style={styles.blockTop12}>
                  <div style={styles.label}>٢.٥ معايير الجودة</div>
                  <textarea
                    value={qualityStandards}
                    onChange={(e) => setQualityStandards(e.target.value)}
                    style={styles.textarea}
                    placeholder="اكتب معايير الجودة وآلية التحقق..."
                  />
                </div>

                <div style={styles.blockTop12}>
                  <div style={styles.label}>٢.٦ إدارة المخاطر</div>
                  <textarea
                    value={riskManagement}
                    onChange={(e) => setRiskManagement(e.target.value)}
                    style={styles.textarea}
                    placeholder="اكتب سجل المخاطر المختصر وخطط المعالجة..."
                  />
                </div>

                <div style={styles.blockTop12}>
                  <div style={styles.label}>٢.٧ سرعة الاستجابة (SLA)</div>
                  <textarea
                    value={responseSla}
                    onChange={(e) => setResponseSla(e.target.value)}
                    style={styles.textarea}
                    placeholder="اكتب أزمنة الاستجابة التشغيلية والفنية..."
                  />
                </div>

                <div style={styles.blockTop12}>
                  <div style={styles.label}>مدة الإزالة/الإقفال (بالساعات)</div>
                  <input
                    value={closureRemovalHours}
                    onChange={(e) => setClosureRemovalHours(e.target.value)}
                    style={styles.input}
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
                    style={styles.primaryBtn(!canBuildAdvancedPlan || isProcessing())}
                    disabled={!canBuildAdvancedPlan || isProcessing()}
                    onClick={buildAdvancedPlan}
                  >
                    توليد خطة التنفيذ المتقدمة
                  </button>
                  <button
                    style={styles.secondaryBtn(isProcessing())}
                    disabled={isProcessing()}
                    onClick={() => setStage("advanced_scope")}
                  >
                    رجوع: النطاق والاستراتيجية
                  </button>
                </div>
              </>
            )}

            {stage === "advanced_plan" && (
              <>
                <h3 style={styles.sectionHeading}>8) خطة التنفيذ المتقدمة</h3>

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
                  <label style={styles.radioLabel}>
                    <input
                      type="checkbox"
                      checked={advancedApproved}
                      onChange={(e) => setAdvancedApproved(e.target.checked)}
                    />
                    اعتماد نهائي للخطة (V1)
                  </label>
                </div>

                <div style={styles.stackAfterSection}>
                  <button
                    style={styles.primaryBtn(isProcessing())}
                    disabled={isProcessing()}
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
                    onClick={() => setStage("advanced_boq")}
                  >
                    رجوع: BOQ والجودة والمخاطر
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
              <div style={styles.textSecondarySmall}>
                {stageLabel()}
              </div>
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
                  <span style={styles.v}>{budget?.trim() ? budget : "غير محدد"}</span>
                </div>
                <div style={{ ...styles.metaItem, ...styles.metaItemNoTop }}>
                  <span style={styles.k}>مدة الفعالية</span>
                  <span style={styles.v}>{eventDurationSummary()?.label ?? "غير مكتملة"}</span>
                </div>
              </div>
            </div>

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
