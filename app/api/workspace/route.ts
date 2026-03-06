import { promises as fs } from "node:fs";
import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

type WorkspaceSnapshot = {
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

function jsonError(status: number, error: string, code: string) {
  return NextResponse.json({ ok: false, error, code }, { status });
}

async function resolveWorkspaceUserKey() {
  const clerkConfigured = Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY);
  if (!clerkConfigured) return "demo-user";
  try {
    const authResult = await auth();
    return authResult.userId ?? "demo-user";
  } catch {
    return "demo-user";
  }
}

function isWorkspaceSnapshot(value: unknown): value is WorkspaceSnapshot {
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

async function readWorkspaceForUser(userKey: string): Promise<WorkspaceSnapshot | null> {
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

async function writeWorkspaceForUser(userKey: string, snapshot: WorkspaceSnapshot) {
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

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const userKey = await resolveWorkspaceUserKey();
    const data = await readWorkspaceForUser(userKey);
    return NextResponse.json({ ok: true, data });
  } catch {
    return jsonError(500, "تعذر قراءة بيانات مساحة العمل.", "WORKSPACE_READ_FAILED");
  }
}

export async function PUT(req: Request) {
  try {
    const userKey = await resolveWorkspaceUserKey();
    const body = await req.json();
    const workspace = body?.workspace;
    if (!isWorkspaceSnapshot(workspace)) {
      return jsonError(400, "بيانات مساحة العمل غير صالحة.", "INVALID_WORKSPACE_PAYLOAD");
    }

    await writeWorkspaceForUser(userKey, {
      schemaVersion: workspace.schemaVersion,
      updatedAt: workspace.updatedAt,
      registryRaw: workspace.registryRaw,
      projectDataById: workspace.projectDataById,
      budgetById: workspace.budgetById,
      planById: workspace.planById,
    });

    return NextResponse.json({ ok: true });
  } catch {
    return jsonError(500, "تعذر حفظ بيانات مساحة العمل.", "WORKSPACE_WRITE_FAILED");
  }
}
