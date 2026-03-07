import { auth } from "@clerk/nextjs/server";
import { notFound } from "next/navigation";
import { getClerkProductionIssue } from "../../../api/_shared/clerk-production-config";
import { readWorkspaceForUser, WorkspaceSnapshot } from "../../../api/_shared/workspace-store";
import ReportDetailsClientPage from "./report-details-client";

type ReportRouteParams = {
  id?: string | string[];
};

function normalizeReportId(id: ReportRouteParams["id"]): string {
  if (Array.isArray(id)) return id[0]?.trim() ?? "";
  return typeof id === "string" ? id.trim() : "";
}

function readRegistryProjectIds(registryRaw: string): string[] {
  if (!registryRaw.trim()) return [];
  try {
    const parsed = JSON.parse(registryRaw) as { projects?: Array<{ id?: string }> };
    const projects = Array.isArray(parsed.projects) ? parsed.projects : [];
    return projects
      .map((item) => (typeof item.id === "string" ? item.id.trim() : ""))
      .filter(Boolean);
  } catch {
    return [];
  }
}

function collectKnownReportIds(snapshot: WorkspaceSnapshot): Set<string> {
  const knownIds = new Set<string>();

  for (const id of Object.keys(snapshot.projectDataById ?? {})) {
    const normalized = id.trim();
    if (normalized) knownIds.add(normalized);
  }

  for (const id of readRegistryProjectIds(snapshot.registryRaw ?? "")) {
    knownIds.add(id);
  }

  return knownIds;
}

function isConfirmedMissingReport(snapshot: WorkspaceSnapshot | null, reportId: string): boolean {
  if (!snapshot) return false;
  const knownIds = collectKnownReportIds(snapshot);
  if (knownIds.size === 0) return false;
  return !knownIds.has(reportId);
}

export default async function ReportDetailsPage({
  params,
}: {
  params: ReportRouteParams | Promise<ReportRouteParams>;
}) {
  const resolvedParams = await Promise.resolve(params);
  const reportId = normalizeReportId(resolvedParams.id);
  if (!reportId) {
    notFound();
  }

  // Keep local/demo behavior unchanged; enforce true 404 only when server can verify user workspace ids.
  if (getClerkProductionIssue()) {
    return <ReportDetailsClientPage />;
  }

  const clerkConfigured = Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY?.trim());
  if (!clerkConfigured) {
    return <ReportDetailsClientPage />;
  }

  try {
    const authResult = await auth();
    if (authResult.userId) {
      const snapshot = await readWorkspaceForUser(authResult.userId);
      if (isConfirmedMissingReport(snapshot, reportId)) {
        notFound();
      }
    }
  } catch {
    // Fall back to client-side recovery UI for transient auth/storage failures.
  }

  return <ReportDetailsClientPage />;
}
