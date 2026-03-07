import { promises as fs } from "node:fs";

export type WorkspaceSnapshot = {
  schemaVersion: number;
  updatedAt: string;
  registryRaw: string;
  projectDataById: Record<string, string>;
  budgetById: Record<string, string>;
  planById: Record<string, string>;
};

type WorkspaceStoreFile = {
  users: Record<string, WorkspaceSnapshot>;
};

const WORKSPACE_STORE_PATH = process.env.OMS_WORKSPACE_STORE_PATH ?? "/tmp/oms_workspace_store_v1.json";
const WORKSPACE_KV_PREFIX = process.env.OMS_WORKSPACE_KV_PREFIX?.trim() || "oms:workspace:v1";
const KV_REST_API_URL = process.env.KV_REST_API_URL?.trim() ?? "";
const KV_REST_API_TOKEN = process.env.KV_REST_API_TOKEN?.trim() ?? "";
const hasKvConfig = KV_REST_API_URL.length > 0 && KV_REST_API_TOKEN.length > 0;
let inMemoryStore: WorkspaceStoreFile | null = null;

function workspaceKvKey(userKey: string) {
  return `${WORKSPACE_KV_PREFIX}:user:${userKey}`;
}

async function kvPipeline(command: string[]): Promise<unknown> {
  const response = await fetch(`${KV_REST_API_URL}/pipeline`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${KV_REST_API_TOKEN}`,
      "content-type": "application/json",
    },
    body: JSON.stringify([command]),
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`KV_HTTP_${response.status}`);
  }

  const payload = (await response.json()) as Array<{ result?: unknown; error?: string }>;
  const item = Array.isArray(payload) ? payload[0] : undefined;
  if (item?.error) {
    throw new Error(item.error);
  }
  return item?.result ?? null;
}

export function isWorkspaceSnapshot(value: unknown): value is WorkspaceSnapshot {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<WorkspaceSnapshot>;
  return (
    typeof candidate.schemaVersion === "number" &&
    typeof candidate.updatedAt === "string" &&
    typeof candidate.registryRaw === "string" &&
    typeof candidate.projectDataById === "object" &&
    candidate.projectDataById !== null &&
    typeof candidate.budgetById === "object" &&
    candidate.budgetById !== null &&
    typeof candidate.planById === "object" &&
    candidate.planById !== null
  );
}

async function readWorkspaceFromKv(userKey: string): Promise<WorkspaceSnapshot | null> {
  if (!hasKvConfig) return null;
  const result = await kvPipeline(["GET", workspaceKvKey(userKey)]);
  if (typeof result !== "string") return null;
  try {
    const parsed = JSON.parse(result) as unknown;
    return isWorkspaceSnapshot(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

async function writeWorkspaceToKv(userKey: string, snapshot: WorkspaceSnapshot) {
  if (!hasKvConfig) return;
  await kvPipeline(["SET", workspaceKvKey(userKey), JSON.stringify(snapshot)]);
}

async function readWorkspaceStore(): Promise<WorkspaceStoreFile> {
  if (inMemoryStore) return inMemoryStore;
  try {
    const raw = await fs.readFile(WORKSPACE_STORE_PATH, "utf8");
    const parsed = JSON.parse(raw) as Partial<WorkspaceStoreFile>;
    const users = parsed && typeof parsed.users === "object" && parsed.users ? parsed.users : {};
    inMemoryStore = { users };
    return inMemoryStore;
  } catch {
    inMemoryStore = { users: {} };
    return inMemoryStore;
  }
}

async function writeWorkspaceStore(store: WorkspaceStoreFile) {
  inMemoryStore = store;
  try {
    await fs.writeFile(WORKSPACE_STORE_PATH, JSON.stringify(store), "utf8");
  } catch {
    // Keep in-memory fallback when file persistence is unavailable.
  }
}

export async function readWorkspaceForUser(userKey: string): Promise<WorkspaceSnapshot | null> {
  if (hasKvConfig) {
    try {
      return await readWorkspaceFromKv(userKey);
    } catch {
      // Fallback for local/dev and transient KV failures.
    }
  }
  const store = await readWorkspaceStore();
  return store.users[userKey] ?? null;
}

export async function writeWorkspaceForUser(userKey: string, snapshot: WorkspaceSnapshot) {
  if (hasKvConfig) {
    try {
      await writeWorkspaceToKv(userKey, snapshot);
      return;
    } catch {
      // Fallback for local/dev and transient KV failures.
    }
  }

  const store = await readWorkspaceStore();
  store.users[userKey] = snapshot;
  await writeWorkspaceStore(store);
}
