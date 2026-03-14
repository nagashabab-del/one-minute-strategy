export type SummaryTone = "critical" | "warning" | "ok" | "neutral";

export type SessionSummaryAlert = {
  text: string;
  tone: "warn" | "info" | "ok";
};

export type SessionSummaryMetric = {
  id: "progress" | "risk" | "decision";
  label: string;
  value: string;
  tone: SummaryTone;
};

export type SessionSummaryItem = {
  id: string;
  text: string;
  tone: SummaryTone;
  score: number;
};

export type SessionSummaryInput = {
  stageLabel: string;
  stageStatus: string;
  progressPercent: number;
  hasActiveProject: boolean;
  projectName: string;
  deliveryTrack: "fast" | "advanced";
  nextActionLabel?: string;
  alerts: SessionSummaryAlert[];
  advisorCount: number;
  answerQualityLevel: "ضعيف" | "متوسط" | "جيد";
  answerQualityWeakCount: number;
  hasAnalysis: boolean;
  finalDecisionText?: string;
  finalReadinessLevel?: string;
  finalRiskCount?: number;
  finalGapCount?: number;
  advancedCriticalRisks?: number;
  advancedOverdueRisks?: number;
  advancedBlockedTasks?: number;
  advancedProfitStatus?: string;
};

export type SessionSummaryResult = {
  headline: string;
  dominantGap: string;
  nextAction: string;
  tone: SummaryTone;
  metrics: SessionSummaryMetric[];
  items: SessionSummaryItem[];
};

const TONE_PRIORITY: Record<SummaryTone, number> = {
  critical: 4,
  warning: 3,
  ok: 2,
  neutral: 1,
};

function toArabicNumber(value: number): string {
  return new Intl.NumberFormat("ar-SA").format(Math.max(0, Math.round(value)));
}

function normalizeAlertTone(tone: SessionSummaryAlert["tone"]): SummaryTone {
  if (tone === "warn") return "warning";
  if (tone === "ok") return "ok";
  return "neutral";
}

function toneFromRiskCount(riskCount: number): SummaryTone {
  if (riskCount >= 3) return "critical";
  if (riskCount > 0) return "warning";
  return "ok";
}

export function buildSessionSummary(input: SessionSummaryInput): SessionSummaryResult {
  const items: SessionSummaryItem[] = [];

  items.push({
    id: "stage",
    text: `المرحلة الحالية: ${input.stageLabel} (${input.stageStatus}).`,
    tone: "neutral",
    score: 55,
  });

  if (!input.hasActiveProject) {
    items.push({
      id: "no_project",
      text: "لا يوجد مشروع نشط. ابدأ بإنشاء مشروع أو فتح مشروع من الأرشيف.",
      tone: "critical",
      score: 120,
    });
  } else {
    items.push({
      id: "project",
      text: `المشروع النشط: ${input.projectName}.`,
      tone: "ok",
      score: 45,
    });
  }

  if (input.advisorCount <= 0) {
    items.push({
      id: "advisor_none",
      text: "لا يوجد مستشارون مشاركون حالياً في الجلسة.",
      tone: "warning",
      score: 84,
    });
  } else {
    items.push({
      id: "advisor_count",
      text: `عدد المستشارين المشاركين: ${toArabicNumber(input.advisorCount)}.`,
      tone: "ok",
      score: 43,
    });
  }

  for (const alert of input.alerts) {
    const tone = normalizeAlertTone(alert.tone);
    items.push({
      id: `alert_${items.length}`,
      text: alert.text,
      tone,
      score: tone === "warning" ? 110 : tone === "neutral" ? 76 : 42,
    });
  }

  if (input.answerQualityLevel !== "جيد") {
    items.push({
      id: "quality",
      text:
        input.answerQualityLevel === "ضعيف"
          ? `جودة الإجابات ضعيفة (${input.answerQualityWeakCount} إجابات بحاجة تحسين).`
          : `جودة الإجابات متوسطة (${input.answerQualityWeakCount} إجابات بحاجة تفصيل).`,
      tone: input.answerQualityLevel === "ضعيف" ? "critical" : "warning",
      score: input.answerQualityLevel === "ضعيف" ? 105 : 82,
    });
  }

  if (input.deliveryTrack === "advanced") {
    const critical = Math.max(0, input.advancedCriticalRisks ?? 0);
    const overdue = Math.max(0, input.advancedOverdueRisks ?? 0);
    const blocked = Math.max(0, input.advancedBlockedTasks ?? 0);

    if (critical > 0) {
      items.push({
        id: "advanced_critical",
        text: `يوجد ${toArabicNumber(critical)} مخاطر حرجة في المسار المتقدم.`,
        tone: critical >= 3 ? "critical" : "warning",
        score: critical >= 3 ? 112 : 92,
      });
    }
    if (overdue > 0) {
      items.push({
        id: "advanced_overdue",
        text: `يوجد ${toArabicNumber(overdue)} مخاطر متأخرة عن مراجعة الجدول.`,
        tone: "warning",
        score: 90,
      });
    }
    if (blocked > 0) {
      items.push({
        id: "advanced_blocked",
        text: `يوجد ${toArabicNumber(blocked)} مهام متعثرة في خطة التنفيذ.`,
        tone: "warning",
        score: 88,
      });
    }
    if (input.advancedProfitStatus && input.advancedProfitStatus !== "تعادل") {
      items.push({
        id: "advanced_profit",
        text: `الوضع الربحي الحالي: ${input.advancedProfitStatus}.`,
        tone: input.advancedProfitStatus === "خاسر" ? "critical" : "ok",
        score: input.advancedProfitStatus === "خاسر" ? 96 : 64,
      });
    }
  }

  if (input.hasAnalysis && input.finalDecisionText) {
    items.push({
      id: "final_decision",
      text: `اتجاه القرار الحالي: ${input.finalDecisionText}.`,
      tone: "neutral",
      score: 78,
    });
  }

  if (input.hasAnalysis && (input.finalRiskCount ?? 0) > 0) {
    items.push({
      id: "analysis_risks",
      text: `تحليل القرار يحتوي ${toArabicNumber(input.finalRiskCount ?? 0)} مخاطر نشطة.`,
      tone: toneFromRiskCount(input.finalRiskCount ?? 0),
      score: 94,
    });
  }

  if (input.hasAnalysis && (input.finalGapCount ?? 0) > 0) {
    items.push({
      id: "analysis_gaps",
      text: `تحليل القرار يحتوي ${toArabicNumber(input.finalGapCount ?? 0)} فجوات تحتاج إغلاق.`,
      tone: (input.finalGapCount ?? 0) >= 3 ? "critical" : "warning",
      score: 93,
    });
  }

  const deduped = Array.from(
    new Map(
      items.map((entry) => [`${entry.text}::${entry.tone}`, entry] as const)
    ).values()
  );
  deduped.sort((a, b) => b.score - a.score || TONE_PRIORITY[b.tone] - TONE_PRIORITY[a.tone]);
  const topItems = deduped.slice(0, 5);

  const dominantGap =
    topItems.find((item) => item.tone === "critical" || item.tone === "warning")?.text ??
    "لا توجد فجوة حرجة حالياً.";

  const tone =
    topItems.some((item) => item.tone === "critical")
      ? "critical"
      : topItems.some((item) => item.tone === "warning")
      ? "warning"
      : input.hasActiveProject
      ? "ok"
      : "neutral";

  const riskMetricValue =
    input.deliveryTrack === "advanced"
      ? `${toArabicNumber(Math.max(0, input.advancedCriticalRisks ?? 0))} حرجة`
      : toArabicNumber(Math.max(0, input.finalRiskCount ?? 0));

  const metrics: SessionSummaryMetric[] = [
    {
      id: "progress",
      label: "التقدم",
      value: `${toArabicNumber(Math.max(0, Math.min(100, Math.round(input.progressPercent))))}%`,
      tone: input.progressPercent >= 70 ? "ok" : input.progressPercent >= 35 ? "warning" : "neutral",
    },
    {
      id: "risk",
      label: "المخاطر",
      value: riskMetricValue,
      tone:
        input.deliveryTrack === "advanced"
          ? toneFromRiskCount(Math.max(0, input.advancedCriticalRisks ?? 0))
          : toneFromRiskCount(Math.max(0, input.finalRiskCount ?? 0)),
    },
    {
      id: "decision",
      label: "جاهزية القرار",
      value: input.hasAnalysis ? input.finalReadinessLevel || "جاهز" : "قيد الإعداد",
      tone: input.hasAnalysis ? "ok" : "neutral",
    },
  ];

  return {
    headline: input.hasActiveProject
      ? `الوضع التنفيذي: ${input.stageStatus}`
      : "الوضع التنفيذي: بدون مشروع نشط",
    dominantGap,
    nextAction: input.nextActionLabel || "راجع المرحلة الحالية ثم انتقل للخطوة التالية.",
    tone,
    metrics,
    items: topItems,
  };
}
