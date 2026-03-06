import { createHash } from "node:crypto";
import OpenAI from "openai";
import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

type Stage = "questions" | "followups" | "dialogue" | "analysis";
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

const ADVISOR_LABELS: Record<AdvisorKey, string> = {
  financial_advisor: "المستشار المالي – محلل الاستدامة",
  regulatory_advisor: "المستشار التنظيمي – الحوكمة والامتثال",
  operations_advisor: "مستشار العمليات – التشغيل والتنفيذ",
  marketing_advisor: "مستشار التسويق – القيمة والطلب",
  risk_advisor: "مستشار المخاطر والاستراتيجية – موازن القرار",
};

type CacheEntry = {
  expiresAt: number;
  data: unknown;
};

const STAGE_CACHE_TTL_MS: Record<Stage, number> = {
  questions: 4 * 60 * 1000,
  followups: 4 * 60 * 1000,
  dialogue: 5 * 60 * 1000,
  analysis: 7 * 60 * 1000,
};
const MAX_STAGE_CACHE_ENTRIES = 120;
const stageCache = new Map<string, CacheEntry>();
const DEMO_MODE_ENABLED =
  process.env.NODE_ENV !== "production" && process.env.NEXT_PUBLIC_OMS_ALLOW_DEMO_MODE === "true";
let openaiClient: OpenAI | null = null;

function normalizeReportText(text: string) {
  const toArabicDigits = (value: string) =>
    value.replace(/\d/g, (d) => "٠١٢٣٤٥٦٧٨٩"[Number(d)]);

  return text
    .split("\n")
    .map((line) => {
      let next = line.trimEnd();

      // Remove common AI artifacts like quoted lines and raw question IDs in report prose.
      next = next.replace(/^\s*["“”']+\s*/, "");
      next = next.replace(/\s*["“”']+\s*$/, "");

      // Convert technical question labels to readable report labels (supports markdown forms).
      next = next.replace(
        /^\s*(?:\*\*\s*)?(Q|F)\s*(\d+)(?:\s*\*\*)?\s*[:\-]?\s*/i,
        (_match, _label, num: string) => `- سؤال ${toArabicDigits(num)}: `
      );
      next = next.replace(
        /^\s*(?:\*\*\s*)?A\s*(\d+)(?:\s*\*\*)?\s*[:\-]?\s*/i,
        (_match, num: string) => `  إجابة ${toArabicDigits(num)}: `
      );

      // Remove bold markdown markers left around labels/content.
      next = next.replace(/\*\*/g, "");

      return next;
    })
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function jsonError(status: number, error: string, code: string) {
  return NextResponse.json({ ok: false, error, code }, { status });
}

async function canAccessStrategyApi() {
  const clerkConfigured = Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY);
  if (!clerkConfigured) return DEMO_MODE_ENABLED;

  try {
    const authResult = await auth();
    return Boolean(authResult.userId);
  } catch {
    return false;
  }
}

function getOpenAIClient() {
  if (!openaiClient) {
    openaiClient = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
  return openaiClient;
}

function stableSerialize(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) {
    return `[${value.map((item) => stableSerialize(item)).join(",")}]`;
  }
  const record = value as Record<string, unknown>;
  const keys = Object.keys(record).sort();
  const parts = keys.map((key) => `${JSON.stringify(key)}:${stableSerialize(record[key])}`);
  return `{${parts.join(",")}}`;
}

function buildStageCacheKey(stage: Stage, payload: unknown) {
  const serialized = stableSerialize(payload);
  const digest = createHash("sha256").update(serialized).digest("hex");
  return `${stage}:${digest}`;
}

function pruneStageCache() {
  const now = Date.now();
  for (const [key, entry] of stageCache.entries()) {
    if (entry.expiresAt <= now) {
      stageCache.delete(key);
    }
  }

  while (stageCache.size > MAX_STAGE_CACHE_ENTRIES) {
    const firstKey = stageCache.keys().next().value;
    if (!firstKey) break;
    stageCache.delete(firstKey);
  }
}

function getCachedStageData(stage: Stage, cacheKey: string) {
  pruneStageCache();
  const entry = stageCache.get(cacheKey);
  if (!entry) return null;
  if (entry.expiresAt <= Date.now()) {
    stageCache.delete(cacheKey);
    return null;
  }
  return entry.data;
}

function setCachedStageData(stage: Stage, cacheKey: string, data: unknown) {
  pruneStageCache();
  stageCache.set(cacheKey, {
    data,
    expiresAt: Date.now() + STAGE_CACHE_TTL_MS[stage],
  });
}

async function requestModelJson(client: OpenAI, prompt: string) {
  const resp = await client.responses.create({
    model: "gpt-4o-mini",
    input: prompt,
    text: { format: { type: "json_object" } },
  });
  return JSON.parse(resp.output_text) as Record<string, unknown>;
}

export async function POST(req: Request) {
  try {
    if (!(await canAccessStrategyApi())) {
      return jsonError(401, "تسجيل الدخول مطلوب للوصول إلى التحليل الاستراتيجي.", "AUTH_REQUIRED");
    }

    if (!process.env.OPENAI_API_KEY) {
      return jsonError(500, "مفتاح OPENAI_API_KEY غير موجود في إعدادات البيئة.", "CONFIG_MISSING_OPENAI_KEY");
    }

    const client = getOpenAIClient();

    const body = await req.json();

    const stage: Stage = body.stage;
    const eventType = body.eventType ?? "فعالية موسمية";
    const mode = body.mode ?? "مراجعة تنفيذية سريعة";
    const project = body.project ?? "";
    const selectedAdvisorsRaw = Array.isArray(body.selectedAdvisors)
      ? body.selectedAdvisors
      : ALL_ADVISOR_KEYS;

    // ✅ NEW FIELDS
    const startAt = body.startAt ?? ""; // datetime-local string
    const endAt = body.endAt ?? ""; // datetime-local string
    const budget = body.budget ?? ""; // optional string/number
    const venueType = body.venueType ?? "غير محدد"; // منتجع/فندق/قاعة/مساحة عامة/غير محدد

    const answers = body.answers ?? [];
    const dialogue = body.dialogue ?? [];
    const userAddition = body.userAddition ?? "";
    const selectedAdvisors = selectedAdvisorsRaw.filter((x: unknown): x is AdvisorKey =>
      ALL_ADVISOR_KEYS.includes(x as AdvisorKey)
    );

    if (!project?.trim()) {
      return jsonError(400, "حقل بيانات المشروع مطلوب قبل بدء التحليل.", "PROJECT_REQUIRED");
    }
    if (selectedAdvisors.length === 0) {
      return jsonError(400, "يجب اختيار مستشار واحد على الأقل.", "ADVISOR_REQUIRED");
    }

    const cacheKey = buildStageCacheKey(stage, {
      stage,
      eventType,
      mode,
      project,
      selectedAdvisors,
      startAt,
      endAt,
      budget,
      venueType,
      answers,
      dialogue,
      userAddition,
    });
    const cachedData = getCachedStageData(stage, cacheKey);
    if (cachedData) {
      return NextResponse.json({ ok: true, data: cachedData });
    }

    const activeAdvisorKeysText = selectedAdvisors
      .map((x: AdvisorKey) => `"${x}"`)
      .join(" | ");
    const activeAdvisorListText = selectedAdvisors
      .map((x: AdvisorKey) => `- ${ADVISOR_LABELS[x]} (${x})`)
      .join("\n");
    const advisorRecommendationShape = selectedAdvisors
      .map(
        (key: AdvisorKey) =>
          `"${key}": { "recommendations": [], "strategic_warning": "" }`
      )
      .join(",\n    ");

    const context = `
معلومات إضافية مهمة للمجلس:
- نوع الموقع: ${venueType}
- بداية الفعالية: ${startAt || "غير محدد"}
- نهاية الفعالية: ${endAt || "غير محدد"}
- الميزانية المرصودة: ${budget ? budget : "غير محدد / اختياري"}

ملاحظة:
- إذا التاريخ/الوقت غير محدد: اعتبره "فجوة معلومات" واطلبه ضمن الأسئلة/المتابعة.
- إذا الميزانية غير محددة: لا تفترض رقم، اطلب نطاق أو سقف إن احتجت.
`;

    const base = `
أنت مجلس استشاري تنفيذي متخصص في صناعة الفعاليات والمعارض والمؤتمرات في السوق السعودي.
المجلس لا يبحث عن الخطأ… بل عن النسخة الأقوى من المشروع.

نوع الفعالية: ${eventType}
وضع الجلسة: ${mode}
بيانات المشروع: ${project}

${context}

قواعد عامة:
- لغة عربية مهنية واضحة.
- نقاط قصيرة عملية (ماذا نفعل؟ وكيف؟).
- ممنوع أي نص خارج JSON.
- التزم فقط بالمستشارين المشاركين في هذه الجلسة.

المستشارون المشاركون في هذه الجلسة:
${activeAdvisorListText}
`;

    // ✅ 1) الجولة الأولى
    if (stage === "questions") {
      const prompt = `
${base}

مهمتك الآن: إنتاج "أسئلة الجولة الأولى" لتأسيس قرار قوي.
الأسئلة يجب أن تكون:
- محددة وليست عامة
- تخدم التحليل والقرار والتوصيات
- تراعي (الموقع + مدة/توقيت الفعالية + الميزانية إن وجدت)

أخرج JSON بهذا الشكل حرفيًا:

{
  "questions": [
    {
      "id": "Q1",
      "advisor_key": "financial_advisor",
      "advisor_name": "المستشار المالي – محلل الاستدامة",
      "question": "",
      "intent": ""
    }
  ],
  "note_to_user": ""
}

شروط:
- عدد أسئلة الجولة الأولى:
  - إذا mode = "تحليل معمّق": 8 إلى 10 أسئلة
  - إذا mode = "مراجعة تنفيذية سريعة": 5 إلى 6 أسئلة
- advisor_key:
${activeAdvisorKeysText}
- intent سطر واحد يوضح لماذا السؤال مهم.
- note_to_user: سطرين فقط.
`;

      const data = await requestModelJson(client, prompt);
      if (typeof data?.report_text === "string") {
        data.report_text = normalizeReportText(data.report_text);
      }
      setCachedStageData(stage, cacheKey, data);

      return NextResponse.json({ ok: true, data });
    }

    // ✅ 2) Follow-ups
    if (stage === "followups") {
      const prompt = `
${base}

إجابات المستخدم على أسئلة الجولة الأولى (JSON):
${JSON.stringify(answers, null, 2)}

مهمتك الآن:
- توليد "أسئلة متابعة Follow-ups" قصيرة جداً ومركزة
- تبنى على الإجابات أو النواقص
- سد فجوات: (مدة/توقيت) و(نوع الموقع) و(ميزانية) إذا كانت مؤثرة

أخرج JSON بهذا الشكل حرفيًا:

{
  "followups": [
    {
      "id": "F1",
      "advisor_key": "risk_advisor",
      "advisor_name": "مستشار المخاطر والاستراتيجية – موازن القرار",
      "question": "",
      "intent": ""
    }
  ],
  "why_these_followups": []
}

شروط:
- عدد أسئلة المتابعة:
  - إذا mode = "تحليل معمّق": 3 إلى 5
  - إذا mode = "مراجعة تنفيذية سريعة": 2 إلى 3
- why_these_followups: 2 إلى 4 نقاط.
- advisor_key يجب أن يكون فقط من المستشارين المشاركين.
`;

      const data = await requestModelJson(client, prompt);
      setCachedStageData(stage, cacheKey, data);
      return NextResponse.json({ ok: true, data });
    }

    // ✅ 3) الحوار
    if (stage === "dialogue") {
      const prompt = `
${base}

إجابات المستخدم (الجولة الأولى + المتابعة) (JSON):
${JSON.stringify(answers, null, 2)}

مهمتك الآن: حوار استشاري بين المستشارين يعتمد على الإجابات + (المدة/التوقيت + نوع الموقع + الميزانية إن وجدت).
أبرز تضارب الأولويات، واطلع نقاط قبل القرار.

أخرج JSON بهذا الشكل حرفيًا:

{
  "council_dialogue": [
    { "advisor": "financial_advisor", "statement": "" }
  ],
  "open_issues": []
}

شروط:
- إذا mode = "تحليل معمّق": 10 إلى 16 مداخلة
- إذا mode = "مراجعة تنفيذية سريعة": 6 إلى 9 مداخلات
- open_issues: 3 إلى 7 نقاط مختصرة.
- advisor داخل council_dialogue يجب أن يكون فقط من المستشارين المشاركين.
`;

      const data = await requestModelJson(client, prompt);
      setCachedStageData(stage, cacheKey, data);
      return NextResponse.json({ ok: true, data });
    }

    // ✅ 4) التحليل
    if (stage === "analysis") {
      const prompt = `
${base}

إجابات المستخدم (JSON):
${JSON.stringify(answers, null, 2)}

حوار المجلس (JSON):
${JSON.stringify(dialogue, null, 2)}

إضافة المستخدم (إن وجدت):
${userAddition?.trim() ? userAddition : "لا يوجد"}

مهمتك الآن:
1) التحليل الشامل (مع مراعاة المدة/التوقيت + نوع الموقع + الميزانية إن وجدت)
2) القرار التنفيذي
3) توصيات المستشارين
4) report_text جاهز للنسخ إلى Word بعناوين واضحة

أخرج JSON بهذا الشكل حرفيًا:

{
  "strategic_analysis": {
    "strengths": [],
    "amplification_opportunities": [],
    "gaps": [],
    "risks": [],
    "readiness_level": "",
    "top_3_upgrades": []
  },
  "executive_decision": {
    "decision": "",
    "reason_1": "",
    "reason_2": ""
  },
  "advisor_recommendations": {
    ${advisorRecommendationShape}
  },
  "report_text": ""
}

شروط:
- readiness_level: "مبدئي" | "متوسط" | "متقدم" | "جاهز"
- decision:
"جاهز للتنفيذ" | "جاهز بعد تحسينات محددة" | "يحتاج إعادة ضبط استراتيجية" | "يحتاج إعادة دراسة شاملة"
- report_text بعناوين:
(ملخص تنفيذي / معلومات الفعالية / أسئلة وإجابات / حوار المجلس / التحليل / القرار / توصيات المستشارين)
- ضمن "معلومات الفعالية" اذكر: نوع الموقع + البداية + النهاية + الميزانية (إن وجدت).
- في "أسئلة وإجابات": اكتب السؤال والإجابة بصياغة بشرية مرتبة، بدون معرفات تقنية مثل Q1/F1.
- لا تستخدم علامات تنصيص حول الأسطر أو العناوين داخل report_text إلا عند نقل اقتباس حرفي (نادر).
- اجعل report_text تقريرًا مهنيًا جاهزًا للنسخ، وليس عرضًا لبيانات JSON.
- advisor_recommendations يجب أن تتضمن فقط المستشارين المشاركين في هذه الجلسة.
`;

      const data = await requestModelJson(client, prompt);
      setCachedStageData(stage, cacheKey, data);
      return NextResponse.json({ ok: true, data });
    }

    return jsonError(400, "المرحلة المطلوبة غير صالحة.", "INVALID_STAGE");
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return jsonError(500, `تعذر تنفيذ الطلب الآن: ${message}`, "STRATEGY_API_FAILURE");
  }
}
