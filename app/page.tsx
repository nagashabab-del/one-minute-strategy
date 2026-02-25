"use client";

import { useMemo, useState } from "react";

type AdvisorKey =
  | "financial_advisor"
  | "regulatory_advisor"
  | "operations_advisor"
  | "marketing_advisor"
  | "risk_advisor";

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

type DialogueLine = { advisor: string; statement: string };

type StageUI =
  | "init"
  | "round1"
  | "round2"
  | "dialogue"
  | "addition"
  | "done";

function advisorLabel(key: string) {
  switch (key) {
    case "financial_advisor":
      return "المستشار المالي – محلل الاستدامة";
    case "regulatory_advisor":
      return "المستشار التنظيمي – ضابط الحوكمة";
    case "operations_advisor":
      return "مستشار العمليات – مهندس التنفيذ";
    case "marketing_advisor":
      return "مستشار القيمة والتسويق – باني الأثر";
    case "risk_advisor":
      return "مستشار المخاطر والاستراتيجية – موازن القرار";
    default:
      return key;
  }
}

export default function Home() {
  const [eventType, setEventType] = useState("فعالية موسمية");
  const [mode, setMode] = useState("مراجعة تنفيذية سريعة");

  // ✅ NEW INPUTS
  const [venueType, setVenueType] = useState<"منتجع" | "فندق" | "قاعة" | "مساحة عامة" | "غير محدد">("غير محدد");
  const [startAt, setStartAt] = useState(""); // datetime-local
  const [endAt, setEndAt] = useState(""); // datetime-local
  const [budget, setBudget] = useState(""); // optional

  const [project, setProject] = useState("");

  const [stage, setStage] = useState<StageUI>("init");
  const [loading, setLoading] = useState(false);

  const [round1Questions, setRound1Questions] = useState<Question[]>([]);
  const [followupQuestions, setFollowupQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [dialogue, setDialogue] = useState<DialogueLine[]>([]);
  const [openIssues, setOpenIssues] = useState<string[]>([]);

  const [hasAddition, setHasAddition] = useState<"yes" | "no">("no");
  const [userAddition, setUserAddition] = useState("");

  const [analysis, setAnalysis] = useState<any>(null);
  const [reportText, setReportText] = useState("");

  const canStart = project.trim().length > 0;

  async function callAPI(payload: any) {
    const res = await fetch("/api/strategy", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    return await res.json();
  }

  function commonPayload() {
    return {
      eventType,
      mode,
      venueType,
      startAt,
      endAt,
      budget: budget.trim() ? budget : "",
      project,
    };
  }

  async function startSession() {
    if (!canStart) return;

    setLoading(true);
    setStage("round1");

    setRound1Questions([]);
    setFollowupQuestions([]);
    setAnswers([]);
    setDialogue([]);
    setOpenIssues([]);
    setAnalysis(null);
    setReportText("");
    setHasAddition("no");
    setUserAddition("");

    const json = await callAPI({
      stage: "questions",
      ...commonPayload(),
    });

    setLoading(false);

    if (!json?.ok) {
      alert(json?.error || "حدث خطأ");
      setStage("init");
      return;
    }

    const qs: Question[] = json.data.questions || [];
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

  function filledRatio(forIds: string[]) {
    const subset = answers.filter((a) => forIds.includes(a.id));
    if (subset.length === 0) return 0;
    const filled = subset.filter((a) => a.answer.trim().length > 0).length;
    return filled / subset.length;
  }

  async function submitRound1() {
    const ids = round1Questions.map((q) => q.id);
    if (filledRatio(ids) < 0.6) {
      alert("جاوب على أغلب أسئلة الجولة الأولى (على الأقل 60%).");
      return;
    }

    setLoading(true);

    const round1Answers = answers.filter((a) => ids.includes(a.id));

    const json = await callAPI({
      stage: "followups",
      ...commonPayload(),
      answers: round1Answers,
    });

    setLoading(false);

    if (!json?.ok) {
      alert(json?.error || "حدث خطأ");
      return;
    }

    const fs: Question[] = json.data.followups || [];
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
    if (ids.length > 0 && filledRatio(ids) < 0.6) {
      alert("جاوب على أغلب أسئلة المتابعة (على الأقل 60%).");
      return;
    }

    await buildDialogue();
  }

  async function buildDialogue() {
    setLoading(true);

    const json = await callAPI({
      stage: "dialogue",
      ...commonPayload(),
      answers,
    });

    setLoading(false);

    if (!json?.ok) {
      alert(json?.error || "حدث خطأ");
      return;
    }

    setDialogue(json.data.council_dialogue || []);
    setOpenIssues(json.data.open_issues || []);
    setStage("dialogue");
  }

  async function runAnalysis() {
    setLoading(true);

    const json = await callAPI({
      stage: "analysis",
      ...commonPayload(),
      answers,
      dialogue,
      userAddition: hasAddition === "yes" ? userAddition : "",
    });

    setLoading(false);

    if (!json?.ok) {
      alert(json?.error || "حدث خطأ");
      return;
    }

    setAnalysis(json.data);
    setReportText(json.data.report_text || "");
    setStage("done");
  }

  async function copyReport() {
    if (!reportText?.trim()) return;
    await navigator.clipboard.writeText(reportText);
    alert("تم نسخ التقرير ✅");
  }

  const styles = useMemo(
    () => ({
      page: {
        minHeight: "100vh",
        background:
          "radial-gradient(1200px 600px at 20% 0%, rgba(137, 94, 255, 0.18), transparent 60%), radial-gradient(900px 500px at 80% 10%, rgba(0, 255, 150, 0.08), transparent 55%), #070a10",
        color: "white",
      } as React.CSSProperties,
      container: { maxWidth: 980, margin: "0 auto", padding: 24 } as React.CSSProperties,
      card: {
        background: "#0b0f17",
        border: "1px solid rgba(255,255,255,0.08)",
        borderRadius: 12,
        padding: 16,
        marginTop: 14,
      } as React.CSSProperties,
      label: { fontSize: 13, color: "rgba(255,255,255,0.8)" },
      input: {
        width: "100%",
        marginTop: 6,
        padding: 10,
        borderRadius: 10,
        background: "#0b0f17",
        color: "white",
        border: "1px solid rgba(255,255,255,0.12)",
      } as React.CSSProperties,
      textarea: {
        width: "100%",
        height: 140,
        marginTop: 6,
        padding: 12,
        borderRadius: 12,
        background: "#0b0f17",
        color: "white",
        border: "1px solid rgba(255,255,255,0.12)",
        outline: "none",
        fontSize: 15,
        lineHeight: 1.6,
      } as React.CSSProperties,
      button: (disabled: boolean) =>
        ({
          padding: "10px 16px",
          borderRadius: 12,
          border: "1px solid rgba(255,255,255,0.16)",
          background: disabled ? "rgba(255,255,255,0.08)" : "#1a2335",
          color: "white",
          cursor: disabled ? "not-allowed" : "pointer",
          fontSize: 15,
        } as React.CSSProperties),
      pill: {
        display: "inline-block",
        padding: "6px 10px",
        borderRadius: 999,
        background: "rgba(255,255,255,0.08)",
        border: "1px solid rgba(255,255,255,0.10)",
        fontSize: 13,
      } as React.CSSProperties,
      box: {
        padding: 12,
        borderRadius: 12,
        background: "rgba(255,255,255,0.06)",
        border: "1px solid rgba(255,255,255,0.08)",
        marginTop: 12,
      } as React.CSSProperties,
      hint: { fontSize: 12, color: "rgba(255,255,255,0.65)", marginTop: 6 },
    }),
    []
  );

  return (
    <main style={styles.page} dir="rtl">
      <div style={styles.container}>
        <header>
          <h1 style={{ margin: 0, fontSize: 24 }}>One Minute Strategy 🚀</h1>
          <p style={{ marginTop: 6, color: "rgba(255,255,255,0.75)" }}>
            مدخلات إضافية مهمة (المدة/التوقيت + نوع الموقع + ميزانية اختيارية) لرفع جودة الاستشارة
          </p>
          <div style={{ marginTop: 8 }}>
            <span style={styles.pill}>المرحلة: {stage}</span>
          </div>
        </header>

        {/* الإعدادات الأساسية */}
        <section style={styles.card}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <div style={styles.label}>نوع الفعالية</div>
              <select
                value={eventType}
                onChange={(e) => setEventType(e.target.value)}
                style={styles.input}
                disabled={loading || stage !== "init"}
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
              <div style={styles.label}>وضع الجلسة</div>
              <select
                value={mode}
                onChange={(e) => setMode(e.target.value)}
                style={styles.input}
                disabled={loading || stage !== "init"}
              >
                <option>مراجعة تنفيذية سريعة</option>
                <option>تحليل معمّق</option>
              </select>
            </div>
          </div>

          {/* ✅ NEW ROW */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 12 }}>
            <div>
              <div style={styles.label}>نوع الموقع</div>
              <select
                value={venueType}
                onChange={(e) => setVenueType(e.target.value as any)}
                style={styles.input}
                disabled={loading || stage !== "init"}
              >
                <option value="غير محدد">غير محدد</option>
                <option value="منتجع">منتجع</option>
                <option value="فندق">فندق</option>
                <option value="قاعة">قاعة</option>
                <option value="مساحة عامة">مساحة عامة</option>
              </select>
              <div style={styles.hint}>يساعد المجلس في التصاريح والتشغيل وتجربة الزائر.</div>
            </div>

            <div>
              <div style={styles.label}>الميزانية المرصودة (اختياري)</div>
              <input
                value={budget}
                onChange={(e) => setBudget(e.target.value)}
                placeholder="مثال: 250000 أو (250–400 ألف)"
                style={styles.input}
                disabled={loading || stage !== "init"}
              />
              <div style={styles.hint}>إذا ما عندك رقم، اتركها فاضية.</div>
            </div>
          </div>

          {/* ✅ NEW ROW */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 12 }}>
            <div>
              <div style={styles.label}>بداية الفعالية</div>
              <input
                type="datetime-local"
                value={startAt}
                onChange={(e) => setStartAt(e.target.value)}
                style={styles.input}
                disabled={loading || stage !== "init"}
              />
            </div>

            <div>
              <div style={styles.label}>نهاية الفعالية</div>
              <input
                type="datetime-local"
                value={endAt}
                onChange={(e) => setEndAt(e.target.value)}
                style={styles.input}
                disabled={loading || stage !== "init"}
              />
            </div>
          </div>
          <div style={styles.hint}>
            المدة والتوقيت تأثر على التشغيل، التعاقدات، التسويق، وتوقعات الحضور.
          </div>

          <div style={{ marginTop: 12 }}>
            <div style={styles.label}>بيانات المشروع</div>
            <textarea
              value={project}
              onChange={(e) => setProject(e.target.value)}
              placeholder="اكتب وصف الفعالية: الهدف، الفكرة، الجمهور، نموذج الإيرادات، الرعاة، التكاليف..."
              style={styles.textarea}
              disabled={loading || stage !== "init"}
            />
          </div>

          <div style={{ display: "flex", gap: 10, marginTop: 12 }}>
            <button
              onClick={async () => {
                if (!canStart) return;
                setLoading(true);
                setStage("round1");

                setRound1Questions([]);
                setFollowupQuestions([]);
                setAnswers([]);
                setDialogue([]);
                setOpenIssues([]);
                setAnalysis(null);
                setReportText("");
                setHasAddition("no");
                setUserAddition("");

                const json = await (async () => {
                  const res = await fetch("/api/strategy", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      stage: "questions",
                      eventType,
                      mode,
                      venueType,
                      startAt,
                      endAt,
                      budget: budget.trim() ? budget : "",
                      project,
                    }),
                  });
                  return await res.json();
                })();

                setLoading(false);

                if (!json?.ok) {
                  alert(json?.error || "حدث خطأ");
                  setStage("init");
                  return;
                }

                const qs: Question[] = json.data.questions || [];
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
              }}
              disabled={loading || stage !== "init" || !canStart}
              style={styles.button(loading || stage !== "init" || !canStart)}
            >
              {loading ? "..." : "ابدأ الجلسة"}
            </button>
          </div>
        </section>

        {/* الجولة الأولى */}
        {stage === "round1" && (
          <section style={styles.card}>
            <h2 style={{ marginTop: 0 }}>1) أسئلة الجولة الأولى</h2>

            {round1Questions.map((q) => {
              const a = answers.find((x) => x.id === q.id);
              return (
                <div key={q.id} style={styles.box}>
                  <div style={{ fontWeight: 900 }}>{q.advisor_name}</div>
                  <div style={{ marginTop: 6 }}>• {q.question}</div>
                  <div style={{ marginTop: 6, color: "rgba(255,255,255,0.75)", fontSize: 13 }}>
                    لماذا مهم؟ {q.intent}
                  </div>
                  <textarea
                    value={a?.answer ?? ""}
                    onChange={(e) => {
                      const val = e.target.value;
                      setAnswers((prev) => prev.map((x) => (x.id === q.id ? { ...x, answer: val } : x)));
                    }}
                    placeholder="اكتب إجابتك..."
                    style={{ ...styles.textarea, height: 90 }}
                  />
                </div>
              );
            })}

            <div style={{ display: "flex", gap: 10, marginTop: 12 }}>
              <button
                onClick={async () => {
                  const ids = round1Questions.map((q) => q.id);
                  const subset = answers.filter((a) => ids.includes(a.id));
                  const filled = subset.filter((a) => a.answer.trim().length > 0).length;
                  if (subset.length > 0 && filled / subset.length < 0.6) {
                    alert("جاوب على أغلب أسئلة الجولة الأولى (على الأقل 60%).");
                    return;
                  }

                  setLoading(true);

                  const json = await (async () => {
                    const res = await fetch("/api/strategy", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        stage: "followups",
                        eventType,
                        mode,
                        venueType,
                        startAt,
                        endAt,
                        budget: budget.trim() ? budget : "",
                        project,
                        answers: subset,
                      }),
                    });
                    return await res.json();
                  })();

                  setLoading(false);

                  if (!json?.ok) {
                    alert(json?.error || "حدث خطأ");
                    return;
                  }

                  const fs: Question[] = json.data.followups || [];
                  setFollowupQuestions(fs);

                  if (fs.length === 0) {
                    // go dialogue
                    setLoading(true);
                    const j2 = await (async () => {
                      const res = await fetch("/api/strategy", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                          stage: "dialogue",
                          eventType,
                          mode,
                          venueType,
                          startAt,
                          endAt,
                          budget: budget.trim() ? budget : "",
                          project,
                          answers,
                        }),
                      });
                      return await res.json();
                    })();
                    setLoading(false);

                    if (!j2?.ok) {
                      alert(j2?.error || "حدث خطأ");
                      return;
                    }

                    setDialogue(j2.data.council_dialogue || []);
                    setOpenIssues(j2.data.open_issues || []);
                    setStage("dialogue");
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
                }}
                disabled={loading}
                style={styles.button(loading)}
              >
                {loading ? "..." : "التالي: Follow-ups"}
              </button>
            </div>
          </section>
        )}

        {/* المتابعة */}
        {stage === "round2" && (
          <section style={styles.card}>
            <h2 style={{ marginTop: 0 }}>2) Follow-ups (أسئلة متابعة)</h2>

            {followupQuestions.map((q) => {
              const a = answers.find((x) => x.id === q.id);
              return (
                <div key={q.id} style={styles.box}>
                  <div style={{ fontWeight: 900 }}>{q.advisor_name}</div>
                  <div style={{ marginTop: 6 }}>• {q.question}</div>
                  <div style={{ marginTop: 6, color: "rgba(255,255,255,0.75)", fontSize: 13 }}>
                    لماذا مهم؟ {q.intent}
                  </div>
                  <textarea
                    value={a?.answer ?? ""}
                    onChange={(e) => {
                      const val = e.target.value;
                      setAnswers((prev) => prev.map((x) => (x.id === q.id ? { ...x, answer: val } : x)));
                    }}
                    placeholder="اكتب إجابتك..."
                    style={{ ...styles.textarea, height: 90 }}
                  />
                </div>
              );
            })}

            <div style={{ display: "flex", gap: 10, marginTop: 12 }}>
              <button
                onClick={async () => {
                  const ids = followupQuestions.map((q) => q.id);
                  const subset = answers.filter((a) => ids.includes(a.id));
                  const filled = subset.filter((a) => a.answer.trim().length > 0).length;
                  if (subset.length > 0 && filled / subset.length < 0.6) {
                    alert("جاوب على أغلب أسئلة المتابعة (على الأقل 60%).");
                    return;
                  }

                  setLoading(true);
                  const j2 = await (async () => {
                    const res = await fetch("/api/strategy", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        stage: "dialogue",
                        eventType,
                        mode,
                        venueType,
                        startAt,
                        endAt,
                        budget: budget.trim() ? budget : "",
                        project,
                        answers,
                      }),
                    });
                    return await res.json();
                  })();
                  setLoading(false);

                  if (!j2?.ok) {
                    alert(j2?.error || "حدث خطأ");
                    return;
                  }

                  setDialogue(j2.data.council_dialogue || []);
                  setOpenIssues(j2.data.open_issues || []);
                  setStage("dialogue");
                }}
                disabled={loading}
                style={styles.button(loading)}
              >
                {loading ? "..." : "التالي: حوار المستشارين"}
              </button>
            </div>
          </section>
        )}

        {/* الحوار */}
        {stage === "dialogue" && (
          <section style={styles.card}>
            <h2 style={{ marginTop: 0 }}>3) حوار المستشارين</h2>

            <div style={{ display: "grid", gap: 10, marginTop: 10 }}>
              {dialogue.map((m, i) => (
                <div key={i} style={styles.box}>
                  <div style={{ fontWeight: 900 }}>{advisorLabel(m.advisor)}</div>
                  <div style={{ marginTop: 6 }}>{m.statement}</div>
                </div>
              ))}
            </div>

            {openIssues?.length ? (
              <div style={{ marginTop: 14 }}>
                <div style={{ fontWeight: 900, marginBottom: 8 }}>نقاط مفتوحة قبل القرار</div>
                {openIssues.map((x, i) => (
                  <div key={i} style={{ marginBottom: 6 }}>• {x}</div>
                ))}
              </div>
            ) : null}

            <div style={{ display: "flex", gap: 10, marginTop: 12 }}>
              <button onClick={() => setStage("addition")} style={styles.button(false)}>
                التالي: هل لديك إضافة؟
              </button>
            </div>
          </section>
        )}

        {/* الإضافة */}
        {stage === "addition" && (
          <section style={styles.card}>
            <h2 style={{ marginTop: 0 }}>4) قبل التحليل: هل لديك إضافة؟</h2>

            <div style={{ display: "flex", gap: 14, marginTop: 10 }}>
              <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <input type="radio" checked={hasAddition === "no"} onChange={() => setHasAddition("no")} />
                لا يوجد
              </label>

              <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <input type="radio" checked={hasAddition === "yes"} onChange={() => setHasAddition("yes")} />
                يوجد إضافة
              </label>
            </div>

            {hasAddition === "yes" && (
              <textarea
                value={userAddition}
                onChange={(e) => setUserAddition(e.target.value)}
                placeholder="اكتب الإضافة (ميزانية/موقع/مدة/بوثات/تسعير/راعي محتمل...)"
                style={{ ...styles.textarea, height: 110 }}
              />
            )}

            <div style={{ display: "flex", gap: 10, marginTop: 12 }}>
              <button
                onClick={async () => {
                  setLoading(true);
                  const j = await (async () => {
                    const res = await fetch("/api/strategy", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        stage: "analysis",
                        eventType,
                        mode,
                        venueType,
                        startAt,
                        endAt,
                        budget: budget.trim() ? budget : "",
                        project,
                        answers,
                        dialogue,
                        userAddition: hasAddition === "yes" ? userAddition : "",
                      }),
                    });
                    return await res.json();
                  })();
                  setLoading(false);

                  if (!j?.ok) {
                    alert(j?.error || "حدث خطأ");
                    return;
                  }

                  setAnalysis(j.data);
                  setReportText(j.data.report_text || "");
                  setStage("done");
                }}
                disabled={loading}
                style={styles.button(loading)}
              >
                {loading ? "..." : "ابدأ التحليل والقرار والتوصيات"}
              </button>
            </div>
          </section>
        )}

        {/* النتيجة */}
        {stage === "done" && analysis && (
          <>
            <section style={styles.card}>
              <h2 style={{ marginTop: 0 }}>5) التحليل الشامل</h2>
              <div style={{ marginTop: 8 }}>
                <span style={styles.pill}>مستوى الجاهزية: {analysis.strategic_analysis.readiness_level}</span>
              </div>

              <div style={styles.hint}>
                معلومات الفعالية: {venueType} — {startAt || "بداية غير محددة"} → {endAt || "نهاية غير محددة"} —{" "}
                {budget ? `ميزانية: ${budget}` : "ميزانية: غير محدد"}
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginTop: 14 }}>
                <div>
                  <div style={{ fontWeight: 900, marginBottom: 8 }}>نقاط القوة</div>
                  {analysis.strategic_analysis.strengths.map((x: string, i: number) => (
                    <div key={i} style={{ marginBottom: 6 }}>• {x}</div>
                  ))}
                </div>
                <div>
                  <div style={{ fontWeight: 900, marginBottom: 8 }}>فرص التعظيم</div>
                  {analysis.strategic_analysis.amplification_opportunities.map((x: string, i: number) => (
                    <div key={i} style={{ marginBottom: 6 }}>• {x}</div>
                  ))}
                </div>
                <div>
                  <div style={{ fontWeight: 900, marginBottom: 8 }}>فجوات تحتاج معالجة</div>
                  {analysis.strategic_analysis.gaps.map((x: string, i: number) => (
                    <div key={i} style={{ marginBottom: 6 }}>• {x}</div>
                  ))}
                </div>
                <div>
                  <div style={{ fontWeight: 900, marginBottom: 8 }}>مخاطر محتملة</div>
                  {analysis.strategic_analysis.risks.map((x: string, i: number) => (
                    <div key={i} style={{ marginBottom: 6 }}>• {x}</div>
                  ))}
                </div>
              </div>

              <div style={{ marginTop: 14 }}>
                <div style={{ fontWeight: 900, marginBottom: 8 }}>Top 3 Upgrades</div>
                {analysis.strategic_analysis.top_3_upgrades.map((x: string, i: number) => (
                  <div key={i} style={{ marginBottom: 6 }}>{i + 1}) {x}</div>
                ))}
              </div>
            </section>

            <section style={styles.card}>
              <h2 style={{ marginTop: 0 }}>6) القرار التنفيذي</h2>
              <div style={{ fontSize: 18, fontWeight: 900, marginBottom: 10 }}>
                {analysis.executive_decision.decision}
              </div>
              <div style={{ marginBottom: 6 }}>• {analysis.executive_decision.reason_1}</div>
              <div>• {analysis.executive_decision.reason_2}</div>
            </section>

            <section style={styles.card}>
              <h2 style={{ marginTop: 0 }}>7) توصيات المستشارين</h2>
              {Object.entries(analysis.advisor_recommendations).map(([k, v]: any) => (
                <div key={k} style={{ marginTop: 14 }}>
                  <div style={{ fontWeight: 900, marginBottom: 8 }}>{advisorLabel(k)}</div>
                  {(v.recommendations || []).map((r: string, i: number) => (
                    <div key={i} style={{ marginBottom: 6 }}>• {r}</div>
                  ))}
                  <div style={{ ...styles.box, background: "rgba(255, 200, 0, 0.10)", borderColor: "rgba(255, 200, 0, 0.18)" }}>
                    <strong>تنبيه استراتيجي:</strong> {v.strategic_warning}
                  </div>
                </div>
              ))}
            </section>

            <section style={styles.card}>
              <h2 style={{ marginTop: 0 }}>8) التقرير النهائي (جاهز للنسخ إلى Word)</h2>
              <div style={{ display: "flex", gap: 10, marginBottom: 10 }}>
                <button onClick={copyReport} style={styles.button(false)}>
                  نسخ التقرير
                </button>
              </div>

              <textarea
                readOnly
                value={reportText}
                style={{ ...styles.textarea, height: 320, direction: "rtl", fontFamily: "Arial" }}
              />
            </section>
          </>
        )}

        <footer style={{ marginTop: 18, color: "rgba(255,255,255,0.55)", fontSize: 12 }}>
          ✅ تم إضافة: (البداية/النهاية) + (نوع الموقع) + (ميزانية اختيارية)
        </footer>
      </div>
    </main>
  );
}