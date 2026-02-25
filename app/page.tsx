"use client";

import { CSSProperties, useEffect, useMemo, useState } from "react";

type StageUI = "init" | "round1" | "round2" | "dialogue" | "addition" | "done";

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

const STORAGE_KEY = "oms_dashboard_full_v1";

export default function Home() {
  // ============ Inputs ============
  const [eventType, setEventType] = useState("فعالية موسمية");
  const [mode, setMode] = useState("مراجعة تنفيذية سريعة");
  const [venueType, setVenueType] = useState<
    "منتجع" | "فندق" | "قاعة" | "مساحة عامة" | "غير محدد"
  >("غير محدد");

  const [startAt, setStartAt] = useState("");
  const [endAt, setEndAt] = useState("");
  const [budget, setBudget] = useState("");
  const [project, setProject] = useState("");

  // ============ Flow ============
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

  const [lastSavedAt, setLastSavedAt] = useState<number | null>(null);

  const canStart = project.trim().length > 0;

  // ============ Restore ============
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return;

    try {
      const s = JSON.parse(saved);
      setEventType(s.eventType ?? "فعالية موسمية");
      setMode(s.mode ?? "مراجعة تنفيذية سريعة");
      setVenueType(s.venueType ?? "غير محدد");
      setStartAt(s.startAt ?? "");
      setEndAt(s.endAt ?? "");
      setBudget(s.budget ?? "");
      setProject(s.project ?? "");

      setStage(s.stage ?? "init");
      setRound1Questions(s.round1Questions ?? []);
      setFollowupQuestions(s.followupQuestions ?? []);
      setAnswers(s.answers ?? []);
      setDialogue(s.dialogue ?? []);
      setOpenIssues(s.openIssues ?? []);
      setHasAddition(s.hasAddition ?? "no");
      setUserAddition(s.userAddition ?? "");
      setAnalysis(s.analysis ?? null);
      setReportText(s.reportText ?? "");
      setLastSavedAt(s.lastSavedAt ?? null);
    } catch {}
  }, []);

  // ============ Save (no save while loading) ============
  useEffect(() => {
    if (loading) return;

    const now = Date.now();
    const snapshot = {
      eventType,
      mode,
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
      openIssues,
      hasAddition,
      userAddition,
      analysis,
      reportText,
      lastSavedAt: now,
    };

    localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
    setLastSavedAt(now);
  }, [
    loading,
    eventType,
    mode,
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
    openIssues,
    hasAddition,
    userAddition,
    analysis,
    reportText,
  ]);

  // تحديث “آخر حفظ” كل ثانية
  const [, setTick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setTick((x) => x + 1), 1000);
    return () => clearInterval(t);
  }, []);

  function lastSavedText() {
    if (!lastSavedAt) return "—";
    const diff = Date.now() - lastSavedAt;
    if (diff < 3000) return "الآن";
    return `قبل ${Math.floor(diff / 1000)} ثانية`;
  }

  function clearSession() {
    localStorage.removeItem(STORAGE_KEY);
    location.reload();
  }

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

  function progressPercent() {
    switch (stage) {
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
      case "init":
        return "تهيئة المشروع";
      case "round1":
        return "أسئلة الجولة الأولى";
      case "round2":
        return "تدقيق إضافي";
      case "dialogue":
        return "حوار المستشارين";
      case "addition":
        return "إضافة المستخدم";
      case "done":
        return "التحليل والقرار والتقرير";
      default:
        return stage;
    }
  }

  function ratioAnswered(questionIds: string[]) {
    const subset = answers.filter((a) => questionIds.includes(a.id));
    if (subset.length === 0) return 0;
    const filled = subset.filter((a) => a.answer.trim().length > 0).length;
    return filled / subset.length;
  }

  // ============ Actions ============
  async function startSession() {
    if (!canStart || loading) return;

    setLoading(true);
    setStage("round1");

    // reset downstream
    setRound1Questions([]);
    setFollowupQuestions([]);
    setAnswers([]);
    setDialogue([]);
    setOpenIssues([]);
    setHasAddition("no");
    setUserAddition("");
    setAnalysis(null);
    setReportText("");

    const json = await callAPI({ stage: "questions", ...commonPayload() });
    setLoading(false);

    if (!json?.ok) {
      alert(json?.error || "حدث خطأ في توليد الأسئلة");
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
      alert(json?.error || "حدث خطأ في توليد تدقيق إضافي");
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
      alert("جاوب على أغلب تدقيق إضافي (على الأقل 60%).");
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
      alert(json?.error || "حدث خطأ في توليد الحوار");
      return;
    }

    setDialogue(json.data?.council_dialogue || []);
    setOpenIssues(json.data?.open_issues || []);
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
      alert(json?.error || "حدث خطأ في التحليل");
      return;
    }

    setAnalysis(json.data);
    setReportText(json.data?.report_text || "");
    setStage("done");
  }

  async function copyReport() {
    if (!reportText?.trim()) return;
    await navigator.clipboard.writeText(reportText);
    alert("تم نسخ التقرير ✅");
  }

  const summaryStats = useMemo(() => {
    const all = answers.length;
    const filled = answers.filter((a) => a.answer.trim().length > 0).length;
    return { all, filled };
  }, [answers]);

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
        top: -260,
        left: "50%",
        transform: "translateX(-50%)",
        width: 980,
        height: 980,
        background:
          "radial-gradient(circle, rgba(128,0,255,0.55) 0%, rgba(5,7,13,0) 60%)",
        filter: "blur(90px)",
        zIndex: 0,
      },
      container: {
        maxWidth: 1200,
        margin: "0 auto",
        padding: 34,
        position: "relative" as const,
        zIndex: 1,
      },
      header: {
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        gap: 16,
        marginBottom: 22,
      },
      logo: { fontSize: 24, fontWeight: 900, margin: 0, letterSpacing: 0.2 },
      subtitle: {
        marginTop: 6,
        color: "rgba(255,255,255,0.65)",
        fontSize: 13,
      },
      headerActions: { display: "flex", gap: 10, alignItems: "center" },
      ghostBtn: {
        background: "transparent",
        border: "1px solid rgba(255,255,255,0.18)",
        padding: "10px 14px",
        borderRadius: 12,
        color: "white",
        cursor: "pointer",
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
        gridTemplateColumns: "2fr 1fr",
        gap: 18,
      },
      card: {
        background: "rgba(255,255,255,0.04)",
        backdropFilter: "blur(14px)",
        border: "1px solid rgba(255,255,255,0.08)",
        borderRadius: 16,
        padding: 18,
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
        padding: 14,
        borderRadius: 14,
        background: "rgba(255,255,255,0.04)",
        border: "1px solid rgba(255,255,255,0.08)",
        marginTop: 12,
      },
      qTitle: { fontWeight: 900, marginBottom: 6 },
      qHint: { fontSize: 12, color: "rgba(255,255,255,0.65)", marginTop: 6 },
      row2: {
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        gap: 12,
        marginTop: 12,
      },
      radioRow: { display: "flex", gap: 16, marginTop: 12, alignItems: "center" },
      warnBox: {
        padding: 12,
        borderRadius: 14,
        background: "rgba(255, 200, 0, 0.10)",
        border: "1px solid rgba(255, 200, 0, 0.18)",
        marginTop: 10,
      },

      // ✅ صفّين × 3 أعمدة (مُتوسّط + مقاس ثابت)
      advisorsGrid: {
        display: "grid",
        gridTemplateColumns: "repeat(3, 1fr)",
        gap: 10,
        marginBottom: 14,

        // ✅ التوسيط الصحيح
        maxWidth: 520,
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
    }),
    []
  );

  return (
    <main style={styles.page} dir="rtl">
      <div style={styles.glow} />
      <div style={styles.container}>
        {/* Header */}
        <header style={styles.header}>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <img
              src="/logo.svg"
              alt="One Minute Strategy"
              style={{
                height: 44,
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

        {/* Progress */}
        <div style={styles.progressWrapper}>
          <div style={styles.progressLabel}>
  ✨ خطوة بخطوة لصنع القرار — {stageLabel()} — ({summaryStats.filled}/{summaryStats.all})
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

        {/* Layout */}
        <div style={styles.grid}>
          {/* Main */}
          <section style={styles.card}>
            <h2 style={styles.cardTitle}>الجلسة الإستشارية</h2>
            <p style={styles.muted}>
              حوّل فكرتك إلى قرار مدروس عبر مراحل تحليل منهجية.
            </p>

            <hr style={styles.hr} />

            {/* INIT */}
            {stage === "init" && (
              <>
                {/* ✅ مربعات المستشارين (صفّين × 3 أعمدة) */}
                <div style={styles.advisorsGrid}>
                  {[
                    "financial_advisor",
                    "regulatory_advisor",
                    "operations_advisor",
                    "marketing_advisor",
                    "risk_advisor",
                    "__empty__",
                  ].map((key) => {
                    if (key === "__empty__") {
                      return (
                        <div key="empty" style={styles.advisorTileEmpty} />
                      );
                    }

                    return (
                      <div key={key} style={styles.advisorTile(key)}>
                        <div style={styles.advisorIconS}>
                          {advisorIcon(key)}
                        </div>
                        <div style={styles.advisorNameS}>
                          {advisorName(key)}
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: 12,
                  }}
                >
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
                    <div style={styles.label}>وضع الجلسة</div>
                    <select
                      value={mode}
                      onChange={(e) => setMode(e.target.value)}
                      style={styles.input}
                    >
                      <option>مراجعة تنفيذية سريعة</option>
                      <option>تحليل معمّق</option>
                    </select>
                  </div>

                  <div>
                    <div style={styles.label}>نوع الموقع</div>
                    <select
                      value={venueType}
                      onChange={(e) =>
                        setVenueType(e.target.value as any)
                      }
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

                <div style={{ marginTop: 12 }}>
                  <button
                    style={styles.primaryBtn(!canStart || loading)}
                    disabled={!canStart || loading}
                    onClick={startSession}
                  >
                    {loading ? "تتم المعالجة..." : "ابدأ الجلسة"}
                  </button>
                </div>
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
                      <div
                        style={{
                          ...styles.qTitle,
                          color: advisorColor(q.advisor_key),
                          textShadow: `0 0 12px ${advisorColor(q.advisor_key)}`,
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                        }}
                      >
                        <span style={{ fontSize: 18 }}>
                          {advisorIcon(q.advisor_key)}
                        </span>
                        {advisorTitle(q.advisor_key)}
                      </div>

                      <div style={{ marginTop: 6 }}>• {q.question}</div>
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
                        style={{ ...styles.textarea, height: 90, marginTop: 10 }}
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
                      <div style={styles.qTitle}>{q.advisor_name}</div>
                      <div>• {q.question}</div>
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
                        style={{ ...styles.textarea, height: 90, marginTop: 10 }}
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
                      <div
                        style={{
                          ...styles.qTitle,
                          color: advisorColor(m.advisor),
                          textShadow: `0 0 12px ${advisorColor(m.advisor)}`,
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                        }}
                      >
                        <span style={{ fontSize: 18 }}>
                          {advisorIcon(m.advisor)}
                        </span>
                        {advisorTitle(m.advisor)}
                      </div>

                      <div
                        style={{
                          marginTop: 8,
                          lineHeight: 1.7,
                          color: "rgba(255,255,255,0.9)",
                        }}
                      >
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

                <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
                  <button
                    style={styles.primaryBtn(loading)}
                    disabled={loading}
                    onClick={runAnalysis}
                  >
                    {loading ? "جاري التحليل..." : "ابدأ التحليل + القرار + التوصيات"}
                  </button>
                </div>
              </>
            )}

            {/* DONE */}
            {stage === "done" && analysis && (
              <>
                <h3 style={{ margin: 0, fontWeight: 900 }}>
                  5) التحليل + القرار + التوصيات
                </h3>

                <div style={{ marginTop: 12 }}>
                  <div style={{ ...styles.metaItem, marginTop: 0 }}>
                    <span style={styles.k}>مستوى الجاهزية</span>
                    <span style={styles.v}>
                      {analysis?.strategic_analysis?.readiness_level ?? "—"}
                    </span>
                  </div>
                </div>

                <div style={styles.row2}>
                  <div style={styles.qCard}>
                    <div style={styles.qTitle}>نقاط القوة</div>
                    {(analysis?.strategic_analysis?.strengths || []).map(
                      (x: string, i: number) => (
                        <div key={i} style={{ marginBottom: 6 }}>
                          • {x}
                        </div>
                      )
                    )}
                  </div>

                  <div style={styles.qCard}>
                    <div style={styles.qTitle}>فرص التعظيم</div>
                    {(analysis?.strategic_analysis?.amplification_opportunities || []).map(
                      (x: string, i: number) => (
                        <div key={i} style={{ marginBottom: 6 }}>
                          • {x}
                        </div>
                      )
                    )}
                  </div>

                  <div style={styles.qCard}>
                    <div style={styles.qTitle}>فجوات تحتاج معالجة</div>
                    {(analysis?.strategic_analysis?.gaps || []).map(
                      (x: string, i: number) => (
                        <div key={i} style={{ marginBottom: 6 }}>
                          • {x}
                        </div>
                      )
                    )}
                  </div>

                  <div style={styles.qCard}>
                    <div style={styles.qTitle}>مخاطر محتملة</div>
                    {(analysis?.strategic_analysis?.risks || []).map(
                      (x: string, i: number) => (
                        <div key={i} style={{ marginBottom: 6 }}>
                          • {x}
                        </div>
                      )
                    )}
                  </div>
                </div>

                <div style={{ marginTop: 12 }}>
                  <div style={styles.qCard}>
                    <div style={styles.qTitle}>القرار التنفيذي</div>
                    <div style={{ fontSize: 18, fontWeight: 900, marginBottom: 10 }}>
                      {analysis?.executive_decision?.decision ?? "—"}
                    </div>
                    <div style={{ marginBottom: 6 }}>
                      • {analysis?.executive_decision?.reason_1 ?? "—"}
                    </div>
                    <div>• {analysis?.executive_decision?.reason_2 ?? "—"}</div>
                  </div>
                </div>

                <div style={{ marginTop: 12 }}>
                  <div style={styles.qCard}>
                    <div style={styles.qTitle}>توصيات المستشارين</div>

                    {Object.entries(analysis?.advisor_recommendations || {}).map(
                      ([k, v]: any) => (
                        <div key={k} style={{ marginTop: 12 }}>
                          <div style={{ fontWeight: 900, marginBottom: 6 }}>
                            {advisorTitle(k)}
                          </div>
                          {(v?.recommendations || []).map((r: string, i: number) => (
                            <div key={i} style={{ marginBottom: 6 }}>
                              • {r}
                            </div>
                          ))}
                          {v?.strategic_warning ? (
                            <div style={styles.warnBox}>
                              <strong>تنبيه استراتيجي:</strong> {v.strategic_warning}
                            </div>
                          ) : null}
                        </div>
                      )
                    )}
                  </div>
                </div>

                <div style={{ marginTop: 12 }}>
                  <div style={styles.qCard}>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        gap: 10,
                        alignItems: "center",
                      }}
                    >
                      <div style={styles.qTitle}>التقرير النهائي (قابل للنسخ لوورد)</div>
                      <button style={styles.ghostBtn} onClick={copyReport}>
                        نسخ
                      </button>
                    </div>

                    <textarea
                      readOnly
                      value={reportText}
                      style={{
                        ...styles.textarea,
                        height: 320,
                        marginTop: 10,
                        fontFamily: "Arial",
                      }}
                      placeholder="سيظهر هنا التقرير النهائي..."
                    />
                  </div>
                </div>
              </>
            )}
          </section>

          {/* Side Summary */}
          <aside style={styles.card}>
            <h3 style={styles.cardTitle}>ملخص المشروع</h3>
            <p style={styles.muted}>يتحدث تلقائيًا مع اختياراتك.</p>

            <div style={styles.metaItem}>
              <span style={styles.k}>نوع الفعالية</span>
              <span style={styles.v}>{eventType}</span>
            </div>

            <div style={styles.metaItem}>
              <span style={styles.k}>وضع الجلسة</span>
              <span style={styles.v}>{mode}</span>
            </div>

            <div style={styles.metaItem}>
              <span style={styles.k}>الموقع</span>
              <span style={styles.v}>{venueType}</span>
            </div>

            <div style={styles.metaItem}>
              <span style={styles.k}>البداية</span>
              <span style={styles.v}>{startAt ? "محدد" : "غير محدد"}</span>
            </div>

            <div style={styles.metaItem}>
              <span style={styles.k}>النهاية</span>
              <span style={styles.v}>{endAt ? "محدد" : "غير محدد"}</span>
            </div>

            <div style={styles.metaItem}>
              <span style={styles.k}>الميزانية</span>
              <span style={styles.v}>{budget?.trim() ? budget : "غير محدد"}</span>
            </div>

            <hr style={styles.hr} />

            <div style={{ ...styles.metaItem, alignItems: "center" }}>
              <span style={styles.k}>الحفظ التلقائي</span>
              <span style={styles.v}>مفعل ✓</span>
            </div>

            <div style={{ marginTop: 10, fontSize: 12, color: "rgba(255,255,255,0.65)" }}>
              آخر حفظ: {lastSavedText()}
            </div>

            <div style={{ marginTop: 10, fontSize: 12, color: "rgba(255,255,255,0.65)" }}>
              تفعيل الأزرار يعتمد على نسبة الإجابات (60%).
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}