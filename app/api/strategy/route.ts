import OpenAI from "openai";
import { NextResponse } from "next/server";

type Stage = "questions" | "followups" | "dialogue" | "analysis";

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

export async function POST(req: Request) {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { ok: false, error: "Missing OPENAI_API_KEY in .env.local" },
        { status: 500 }
      );
    }

    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const body = await req.json();

    const stage: Stage = body.stage;
    const eventType = body.eventType ?? "فعالية موسمية";
    const mode = body.mode ?? "مراجعة تنفيذية سريعة";
    const project = body.project ?? "";

    // ✅ NEW FIELDS
    const startAt = body.startAt ?? ""; // datetime-local string
    const endAt = body.endAt ?? ""; // datetime-local string
    const budget = body.budget ?? ""; // optional string/number
    const venueType = body.venueType ?? "غير محدد"; // منتجع/فندق/قاعة/مساحة عامة/غير محدد

    const answers = body.answers ?? [];
    const dialogue = body.dialogue ?? [];
    const userAddition = body.userAddition ?? "";

    if (!project?.trim()) {
      return NextResponse.json(
        { ok: false, error: "project is required" },
        { status: 400 }
      );
    }

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
"financial_advisor" | "regulatory_advisor" | "operations_advisor" | "marketing_advisor" | "risk_advisor"
- intent سطر واحد يوضح لماذا السؤال مهم.
- note_to_user: سطرين فقط.
`;

      const resp = await client.responses.create({
        model: "gpt-4o-mini",
        input: prompt,
        text: { format: { type: "json_object" } },
      });
      const data = JSON.parse(resp.output_text);
      if (typeof data?.report_text === "string") {
        data.report_text = normalizeReportText(data.report_text);
      }

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
`;

      const resp = await client.responses.create({
        model: "gpt-4o-mini",
        input: prompt,
        text: { format: { type: "json_object" } },
      });

      return NextResponse.json({ ok: true, data: JSON.parse(resp.output_text) });
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
`;

      const resp = await client.responses.create({
        model: "gpt-4o-mini",
        input: prompt,
        text: { format: { type: "json_object" } },
      });

      return NextResponse.json({ ok: true, data: JSON.parse(resp.output_text) });
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
    "financial_advisor": { "recommendations": [], "strategic_warning": "" },
    "regulatory_advisor": { "recommendations": [], "strategic_warning": "" },
    "operations_advisor": { "recommendations": [], "strategic_warning": "" },
    "marketing_advisor": { "recommendations": [], "strategic_warning": "" },
    "risk_advisor": { "recommendations": [], "strategic_warning": "" }
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
`;

      const resp = await client.responses.create({
        model: "gpt-4o-mini",
        input: prompt,
        text: { format: { type: "json_object" } },
      });

      return NextResponse.json({ ok: true, data: JSON.parse(resp.output_text) });
    }

    return NextResponse.json({ ok: false, error: "Invalid stage" }, { status: 400 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json(
      { ok: false, error: message },
      { status: 500 }
    );
  }
}
