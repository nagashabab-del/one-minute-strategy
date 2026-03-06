export const PROJECTS_REGISTRY_KEY = "oms_dashboard_projects_registry_v1";
export const PROJECT_DATA_KEY_PREFIX = "oms_dashboard_project_data_v1_";
export const BUDGET_TRACKER_PREFIX = "oms_exec_budget_tracker_v1_";
export const PLAN_TRACKER_PREFIX = "oms_exec_plan_tracker_v1_";

const WORKSPACE_API_ENDPOINT = "/api/workspace";
const WORKSPACE_SYNC_EVENT = "oms-workspace-backend-sync";
const WORKSPACE_SCHEMA_VERSION = 1;
const WORKSPACE_PATCH_FLAG = "__oms_workspace_storage_patch_v1__";

type ProjectsRegistryShape = {
  projects?: Array<{
    id?: string;
    isArchived?: boolean;
  }>;
};

export type WorkspaceBackendSnapshot = {
  schemaVersion: number;
  updatedAt: string;
  registryRaw: string;
  projectDataById: Record<string, string>;
  budgetById: Record<string, string>;
  planById: Record<string, string>;
};

let hydrationAttempted = false;
let hydrationPromise: Promise<void> | null = null;
let persistTimer: number | null = null;
let persistInFlight = false;
let lastPersistSignature = "";
let applyingSnapshot = false;

function isBrowser() {
  return typeof window !== "undefined";
}

function projectDataKey(projectId: string) {
  return `${PROJECT_DATA_KEY_PREFIX}${projectId}`;
}

function budgetTrackerKey(projectId: string) {
  return `${BUDGET_TRACKER_PREFIX}${projectId}`;
}

function planTrackerKey(projectId: string) {
  return `${PLAN_TRACKER_PREFIX}${projectId}`;
}

function safeParse<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function parseProjectIds(registryRaw: string): string[] {
  const parsed = safeParse<ProjectsRegistryShape>(registryRaw, {});
  const projects = Array.isArray(parsed.projects) ? parsed.projects : [];
  const ids = projects
    .filter((item) => item && typeof item.id === "string" && item.id.trim().length > 0 && item.isArchived !== true)
    .map((item) => String(item.id));
  return Array.from(new Set(ids));
}

function isWorkspaceStorageKey(key: string | null): boolean {
  if (!key) return false;
  if (key === PROJECTS_REGISTRY_KEY) return true;
  if (key.startsWith(PROJECT_DATA_KEY_PREFIX)) return true;
  if (key.startsWith(BUDGET_TRACKER_PREFIX)) return true;
  if (key.startsWith(PLAN_TRACKER_PREFIX)) return true;
  return false;
}

function dispatchWorkspaceSyncEvent() {
  if (!isBrowser()) return;
  window.dispatchEvent(new Event(WORKSPACE_SYNC_EVENT));
}

function snapshotSignature(snapshot: WorkspaceBackendSnapshot): string {
  return [
    snapshot.registryRaw,
    ...Object.values(snapshot.projectDataById),
    ...Object.values(snapshot.budgetById),
    ...Object.values(snapshot.planById),
  ].join("::");
}

function readLocalWorkspaceSnapshot(): WorkspaceBackendSnapshot | null {
  if (!isBrowser()) return null;

  const registryRaw = window.localStorage.getItem(PROJECTS_REGISTRY_KEY) ?? "";
  const projectIds = registryRaw ? parseProjectIds(registryRaw) : [];
  if (!registryRaw && projectIds.length === 0) return null;

  const projectDataById: Record<string, string> = {};
  const budgetById: Record<string, string> = {};
  const planById: Record<string, string> = {};

  for (const projectId of projectIds) {
    projectDataById[projectId] = window.localStorage.getItem(projectDataKey(projectId)) ?? "";
    budgetById[projectId] = window.localStorage.getItem(budgetTrackerKey(projectId)) ?? "";
    planById[projectId] = window.localStorage.getItem(planTrackerKey(projectId)) ?? "";
  }

  return {
    schemaVersion: WORKSPACE_SCHEMA_VERSION,
    updatedAt: new Date().toISOString(),
    registryRaw,
    projectDataById,
    budgetById,
    planById,
  };
}

function applyWorkspaceSnapshot(snapshot: WorkspaceBackendSnapshot): boolean {
  if (!isBrowser()) return false;
  const localRegistryRaw = window.localStorage.getItem(PROJECTS_REGISTRY_KEY) ?? "";

  // Keep local workspace as source-of-truth when already present on this device.
  if (localRegistryRaw.trim().length > 0) {
    return false;
  }

  applyingSnapshot = true;
  try {
    window.localStorage.setItem(PROJECTS_REGISTRY_KEY, snapshot.registryRaw ?? "");

    for (const [projectId, value] of Object.entries(snapshot.projectDataById ?? {})) {
      window.localStorage.setItem(projectDataKey(projectId), value ?? "");
    }
    for (const [projectId, value] of Object.entries(snapshot.budgetById ?? {})) {
      window.localStorage.setItem(budgetTrackerKey(projectId), value ?? "");
    }
    for (const [projectId, value] of Object.entries(snapshot.planById ?? {})) {
      window.localStorage.setItem(planTrackerKey(projectId), value ?? "");
    }
  } finally {
    applyingSnapshot = false;
  }

  return true;
}

async function persistWorkspaceToBackend() {
  if (!isBrowser() || persistInFlight) return;
  const snapshot = readLocalWorkspaceSnapshot();
  if (!snapshot) return;
  const signature = snapshotSignature(snapshot);
  if (!signature || signature === lastPersistSignature) return;

  persistInFlight = true;
  try {
    const response = await fetch(WORKSPACE_API_ENDPOINT, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ workspace: snapshot }),
      cache: "no-store",
    });
    if (!response.ok) return;
    lastPersistSignature = signature;
  } catch {
    // Ignore network/storage failures and keep local UX uninterrupted.
  } finally {
    persistInFlight = false;
  }
}

export function hydrateWorkspaceFromBackend() {
  if (!isBrowser()) return Promise.resolve();
  if (hydrationAttempted) return hydrationPromise ?? Promise.resolve();
  hydrationAttempted = true;

  hydrationPromise = (async () => {
    try {
      const response = await fetch(WORKSPACE_API_ENDPOINT, { cache: "no-store" });
      if (!response.ok) return;
      const payload = (await response.json()) as { ok?: boolean; data?: WorkspaceBackendSnapshot | null };
      if (!payload?.ok || !payload.data) return;
      if (applyWorkspaceSnapshot(payload.data)) {
        dispatchWorkspaceSyncEvent();
      }
    } catch {
      // Silent fallback to local workspace cache.
    }
  })();

  return hydrationPromise;
}

export function scheduleWorkspacePersist() {
  if (!isBrowser()) return;
  if (persistTimer !== null) {
    window.clearTimeout(persistTimer);
  }
  persistTimer = window.setTimeout(() => {
    persistTimer = null;
    void persistWorkspaceToBackend();
  }, 350);
}

export function subscribeWorkspaceBackendSync(callback: () => void) {
  if (!isBrowser()) return () => {};
  const onSync = () => callback();
  window.addEventListener(WORKSPACE_SYNC_EVENT, onSync);
  return () => window.removeEventListener(WORKSPACE_SYNC_EVENT, onSync);
}

export function installWorkspaceSyncBridge() {
  if (!isBrowser()) return;
  const storage = window.localStorage as Storage & { [WORKSPACE_PATCH_FLAG]?: boolean };
  if (storage[WORKSPACE_PATCH_FLAG]) return;
  storage[WORKSPACE_PATCH_FLAG] = true;

  const proto = Object.getPrototypeOf(storage) as Storage;
  const originalSetItem = proto.setItem;
  const originalRemoveItem = proto.removeItem;
  const originalClear = proto.clear;

  proto.setItem = function patchedSetItem(key: string, value: string) {
    originalSetItem.call(this, key, value);
    if (this !== window.localStorage || applyingSnapshot || !isWorkspaceStorageKey(key)) return;
    scheduleWorkspacePersist();
    dispatchWorkspaceSyncEvent();
  };

  proto.removeItem = function patchedRemoveItem(key: string) {
    originalRemoveItem.call(this, key);
    if (this !== window.localStorage || applyingSnapshot || !isWorkspaceStorageKey(key)) return;
    scheduleWorkspacePersist();
    dispatchWorkspaceSyncEvent();
  };

  proto.clear = function patchedClear() {
    originalClear.call(this);
    if (this !== window.localStorage || applyingSnapshot) return;
    scheduleWorkspacePersist();
    dispatchWorkspaceSyncEvent();
  };

  window.addEventListener("storage", (event) => {
    if (!isWorkspaceStorageKey(event.key)) return;
    dispatchWorkspaceSyncEvent();
  });
  void hydrateWorkspaceFromBackend();
  scheduleWorkspacePersist();
}
