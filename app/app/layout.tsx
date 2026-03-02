import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import AppShell from "./shell";

export default async function ProtectedAppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const clerkConfigured = Boolean(
    process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY && process.env.CLERK_SECRET_KEY
  );

  if (clerkConfigured) {
    const { userId } = await auth();
    if (!userId) {
      redirect("/sign-in?redirect_url=/app");
    }
  }

  return <AppShell>{children}</AppShell>;
}
