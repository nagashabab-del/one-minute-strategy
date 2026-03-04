export type StrategyReadinessInput = {
  project?: string;
  eventType?: string;
  venueType?: string;
  startAt?: string;
  endAt?: string;
  budget?: string;
  scopeSite?: string;
  scopeTechnical?: string;
  scopeProgram?: string;
};

export type StrategyReadinessMode = "gap" | "advisory";

export type StrategyReadinessField = {
  key:
    | "project"
    | "eventType"
    | "venueType"
    | "startAt"
    | "endAt"
    | "budget"
    | "scopeSite"
    | "scopeTechnical"
    | "scopeProgram";
  label: string;
  critical: boolean;
  done: boolean;
};

export type StrategyReadinessSummary = {
  score: number;
  requiredScore: number;
  mode: StrategyReadinessMode;
  criticalMissing: string[];
  optionalMissing: string[];
  fields: StrategyReadinessField[];
};

type FieldRule = {
  key: StrategyReadinessField["key"];
  label: string;
  critical: boolean;
  isDone: (snapshot: StrategyReadinessInput) => boolean;
};

const FIELD_RULES: FieldRule[] = [
  {
    key: "project",
    label: "اسم المشروع",
    critical: true,
    isDone: (snapshot) => hasText(snapshot.project),
  },
  {
    key: "eventType",
    label: "نوع المشروع/الفعالية",
    critical: true,
    isDone: (snapshot) => hasText(snapshot.eventType),
  },
  {
    key: "venueType",
    label: "نوع الموقع",
    critical: true,
    isDone: (snapshot) => hasText(snapshot.venueType) && snapshot.venueType !== "غير محدد",
  },
  {
    key: "startAt",
    label: "تاريخ/وقت البداية",
    critical: true,
    isDone: (snapshot) => hasText(snapshot.startAt),
  },
  {
    key: "endAt",
    label: "تاريخ/وقت النهاية",
    critical: true,
    isDone: (snapshot) => hasText(snapshot.endAt),
  },
  {
    key: "budget",
    label: "ميزانية تقديرية",
    critical: true,
    isDone: (snapshot) => hasBudget(snapshot.budget),
  },
  {
    key: "scopeSite",
    label: "نطاق الموقع والتجهيزات",
    critical: false,
    isDone: (snapshot) => hasText(snapshot.scopeSite),
  },
  {
    key: "scopeTechnical",
    label: "نطاق التجهيزات الفنية",
    critical: false,
    isDone: (snapshot) => hasText(snapshot.scopeTechnical),
  },
  {
    key: "scopeProgram",
    label: "نطاق البرنامج التنفيذي",
    critical: false,
    isDone: (snapshot) => hasText(snapshot.scopeProgram),
  },
];

export function evaluateStrategyReadiness(snapshot: StrategyReadinessInput): StrategyReadinessSummary {
  const fields: StrategyReadinessField[] = FIELD_RULES.map((rule) => ({
    key: rule.key,
    label: rule.label,
    critical: rule.critical,
    done: rule.isDone(snapshot),
  }));

  const completedCount = fields.filter((item) => item.done).length;
  const criticalFieldCount = fields.filter((item) => item.critical).length;
  const score = Math.round((completedCount / fields.length) * 100);
  const requiredScore =
    criticalFieldCount > 0 ? Math.round((criticalFieldCount / fields.length) * 100) : 0;
  const criticalMissing = fields.filter((item) => item.critical && !item.done).map((item) => item.label);
  const optionalMissing = fields.filter((item) => !item.critical && !item.done).map((item) => item.label);

  const mode: StrategyReadinessMode = criticalMissing.length === 0 ? "advisory" : "gap";

  return {
    score,
    requiredScore,
    mode,
    criticalMissing,
    optionalMissing,
    fields,
  };
}

function hasText(value: string | undefined): boolean {
  return typeof value === "string" && value.trim().length > 0;
}

function hasBudget(value: string | undefined): boolean {
  if (!hasText(value)) return false;
  const normalized = normalizeDigits(value as string).replace(/[^\d.-]/g, "");
  const parsed = Number(normalized);
  return Number.isFinite(parsed) && parsed > 0;
}

function normalizeDigits(value: string): string {
  return value.replace(/[٠-٩]/g, (digit) => String("٠١٢٣٤٥٦٧٨٩".indexOf(digit)));
}
