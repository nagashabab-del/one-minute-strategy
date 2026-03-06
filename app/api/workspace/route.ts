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

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const userKey = await resolveWorkspaceUserKey();
    const store = await readWorkspaceStore();
    const data = store.users[userKey] ?? null;
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

    const store = await readWorkspaceStore();
    store.users[userKey] = {
      schemaVersion: workspace.schemaVersion,
      updatedAt: workspace.updatedAt,
      registryRaw: workspace.registryRaw,
      projectDataById: workspace.projectDataById,
      budgetById: workspace.budgetById,
      planById: workspace.planById,
    };
    await writeWorkspaceStore(store);

    return NextResponse.json({ ok: true });
  } catch {
    return jsonError(500, "تعذر حفظ بيانات مساحة العمل.", "WORKSPACE_WRITE_FAILED");
  }
}
