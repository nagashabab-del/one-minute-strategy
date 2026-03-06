import {
  evaluateStrategyReadiness as evaluateSharedStrategyReadiness,
  type StrategyReadinessField,
  type StrategyReadinessInput,
  type StrategyReadinessMode,
  type StrategyReadinessSummary,
} from "../../../lib/strategy-readiness";
import {
  PROJECTS_REGISTRY_KEY,
  PROJECT_DATA_KEY_PREFIX,
  hydrateWorkspaceFromBackend,
  scheduleWorkspacePersist,
} from "../../_lib/workspace-backend";

export type StrategyProjectSnapshot = StrategyReadinessInput & {
  stage?: string;
};
export type { StrategyReadinessField, StrategyReadinessMode, StrategyReadinessSummary };

export type StrategyWorkspaceStage =
  | "welcome"
  | "projects_hub"
  | "init"
  | "round1"
  | "round2"
  | "dialogue"
  | "addition"
  | "done"
  | "advanced_scope"
  | "advanced_boq"
  | "advanced_plan";

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

const WORKSPACE_STAGE_ORDER: StrategyWorkspaceStage[] = [
  "welcome",
  "projects_hub",
  "init",
  "round1",
  "round2",
  "dialogue",
  "addition",
  "done",
  "advanced_scope",
  "advanced_boq",
  "advanced_plan",
];

const WORKSPACE_STAGE_LABEL: Record<StrategyWorkspaceStage, string> = {
  welcome: "الانطلاق",
  projects_hub: "مركز المشاريع",
  init: "تهيئة المشروع",
  round1: "الجولة الأولى",
  round2: "جولة المتابعة",
  dialogue: "جلسة الحوار",
  addition: "الإضافة قبل التحليل",
  done: "التحليل النهائي",
  advanced_scope: "النطاق المتقدم",
  advanced_boq: "جدول الكميات",
  advanced_plan: "الخطة المتقدمة",
};

export function readActiveStrategyProject(): ActiveStrategyProject {
  if (typeof window === "undefined") {
    return { id: "global", name: "مشروع غير محدد", snapshot: {} };
  }
  void hydrateWorkspaceFromBackend();
  scheduleWorkspacePersist();

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

export function readWorkspaceStage(snapshot: StrategyProjectSnapshot): StrategyWorkspaceStage | null {
  if (typeof snapshot.stage !== "string") return null;
  return isStrategyWorkspaceStage(snapshot.stage) ? snapshot.stage : null;
}

export function workspaceStageLabel(stage: StrategyWorkspaceStage | null): string {
  if (!stage) return "غير محدد";
  return WORKSPACE_STAGE_LABEL[stage];
}

export function hasStrategyWorkspaceProgress(snapshot: StrategyProjectSnapshot): boolean {
  const stage = readWorkspaceStage(snapshot);
  if (!stage) return false;
  return stage !== "welcome" && stage !== "projects_hub";
}

function isStrategyWorkspaceStage(value: string): value is StrategyWorkspaceStage {
  return WORKSPACE_STAGE_ORDER.includes(value as StrategyWorkspaceStage);
}

function safeParse<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}
