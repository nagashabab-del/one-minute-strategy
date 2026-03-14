export type ApprovalPolicy = "single" | "dual" | "committee";
export type LayoutDensity = "comfortable" | "compact";

export type ReadinessProfileId = "conference" | "operational" | "technical" | "default";
export type ReadinessAxisId = "budget" | "scope" | "risks" | "tasks" | "compliance" | "approval_gate";

export type ReadinessProfileConfig = {
  label: string;
  conditionalThresholdPct: number;
  weights: Record<ReadinessAxisId, number>;
};

export type ReadinessProfilesConfig = Record<ReadinessProfileId, ReadinessProfileConfig>;

export type ExecSettings = {
  approvalPolicy: ApprovalPolicy;
  requireFinanceSignoff: boolean;
  requireRiskSignoff: boolean;
  allowManagerOverride: boolean;
  budgetAlertThreshold: number;
  delayAlertDays: number;
  notifyInApp: boolean;
  notifyDailySummary: boolean;
  notifyEscalation: boolean;
  layoutDensity: LayoutDensity;
  readinessProfiles: ReadinessProfilesConfig;
};

export const EXEC_SETTINGS_STORAGE_KEY = "oms_exec_settings_v1";

export const READINESS_PROFILE_ORDER: ReadinessProfileId[] = ["conference", "operational", "technical", "default"];
export const READINESS_AXIS_ORDER: ReadinessAxisId[] = [
  "budget",
  "scope",
  "risks",
  "tasks",
  "compliance",
  "approval_gate",
];

export const READINESS_AXIS_LABELS: Record<ReadinessAxisId, string> = {
  budget: "الميزانية",
  scope: "النطاق",
  risks: "المخاطر",
  tasks: "المهام",
  compliance: "الالتزام",
  approval_gate: "بوابة الاعتماد",
};

export const DEFAULT_READINESS_PROFILES: ReadinessProfilesConfig = {
  conference: {
    label: "مؤتمر/فعالية",
    conditionalThresholdPct: 74,
    weights: { budget: 15, scope: 22, risks: 18, tasks: 20, compliance: 15, approval_gate: 10 },
  },
  operational: {
    label: "تشغيلي/ميداني",
    conditionalThresholdPct: 72,
    weights: { budget: 20, scope: 16, risks: 20, tasks: 24, compliance: 10, approval_gate: 10 },
  },
  technical: {
    label: "تقني/رقمي",
    conditionalThresholdPct: 75,
    weights: { budget: 14, scope: 18, risks: 16, tasks: 18, compliance: 10, approval_gate: 24 },
  },
  default: {
    label: "عام",
    conditionalThresholdPct: 70,
    weights: { budget: 16, scope: 17, risks: 17, tasks: 17, compliance: 17, approval_gate: 16 },
  },
};

export const DEFAULT_EXEC_SETTINGS: ExecSettings = {
  approvalPolicy: "dual",
  requireFinanceSignoff: true,
  requireRiskSignoff: true,
  allowManagerOverride: false,
  budgetAlertThreshold: 10,
  delayAlertDays: 2,
  notifyInApp: true,
  notifyDailySummary: true,
  notifyEscalation: true,
  layoutDensity: "comfortable",
  readinessProfiles: DEFAULT_READINESS_PROFILES,
};

function asBoolean(value: unknown, fallback: boolean) {
  if (typeof value !== "boolean") return fallback;
  return value;
}

function asNumber(value: unknown, fallback: number) {
  if (typeof value !== "number" || Number.isNaN(value)) return fallback;
  return value;
}

function clampInt(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, Math.round(value)));
}

function normalizeWeights(
  input: Partial<Record<ReadinessAxisId, number>> | undefined,
  fallback: Record<ReadinessAxisId, number>
): Record<ReadinessAxisId, number> {
  const raw = READINESS_AXIS_ORDER.map((axis) => {
    const source = typeof input?.[axis] === "number" ? input?.[axis] : fallback[axis];
    return clampInt(Number(source), 0, 100);
  });
  const sum = raw.reduce((acc, value) => acc + value, 0);
  if (sum <= 0) return { ...fallback };

  const scaled = raw.map((value) => Math.round((value / sum) * 100));
  let scaledSum = scaled.reduce((acc, value) => acc + value, 0);
  if (scaledSum !== 100) {
    const maxIdx = scaled.reduce(
      (bestIdx, value, idx, arr) => (value > arr[bestIdx] ? idx : bestIdx),
      0
    );
    scaled[maxIdx] += 100 - scaledSum;
    scaledSum = scaled.reduce((acc, value) => acc + value, 0);
    if (scaledSum !== 100) {
      return { ...fallback };
    }
  }

  const normalized = {} as Record<ReadinessAxisId, number>;
  READINESS_AXIS_ORDER.forEach((axis, idx) => {
    normalized[axis] = scaled[idx];
  });
  return normalized;
}

function normalizeProfile(
  input: Partial<ReadinessProfileConfig> | undefined,
  fallback: ReadinessProfileConfig
): ReadinessProfileConfig {
  return {
    label: typeof input?.label === "string" && input.label.trim() ? input.label.trim() : fallback.label,
    conditionalThresholdPct: clampInt(asNumber(input?.conditionalThresholdPct, fallback.conditionalThresholdPct), 60, 95),
    weights: normalizeWeights(input?.weights, fallback.weights),
  };
}

export function normalizeReadinessProfiles(
  input: Partial<Record<ReadinessProfileId, Partial<ReadinessProfileConfig>>> | undefined
): ReadinessProfilesConfig {
  return {
    conference: normalizeProfile(input?.conference, DEFAULT_READINESS_PROFILES.conference),
    operational: normalizeProfile(input?.operational, DEFAULT_READINESS_PROFILES.operational),
    technical: normalizeProfile(input?.technical, DEFAULT_READINESS_PROFILES.technical),
    default: normalizeProfile(input?.default, DEFAULT_READINESS_PROFILES.default),
  };
}

export function normalizeExecSettings(input: Partial<ExecSettings>): ExecSettings {
  return {
    approvalPolicy:
      input.approvalPolicy === "single" || input.approvalPolicy === "committee"
        ? input.approvalPolicy
        : DEFAULT_EXEC_SETTINGS.approvalPolicy,
    requireFinanceSignoff: asBoolean(input.requireFinanceSignoff, DEFAULT_EXEC_SETTINGS.requireFinanceSignoff),
    requireRiskSignoff: asBoolean(input.requireRiskSignoff, DEFAULT_EXEC_SETTINGS.requireRiskSignoff),
    allowManagerOverride: asBoolean(input.allowManagerOverride, DEFAULT_EXEC_SETTINGS.allowManagerOverride),
    budgetAlertThreshold: clampInt(
      asNumber(input.budgetAlertThreshold, DEFAULT_EXEC_SETTINGS.budgetAlertThreshold),
      1,
      100
    ),
    delayAlertDays: clampInt(asNumber(input.delayAlertDays, DEFAULT_EXEC_SETTINGS.delayAlertDays), 1, 30),
    notifyInApp: asBoolean(input.notifyInApp, DEFAULT_EXEC_SETTINGS.notifyInApp),
    notifyDailySummary: asBoolean(input.notifyDailySummary, DEFAULT_EXEC_SETTINGS.notifyDailySummary),
    notifyEscalation: asBoolean(input.notifyEscalation, DEFAULT_EXEC_SETTINGS.notifyEscalation),
    layoutDensity: input.layoutDensity === "compact" ? "compact" : "comfortable",
    readinessProfiles: normalizeReadinessProfiles(input.readinessProfiles),
  };
}
