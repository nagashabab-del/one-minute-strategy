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
  | "done";

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
};

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

  // ============ Flow ============
  const [stage, setStage] = useState<StageUI>(initialSaved.stage ?? "welcome");
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
  const [needsReanalysisHint, setNeedsReanalysisHint] = useState(false);
  const [viewportWidth, setViewportWidth] = useState(() =>
    typeof window === "undefined" ? 1200 : window.innerWidth
  );

  const effectiveSelectedAdvisors =
    advisorSelectionMode === "all" ? ALL_ADVISOR_KEYS : selectedAdvisors;

  const canMoveToProjectStep = effectiveSelectedAdvisors.length > 0;
  const isWelcome = stage === "welcome";

  const canStart =
    project.trim().length > 0 && effectiveSelectedAdvisors.length > 0;
  const isMobile = viewportWidth <= 768;
  const isNarrowMobile = viewportWidth <= 480;

  // ============ Save (no save while loading) ============
  useEffect(() => {
    if (loading) return;

    const snapshot = {
      eventType,
      mode,
      initStep,
      advisorSelectionMode,
      selectedAdvisors,
      venueType,
      startAt,
      endAt,
      budget,
      project,
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
    advisorSelectionMode,
    selectedAdvisors,
    venueType,
    startAt,
    endAt,
    budget,
    project,
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
      default:
        return stage;
    }
  }

  function sessionSectionLead() {
    if (stage === "done") {
      return "أصبحت لديك الآن رؤية أوضح للمشروع، وهذه هي المخرجات التنفيذية النهائية لاتخاذ القرار.";
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

    return "";
  }

  function stageStatusTone() {
    switch (stage) {
      case "done":
        return "ready";
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
      const msg = "وقت النهاية يجب أن يكون بعد وقت البداية.";
      setUiError(msg);
      setUiSuccess("");
      return;
    }
    setUiError("");
    setUiSuccess("");

    setLoading(true);
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
    setLoading(false);

    if (!json?.ok) {
      setUiError(json?.error || "حدث خطأ في توليد الأسئلة");
      setUiSuccess("");
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
      setUiError("جاوب على أغلب أسئلة الجولة الأولى (على الأقل 60%).");
      setUiSuccess("");
      return;
    }

    setUiError("");
    setUiSuccess("");
    setLoading(true);

    const round1Answers = answers.filter((a) => ids.includes(a.id));

    const json = await callAPI<{ followups?: Question[] }>({
      stage: "followups",
      ...commonPayload(),
      answers: round1Answers,
    });

    setLoading(false);

    if (!json?.ok) {
      setUiError(json?.error || "حدث خطأ في توليد تدقيق إضافي");
      setUiSuccess("");
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
      setUiError("جاوب على أغلب تدقيق إضافي (على الأقل 60%).");
      setUiSuccess("");
      return;
    }
    setUiError("");
    setUiSuccess("");
    await buildDialogue();
  }

  async function buildDialogue() {
    const currentDialogueSignature = getDialogueSignature();
    const hasCachedDialogue =
      dialogue.length > 0 &&
      dialogueSignature === currentDialogueSignature;

    if (hasCachedDialogue) {
      setUiError("");
      setUiSuccess("");
      setStage("dialogue");
      return;
    }

    setUiError("");
    setUiSuccess("");
    setLoading(true);

    const json = await callAPI<{
      council_dialogue?: DialogueLine[];
      open_issues?: string[];
    }>({
      stage: "dialogue",
      ...commonPayload(),
      answers,
    });

    setLoading(false);

    if (!json?.ok) {
      setUiError(json?.error || "حدث خطأ في توليد الحوار");
      setUiSuccess("");
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
      setUiError("");
      setUiSuccess("");
      setStage("done");
      return;
    }

    setNeedsReanalysisHint(false);
    setUiError("");
    setUiSuccess("");
    setLoading(true);

    const json = await callAPI<AnalysisData>({
      stage: "analysis",
      ...commonPayload(),
      answers,
      dialogue,
      userAddition: hasAddition === "yes" ? userAddition : "",
    });

    setLoading(false);

    if (!json?.ok) {
      setUiError(json?.error || "حدث خطأ في التحليل");
      setUiSuccess("");
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
    setUiError("");
    setUiSuccess("تم نسخ التقرير بنجاح.");
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
    setUiError("");
    setUiSuccess("تم نسخ القرار التنفيذي بنجاح.");
  }

  // ============ Styles ============
  const styles = useMemo(
    () => ({
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
        padding: isMobile ? 14 : 34,
        position: "relative" as const,
        zIndex: 1,
      },
      headerShell: {
        borderRadius: 18,
        border: "1px solid rgba(255,255,255,0.08)",
        background: "rgba(255,255,255,0.03)",
        backdropFilter: "blur(14px)",
        padding: isMobile ? 12 : 16,
        marginBottom: 12,
      } as CSSProperties,
      header: {
        display: "flex",
        justifyContent: "space-between",
        alignItems: isMobile ? "stretch" : "center",
        flexDirection: isMobile ? "column" : "row",
        gap: 16,
        marginBottom: 22,
      } as CSSProperties,
      headerBrand: {
        display: "flex",
        alignItems: isMobile ? "flex-start" : "center",
        gap: isMobile ? 12 : 16,
        width: isMobile ? "100%" : "auto",
      },
      logo: {
        fontSize: isMobile ? 20 : 24,
        fontWeight: 900,
        margin: 0,
        letterSpacing: 0.2,
      },
      subtitle: {
        marginTop: 6,
        color: "rgba(255,255,255,0.65)",
        fontSize: isMobile ? 12 : 13,
      },
      headerActions: {
        display: "flex",
        gap: 10,
        alignItems: "center",
        flexDirection: "row",
        flexWrap: isMobile ? "wrap" : "nowrap",
        width: isMobile ? "100%" : "auto",
      } as CSSProperties,
      ghostBtn: {
        background: "transparent",
        border: "1px solid rgba(255,255,255,0.18)",
        padding: "10px 14px",
        borderRadius: 12,
        color: "white",
        cursor: "pointer",
        width: isNarrowMobile ? "100%" : "auto",
      },
      primaryBtn: (disabled: boolean) =>
        ({
          padding: "12px 16px",
          borderRadius: 14,
          border: "none",
          background: disabled
            ? "rgba(255,255,255,0.10)"
            : "linear-gradient(90deg, #6a00ff, #b300ff)",
          color: "white",
          fontWeight: 900,
          cursor: disabled ? "not-allowed" : "pointer",
          width: "100%",
        } as CSSProperties),
      secondaryBtn: (disabled: boolean) =>
        ({
          padding: "12px 16px",
          borderRadius: 14,
          border: "1px solid rgba(255,255,255,0.18)",
          background: "rgba(255,255,255,0.04)",
          color: "white",
          fontWeight: 800,
          cursor: disabled ? "not-allowed" : "pointer",
          width: "100%",
        } as CSSProperties),
      progressWrapper: { marginBottom: 18 },
      progressLabel: {
        marginBottom: 8,
        fontSize: 13,
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
        gap: 18,
      },
      card: {
        background: "rgba(255,255,255,0.04)",
        backdropFilter: "blur(14px)",
        border: "1px solid rgba(255,255,255,0.08)",
        borderRadius: 16,
        padding: isMobile ? 14 : 18,
      },
      cardTitle: { fontSize: 16, fontWeight: 900, margin: 0 },
      muted: { color: "rgba(255,255,255,0.62)", fontSize: 13, marginTop: 8 },
      label: { fontSize: 12, color: "rgba(255,255,255,0.72)", marginBottom: 6 },
      input: {
        width: "100%",
        padding: 10,
        borderRadius: 12,
        background: "rgba(0,0,0,0.35)",
        border: "1px solid rgba(255,255,255,0.12)",
        color: "white",
        outline: "none",
      },
      textarea: {
        width: "100%",
        padding: 14,
        borderRadius: 14,
        background: "rgba(0,0,0,0.35)",
        border: "1px solid rgba(255,255,255,0.12)",
        color: "white",
        outline: "none",
        resize: "none" as const,
        lineHeight: 1.7,
        fontSize: 14,
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
        marginBottom: 6,
        lineHeight: 1.5,
        fontSize: isMobile ? 14 : 16,
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
        fontSize: isMobile ? 11.5 : 12,
        color: "rgba(255,255,255,0.65)",
        marginTop: 6,
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
        color: "rgba(255,255,255,0.66)",
      } as CSSProperties,
      smallMuted: {
        marginTop: 8,
        fontSize: 12,
        color: "rgba(255,255,255,0.66)",
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
        color: "rgba(255,255,255,0.62)",
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
        marginTop: 8,
        lineHeight: 1.7,
        color: "rgba(255,255,255,0.9)",
        fontSize: isMobile ? 14 : 15,
      } as CSSProperties,
      questionPromptText: {
        marginTop: 8,
        lineHeight: 1.7,
        color: "rgba(255,255,255,0.93)",
        fontSize: isMobile ? 14 : 15,
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
        fontSize: 13,
        color: "rgba(255,255,255,0.92)",
        marginBottom: 8,
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
        fontSize: 11,
        color: "rgba(255,255,255,0.62)",
        marginBottom: 3,
      } as CSSProperties,
      miniStatValue: {
        fontSize: 14,
        fontWeight: 900,
        color: "rgba(255,255,255,0.95)",
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
    }),
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
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                textAlign: "center",
                padding: isMobile ? "8px 4px" : "12px 8px",
              }}
            >
              <Image
                src="/logo.svg"
                alt="One Minute Strategy"
                width={isMobile ? 220 : 320}
                height={isMobile ? 74 : 108}
                style={{
                  height: isMobile ? 74 : 108,
                  width: "auto",
                  filter: "drop-shadow(0 0 24px rgba(128,0,255,0.6))",
                }}
              />
              <h1
                style={{
                  margin: "10px 0 0 0",
                  fontSize: isMobile ? 22 : 28,
                  fontWeight: 900,
                  letterSpacing: 0.2,
                }}
              >
                One Minute Strategy
              </h1>
              <div
                style={{
                  marginTop: 6,
                  color: "rgba(255,255,255,0.68)",
                  fontSize: isMobile ? 12 : 13,
                }}
              >
                Executive Decision Intelligence Platform
              </div>
              <button
                style={{
                  marginTop: 14,
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

                <button style={styles.ghostBtn} onClick={clearSession}>
                  مسح الجلسة
                </button>
              </div>
            </header>
          )}
        </div>

        {/* Progress */}
        {!isWelcome ? (
          <div style={styles.progressWrapper}>
            <div style={styles.progressLabel}>
              ✨ خطوة بخطوة لصنع القرار —{" "}
              <strong style={{ color: "rgba(255,255,255,0.92)" }}>{stageLabel()}</strong>
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

                    <div style={{ marginTop: 12 }}>
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

                    <div style={styles.smallMuted}>
                      {advisorSelectionMode === "all"
                        ? "المستشارون المشاركون"
                        : "المستشارون المشاركون (اختيار مخصص)"}
                    </div>

                    <div style={{ ...styles.smallMuted, marginTop: 4 }}>
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

                    <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
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

                    <div style={{ marginTop: 12 }}>
                      <div style={styles.label}>وصف المشروع</div>
                      <textarea
                        value={project}
                        onChange={(e) => setProject(e.target.value)}
                        style={{ ...styles.textarea, height: 150 }}
                        placeholder="اكتب الفكرة: الهدف، الجمهور، البوثات/التذاكر/الرعاة، التكاليف، الزمن..."
                      />
                    </div>

                    <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
                      {hasInvalidTimeRange() ? (
                        <div style={{ ...styles.warnBox, marginBottom: 0 }}>
                          <strong>تنبيه:</strong> وقت النهاية يجب أن يكون بعد وقت البداية.
                        </div>
                      ) : null}

                      <button
                        style={styles.primaryBtn(!canStart || loading || hasInvalidTimeRange())}
                        disabled={!canStart || loading || hasInvalidTimeRange()}
                        onClick={startSession}
                      >
                        {loading ? "تتم المعالجة..." : "ابدأ الجلسة"}
                      </button>

                      <button
                        style={styles.secondaryBtn(loading)}
                        disabled={loading}
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
                <h3 style={{ margin: 0, fontWeight: 900 }}>
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

                <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
                  <button
                    style={styles.primaryBtn(loading)}
                    disabled={loading}
                    onClick={submitRound1}
                  >
                    {loading ? "تتم المعالجة..." : "التالي: تدقيق إضافي"}
                  </button>

                  <button
                    style={styles.secondaryBtn(false)}
                    disabled={false}
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
                <h3 style={{ margin: 0, fontWeight: 900 }}>2) تدقيق إضافي</h3>

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

                <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
                  <button
                    style={styles.primaryBtn(loading)}
                    disabled={loading}
                    onClick={submitRound2}
                  >
                    {loading ? "تجري المعالجة" : "التالي: حوار المستشارين"}
                  </button>

                  <button
                    style={styles.secondaryBtn(false)}
                    disabled={false}
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
                <h3 style={{ margin: 0, fontWeight: 900 }}>3) حوار المستشارين</h3>

                <div style={{ marginTop: 10, display: "grid", gap: 10 }}>
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
                  <div style={{ marginTop: 12 }}>
                    <div style={styles.qCard}>
                      <div style={styles.qTitle}>نقاط مفتوحة قبل القرار</div>
                      {openIssues.map((x, idx) => (
                        <div key={idx} style={{ marginBottom: 6 }}>
                          • {x}
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}

                <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
                  <button
                    style={styles.primaryBtn(false)}
                    onClick={() => setStage("addition")}
                  >
                    التالي: هل لديك إضافة؟
                  </button>

                  <button
                    style={styles.secondaryBtn(false)}
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
                <h3 style={{ margin: 0, fontWeight: 900 }}>
                  4) قبل التحليل: هل لديك إضافة؟
                </h3>

                <div style={styles.radioRow}>
                  <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <input
                      type="radio"
                      checked={hasAddition === "no"}
                      onChange={() => setHasAddition("no")}
                    />
                    لا يوجد
                  </label>

                  <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <input
                      type="radio"
                      checked={hasAddition === "yes"}
                      onChange={() => setHasAddition("yes")}
                    />
                    يوجد إضافة
                  </label>
                </div>

                {hasAddition === "yes" && (
                  <div style={{ marginTop: 10 }}>
                    <textarea
                      value={userAddition}
                      onChange={(e) => setUserAddition(e.target.value)}
                      style={{ ...styles.textarea, height: 110 }}
                      placeholder="اكتب الإضافة (ميزانية/موقع/مدة/بوثات/تسعير/راعي محتمل...)"
                    />
                  </div>
                )}

                <div style={styles.qualityCard}>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      gap: 10,
                      flexWrap: "wrap",
                    }}
                  >
                    <div style={{ fontWeight: 900 }}>مؤشر جودة الإجابات قبل التحليل</div>
                    <div style={styles.qualityBadge(answerQuality.level)}>
                      {answerQuality.level}
                    </div>
                  </div>

                  <div
                    style={{
                      marginTop: 6,
                      fontSize: 13,
                      color: "rgba(255,255,255,0.75)",
                      lineHeight: 1.6,
                    }}
                  >
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
                    <div style={{ ...styles.inlineWarnBox, marginTop: 10 }}>
                      <strong>ملاحظة مهمة:</strong> بعض الإجابات قصيرة أو عامة جدًا، وهذا
                      يضعف دقة التحليل النهائي.
                      {answerQuality.weakExamples.length > 0 ? (
                        <div style={{ marginTop: 8 }}>
                          {answerQuality.weakExamples.map((x, i) => (
                            <div key={i} style={{ marginBottom: 4 }}>
                              • {x.question}
                            </div>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  ) : (
                    <div
                      style={{
                        marginTop: 10,
                        fontSize: 13,
                        color: "rgba(255,255,255,0.72)",
                      }}
                    >
                      ممتاز، مستوى الإجابات الحالي مناسب لإنتاج تحليل أقوى.
                    </div>
                  )}
                </div>

                {needsReanalysisHint ? (
                  <div style={{ ...styles.inlineWarnBox, marginTop: 10 }}>
                    <strong>تنبيه:</strong> هذه النتائج الحالية مبنية على التحليل السابق.
                    إذا عدّلت الإجابات أو الإضافة، اضغط
                    {" "}
                    <strong>ابدأ التحليل</strong>
                    {" "}
                    لتحديث النتائج.
                  </div>
                ) : null}

                <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
                  <button
                    style={styles.primaryBtn(loading)}
                    disabled={loading}
                    onClick={runAnalysis}
                  >
                    {loading ? "جاري التحليل..." : "ابدأ التحليل + القرار + التوصيات"}
                  </button>

                  {analysis ? (
                    <button
                      style={styles.secondaryBtn(loading)}
                      disabled={loading}
                      onClick={() => {
                        setUiError("");
                        setUiSuccess("");
                        setNeedsReanalysisHint(false);
                        setStage("done");
                      }}
                    >
                      الانتقال إلى النتائج الحالية
                    </button>
                  ) : null}

                  <button
                    style={styles.secondaryBtn(loading)}
                    disabled={loading}
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
                <h3 style={{ margin: 0, fontWeight: 900 }}>
                  5) المخرجات النهائية: التحليل والقرار والتوصيات
                </h3>

                <div style={{ marginTop: 12 }}>
                  <div style={styles.finalHeroCard}>
                    <div style={styles.finalHeroHead}>
                      <div style={styles.qTitle}>القرار التنفيذي</div>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                          flexDirection: "row",
                          flexWrap: "wrap",
                          width: "auto",
                        }}
                      >
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
                            width: "auto",
                            padding: "7px 10px",
                            borderRadius: 999,
                            fontSize: 12,
                            lineHeight: 1.1,
                            border: "1px solid rgba(255,255,255,0.14)",
                            background: "rgba(255,255,255,0.03)",
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
                          <div key={i} style={{ marginBottom: 6 }}>
                            • {x}
                          </div>
                        )
                      )
                    ) : (
                      <div style={{ color: "rgba(255,255,255,0.7)" }}>
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
                              <div
                                style={{
                                  marginTop: 10,
                                  color: "rgba(255,255,255,0.65)",
                                  fontSize: 13,
                                }}
                              >
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

                    <div
                      style={{
                        fontSize: 12,
                        color: "rgba(255,255,255,0.62)",
                        marginTop: 2,
                      }}
                    >
                      صياغة جاهزة للنسخ المباشر إلى Word مع الحفاظ على العناوين والفقرات.
                    </div>

                    <textarea
                      readOnly
                      value={reportText}
                      style={{
                        ...styles.textarea,
                        height: isMobile ? 360 : 340,
                        marginTop: 10,
                        padding: 16,
                        lineHeight: 1.9,
                        fontSize: isMobile ? 14 : 15,
                        fontFamily: "Tahoma, Arial, sans-serif",
                        border: "1px solid rgba(0, 229, 255, 0.14)",
                        background:
                          "linear-gradient(180deg, rgba(0,0,0,0.35), rgba(0,0,0,0.46))",
                      }}
                      placeholder="سيظهر هنا التقرير النهائي..."
                    />
                  </div>
                </div>

                <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
                  <button
                    style={styles.secondaryBtn(false)}
                    onClick={() => {
                      setStage("addition");
                      setNeedsReanalysisHint(true);
                      setUiSuccess("");
                      setUiError(
                        "عدّلت الرجوع قبل التحليل: إذا غيّرت الإجابات أو الإضافة، اضغط \"ابدأ التحليل\" مرة أخرى لتحديث النتائج."
                      );
                    }}
                  >
                    رجوع: تعديل قبل التحليل
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
                  <div style={{ fontSize: 13, color: "rgba(255,255,255,0.9)" }}>
                    نوع الجلسة: <strong>{mode}</strong>
                  </div>
                  <div style={{ marginTop: 8, fontSize: 13, color: "rgba(255,255,255,0.9)" }}>
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
              <div style={{ marginTop: 10 }}>
                <div style={styles.progressBar}>
                  <div
                    style={{
                      ...styles.progressFill,
                      width: `${progressPercent()}%`,
                    }}
                  />
                </div>
              </div>
              <div style={{ marginTop: 8, fontSize: 12, color: "rgba(255,255,255,0.72)" }}>
                {stageLabel()}
              </div>
            </div>

            <div style={styles.sideBlock}>
              <div style={styles.sideBlockTitle}>المستشارون المشاركون</div>
              <div
                style={{
                  fontSize: 13,
                  color: "rgba(255,255,255,0.9)",
                  lineHeight: 1.7,
                }}
              >
                {selectedAdvisorsSummary()}
              </div>
              <div style={{ marginTop: 8, fontSize: 12, color: "rgba(255,255,255,0.62)" }}>
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
                <div
                  style={{
                    marginTop: 10,
                    fontSize: 12,
                    color: "rgba(255,255,255,0.76)",
                    lineHeight: 1.5,
                  }}
                >
                  مدة الفعالية:{" "}
                  <strong style={{ color: "rgba(255,255,255,0.95)" }}>
                    {eventDurationSummary()?.label}
                  </strong>
                </div>
              ) : null}
            </div>

            {(stage === "addition" || stage === "done") ? (
              <div style={styles.sideBlock}>
                <div style={styles.sideBlockTitle}>جودة المدخلات</div>
                <div style={styles.qualityBadge(answerQuality.level)}>{answerQuality.level}</div>
                <div
                  style={{
                    marginTop: 8,
                    fontSize: 12,
                    color: "rgba(255,255,255,0.72)",
                    lineHeight: 1.5,
                  }}
                >
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
                <div style={{ ...styles.qTitle, marginBottom: 4 }}>
                  {analysis?.executive_decision?.decision ?? "—"}
                </div>
                <div style={{ fontSize: 12, color: "rgba(255,255,255,0.72)" }}>
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
                <div style={{ ...styles.metaItem, marginTop: 0 }}>
                  <span style={styles.k}>نوع الفعالية</span>
                  <span style={styles.v}>{eventType}</span>
                </div>
                <div style={{ ...styles.metaItem, marginTop: 0 }}>
                  <span style={styles.k}>وضع الجلسة</span>
                  <span style={styles.v}>{mode}</span>
                </div>
                <div style={{ ...styles.metaItem, marginTop: 0 }}>
                  <span style={styles.k}>الموقع</span>
                  <span style={styles.v}>{venueType}</span>
                </div>
                <div style={{ ...styles.metaItem, marginTop: 0 }}>
                  <span style={styles.k}>البداية</span>
                  <span style={styles.v}>{startAt ? "محدد" : "غير محدد"}</span>
                </div>
                <div style={{ ...styles.metaItem, marginTop: 0 }}>
                  <span style={styles.k}>النهاية</span>
                  <span style={styles.v}>{endAt ? "محدد" : "غير محدد"}</span>
                </div>
                <div style={{ ...styles.metaItem, marginTop: 0 }}>
                  <span style={styles.k}>الميزانية</span>
                  <span style={styles.v}>{budget?.trim() ? budget : "غير محدد"}</span>
                </div>
                <div style={{ ...styles.metaItem, marginTop: 0 }}>
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
              <div style={{ ...styles.metaItem, marginTop: 0, alignItems: "center" }}>
                <span style={styles.k}>الحفظ التلقائي</span>
                <span style={styles.v}>مفعل ✓</span>
              </div>
              <div style={{ marginTop: 10, fontSize: 12, color: "rgba(255,255,255,0.65)" }}>
                يتم حفظ التغييرات تلقائيًا أثناء العمل.
              </div>
              <div style={{ marginTop: 8, fontSize: 12, color: "rgba(255,255,255,0.65)" }}>
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
