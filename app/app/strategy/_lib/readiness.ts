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

const PLACEHOLDER_PROJECT_ID = "local_default_project";
const PLACEHOLDER_PROJECT_NAMES = new Set(["مشروع 1", "project 1", "مشروع بدون اسم"]);

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
  const candidate = activeFromRegistry ?? activeCandidates[0] ?? projects[0];
  if (!candidate) {
    return { id: "global", name: "مشروع غير محدد", snapshot: {} };
  }

  const candidateSnapshot = readProjectSnapshot(candidate.id);
  if (isPlaceholderProjectWithoutData(candidate.id, candidate.name, candidateSnapshot)) {
    const fallbackActive =
      activeCandidates.find((item) => {
        if (item.id === candidate.id) return false;
        const snapshot = readProjectSnapshot(item.id);
        return !isPlaceholderProjectWithoutData(item.id, item.name, snapshot);
      }) ??
      projects.find((item) => {
        if (item.id === candidate.id) return false;
        const snapshot = readProjectSnapshot(item.id);
        return !isPlaceholderProjectWithoutData(item.id, item.name, snapshot);
      });
    if (!fallbackActive) {
      return { id: "global", name: "مشروع غير محدد", snapshot: {} };
    }
    return {
      id: fallbackActive.id,
      name: fallbackActive.name,
      snapshot: readProjectSnapshot(fallbackActive.id),
    };
  }

  return {
    id: candidate.id,
    name: candidate.name,
    snapshot: candidateSnapshot,
  };
}

export function readActiveStrategyProjectId(): string {
  const id = readActiveStrategyProject().id;
  return id === "global" ? "" : id;
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

function readProjectSnapshot(projectId: string): StrategyProjectSnapshot {
  const snapshotRaw = localStorage.getItem(`${PROJECT_DATA_KEY_PREFIX}${projectId}`);
  return safeParse<StrategyProjectSnapshot>(snapshotRaw, {});
}

function isPlaceholderProjectWithoutData(
  id: string,
  name: string,
  snapshot: StrategyProjectSnapshot
): boolean {
  if (id !== PLACEHOLDER_PROJECT_ID) return false;
  if (hasMeaningfulSnapshot(snapshot)) return false;
  const normalizedName = (name || "").trim().toLocaleLowerCase("ar-SA");
  return normalizedName.length === 0 || PLACEHOLDER_PROJECT_NAMES.has(normalizedName);
}

function hasMeaningfulSnapshot(snapshot: StrategyProjectSnapshot): boolean {
  if (!snapshot || typeof snapshot !== "object") return false;
  const bag = snapshot as Record<string, unknown>;

  const textKeys = [
    "project",
    "eventType",
    "budget",
    "startAt",
    "endAt",
    "report_text",
  ];
  if (textKeys.some((key) => typeof bag[key] === "string" && String(bag[key]).trim().length > 0)) {
    return true;
  }

  if (typeof bag.stage === "string" && bag.stage !== "welcome" && bag.stage !== "projects_hub") {
    return true;
  }

  if (Array.isArray(bag.round1Questions) && bag.round1Questions.length > 0) return true;
  if (Array.isArray(bag.followupQuestions) && bag.followupQuestions.length > 0) return true;
  if (Array.isArray(bag.answers) && bag.answers.length > 0) return true;
  if (Array.isArray(bag.dialogue) && bag.dialogue.length > 0) return true;

  const analysis = bag.analysis;
  if (analysis && typeof analysis === "object" && Object.keys(analysis).length > 0) return true;

  return false;
}
