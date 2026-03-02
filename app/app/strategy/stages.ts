export type StrategyStageTone = "decision" | "planning" | "execution" | "closure";

export type StrategyStageItem = {
  id: string;
  title: string;
  subtitle: string;
  href: string;
  tone: StrategyStageTone;
};

export const STRATEGY_STAGES: StrategyStageItem[] = [
  {
    id: "brief",
    title: "موجز المشروع",
    subtitle: "تعريف سريع قبل الاستشارة",
    href: "/app/strategy/brief",
    tone: "decision",
  },
  {
    id: "advisors",
    title: "تجهيز المستشارين",
    subtitle: "اختيار مسار التحليل",
    href: "/app/strategy/advisors",
    tone: "decision",
  },
  {
    id: "dialogue",
    title: "جلسة التحليل",
    subtitle: "الحوار وتوليد المخرجات",
    href: "/app/strategy/dialogue",
    tone: "decision",
  },
  {
    id: "decision",
    title: "القرار التنفيذي",
    subtitle: "اعتماد القرار قبل التنفيذ",
    href: "/app/strategy/decision",
    tone: "decision",
  },
  {
    id: "scope",
    title: "هيكلة النطاق",
    subtitle: "تفكيك المشروع إلى بنود",
    href: "/app/strategy/execution/scope",
    tone: "planning",
  },
  {
    id: "budget",
    title: "الخطة المالية",
    subtitle: "الميزانية والانحرافات",
    href: "/app/strategy/execution/budget",
    tone: "planning",
  },
  {
    id: "plan",
    title: "الخطة الزمنية",
    subtitle: "المعالم والتبعيات",
    href: "/app/strategy/execution/plan",
    tone: "execution",
  },
  {
    id: "risks",
    title: "سجل المخاطر",
    subtitle: "التصعيد والمعالجة",
    href: "/app/strategy/execution/risks",
    tone: "execution",
  },
  {
    id: "review",
    title: "المراجعة النهائية",
    subtitle: "جاهزية الإغلاق والتقرير",
    href: "/app/strategy/review",
    tone: "closure",
  },
];

export function resolveActiveStageId(pathname: string): string {
  if (pathname.includes("/strategy/execution/scope")) return "scope";
  if (pathname.includes("/strategy/execution/budget")) return "budget";
  if (pathname.includes("/strategy/execution/plan")) return "plan";
  if (pathname.includes("/strategy/execution/risks")) return "risks";
  if (pathname.includes("/strategy/review")) return "review";
  if (pathname.includes("/strategy/decision")) return "decision";
  if (pathname.includes("/strategy/dialogue")) return "dialogue";
  if (pathname.includes("/strategy/advisors")) return "advisors";
  if (pathname.includes("/strategy/workspace")) return "dialogue";
  if (pathname.includes("/strategy/brief")) return "brief";
  return "brief";
}

export function stageCompletionRatio(activeId: string): number {
  const idx = STRATEGY_STAGES.findIndex((item) => item.id === activeId);
  if (idx < 0) return 0;
  return Math.round(((idx + 1) / STRATEGY_STAGES.length) * 100);
}
