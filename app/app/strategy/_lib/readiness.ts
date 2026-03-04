import {
  evaluateStrategyReadiness as evaluateSharedStrategyReadiness,
  type StrategyReadinessField,
  type StrategyReadinessInput,
  type StrategyReadinessMode,
  type StrategyReadinessSummary,
} from "../../../lib/strategy-readiness";

export type StrategyProjectSnapshot = StrategyReadinessInput;
export type { StrategyReadinessField, StrategyReadinessMode, StrategyReadinessSummary };

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
  return evaluateSharedStrategyReadiness(snapshot);
}

function safeParse<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}
