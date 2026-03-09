import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { clerkUiEnabled } from "./clerk-runtime";

const POST_AUTH_ENTRY_HREF = "/app/strategy/workspace?entry=projects";

const demoModeEnabled =
  process.env.NODE_ENV !== "production" && process.env.NEXT_PUBLIC_OMS_ALLOW_DEMO_MODE === "true";

export default async function LandingPage() {
  if (!clerkUiEnabled) {
    redirect(demoModeEnabled ? POST_AUTH_ENTRY_HREF : "/sign-in");
  }

  try {
    const authResult = await auth();
    if (authResult.userId) {
      redirect(POST_AUTH_ENTRY_HREF);
    }
  } catch {
    // Keep landing resilient when auth provider is partially configured in preview environments.
  }

  redirect("/sign-in");
}
