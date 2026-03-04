export type StrategyProjectSnapshot = {
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

export type ActiveStrategyProject = {
  id: string;
  name: string;
  snapshot: StrategyProjectSnapshot;
};

type ProjectRegistry = {
  activeProjectId?: string;
  projects?: Array<{
    id?: string;
    name?: string;
    isArchived?: boolean;
  }>;
};

const PROJECTS_REGISTRY_KEY = "oms_dashboard_projects_registry_v1";
const PROJECT_DATA_KEY_PREFIX = "oms_dashboard_project_data_v1_";
const REQUIRED_READINESS_SCORE = 80;

type FieldRule = {
  key: StrategyReadinessField["key"];
  label: string;
  critical: boolean;
  isDone: (snapshot: StrategyProjectSnapshot) => boolean;
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

export function readActiveStrategyProject(): ActiveStrategyProject {
  if (typeof window === "undefined") {
    return { id: "global", name: "مشروع غير محدد", snapshot: {} };
  }

  const registryRaw = localStorage.getItem(PROJECTS_REGISTRY_KEY);
  const registry = safeParse<ProjectRegistry>(registryRaw, {});
  const projects = (Array.isArray(registry.projects) ? registry.projects : [])
    .filter((item) => item && typeof item.id === "string")
    .map((item) => ({
      id: String(item.id),
      name: typeof item.name === "string" ? item.name : "مشروع بدون اسم",
      isArchived: item.isArchived === true,
    }));

  const activeCandidates = projects.filter((item) => !item.isArchived);
  const activeFromRegistry = activeCandidates.find((item) => item.id === registry.activeProjectId);
  const active = activeFromRegistry ?? activeCandidates[0] ?? projects[0];
  if (!active) {
    return { id: "global", name: "مشروع غير محدد", snapshot: {} };
  }

  const snapshotRaw = localStorage.getItem(`${PROJECT_DATA_KEY_PREFIX}${active.id}`);
  const snapshot = safeParse<StrategyProjectSnapshot>(snapshotRaw, {});
  return {
    id: active.id,
    name: active.name,
    snapshot,
  };
}

export function readActiveStrategyProjectId(): string {
  return readActiveStrategyProject().id;
}

export function evaluateStrategyReadiness(snapshot: StrategyProjectSnapshot): StrategyReadinessSummary {
  const fields: StrategyReadinessField[] = FIELD_RULES.map((rule) => ({
    key: rule.key,
    label: rule.label,
    critical: rule.critical,
    done: rule.isDone(snapshot),
  }));

  const completedCount = fields.filter((item) => item.done).length;
  const score = Math.round((completedCount / fields.length) * 100);
  const criticalMissing = fields.filter((item) => item.critical && !item.done).map((item) => item.label);
  const optionalMissing = fields.filter((item) => !item.critical && !item.done).map((item) => item.label);

  const mode: StrategyReadinessMode =
    criticalMissing.length === 0 && score >= REQUIRED_READINESS_SCORE ? "advisory" : "gap";

  return {
    score,
    requiredScore: REQUIRED_READINESS_SCORE,
    mode,
    criticalMissing,
    optionalMissing,
    fields,
  };
}

function safeParse<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
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
