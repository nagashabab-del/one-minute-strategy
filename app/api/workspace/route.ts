import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { getClerkProductionIssue } from "../_shared/clerk-production-config";
import {
  isWorkspaceSnapshot,
  readWorkspaceForUser,
  writeWorkspaceForUser,
} from "../_shared/workspace-store";

const DEMO_MODE_ENABLED =
  process.env.NODE_ENV !== "production" && process.env.NEXT_PUBLIC_OMS_ALLOW_DEMO_MODE === "true";

function jsonError(status: number, error: string, code: string) {
  return NextResponse.json({ ok: false, error, code }, { status });
}

async function resolveWorkspaceUserKey() {
  const clerkConfigured = Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY);
  if (!clerkConfigured) {
    return DEMO_MODE_ENABLED ? "demo-user" : null;
  }
  try {
    const authResult = await auth();
    return authResult.userId ?? null;
  } catch {
    return null;
  }
}

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const configIssue = getClerkProductionIssue();
    if (configIssue) {
      return jsonError(503, configIssue.error, configIssue.code);
    }

    const userKey = await resolveWorkspaceUserKey();
    if (!userKey) {
      return jsonError(401, "تسجيل الدخول مطلوب للوصول إلى مساحة العمل.", "AUTH_REQUIRED");
    }
    const data = await readWorkspaceForUser(userKey);
    return NextResponse.json({ ok: true, data });
  } catch {
    return jsonError(500, "تعذر قراءة بيانات مساحة العمل.", "WORKSPACE_READ_FAILED");
  }
}

export async function PUT(req: Request) {
  try {
    const configIssue = getClerkProductionIssue();
    if (configIssue) {
      return jsonError(503, configIssue.error, configIssue.code);
    }

    const userKey = await resolveWorkspaceUserKey();
    if (!userKey) {
      return jsonError(401, "تسجيل الدخول مطلوب لحفظ مساحة العمل.", "AUTH_REQUIRED");
    }
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
