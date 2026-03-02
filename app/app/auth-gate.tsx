"use client";

import { RedirectToSignIn, SignedIn, SignedOut } from "@clerk/nextjs";

export default function AppAuthGate({ children }: { children: React.ReactNode }) {
  const clerkConfigured = Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY);

  if (!clerkConfigured) {
    return <>{children}</>;
  }

  return (
    <>
      <SignedIn>{children}</SignedIn>
      <SignedOut>
        <RedirectToSignIn redirectUrl="/app" />
      </SignedOut>
    </>
  );
}
