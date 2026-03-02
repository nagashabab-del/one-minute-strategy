"use client";

import { SignUp } from "@clerk/nextjs";

export default function SignUpPage() {
  return (
    <main dir="rtl" style={pageStyle}>
      <SignUp path="/sign-up" routing="path" signInUrl="/sign-in" forceRedirectUrl="/app" />
    </main>
  );
}

const pageStyle = {
  minHeight: "100vh",
  display: "grid",
  placeItems: "center",
  padding: 16,
  background:
    "radial-gradient(circle at 20% 10%, rgba(121,41,255,0.24), transparent 35%), linear-gradient(180deg, #080b16, #070b14)",
} as const;
