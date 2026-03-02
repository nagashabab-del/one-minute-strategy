"use client";

import { SignIn } from "@clerk/nextjs";

export default function SignInPage() {
  if (!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY) {
    return (
      <main dir="rtl" style={pageStyle}>
        <div style={missingKeyCardStyle}>
          تعذر تحميل تسجيل الدخول. أضف مفتاح Clerk
          <br />
          <code>NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY</code>
          <br />
          في إعدادات البيئة على Vercel.
        </div>
      </main>
    );
  }

  return (
    <main dir="rtl" style={pageStyle}>
      <SignIn path="/sign-in" routing="path" signUpUrl="/sign-up" forceRedirectUrl="/app" />
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

const missingKeyCardStyle = {
  borderRadius: 14,
  border: "1px solid rgba(138,160,255,0.32)",
  background: "linear-gradient(180deg, rgba(12,20,36,0.88), rgba(10,16,28,0.80))",
  padding: "14px 16px",
  textAlign: "center",
  lineHeight: 1.8,
  color: "#F5F8FF",
} as const;
