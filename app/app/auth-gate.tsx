"use client";

import Link from "next/link";
import { RedirectToSignIn, SignedIn, SignedOut } from "@clerk/nextjs";

export default function AppAuthGate({ children }: { children: React.ReactNode }) {
  const clerkConfigured = Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY);
  const demoModeEnabled =
    process.env.NODE_ENV !== "production" && process.env.NEXT_PUBLIC_OMS_ALLOW_DEMO_MODE === "true";

  if (!clerkConfigured) {
    if (demoModeEnabled) {
      return <>{children}</>;
    }

    return (
      <main
        dir="rtl"
        style={{
          minHeight: "100vh",
          display: "grid",
          placeItems: "center",
          padding: "24px",
          background:
            "radial-gradient(circle at 20% 10%, rgba(121,41,255,0.20), transparent 36%), radial-gradient(circle at 85% 90%, rgba(0,229,255,0.12), transparent 36%), linear-gradient(180deg, #070a14, #090f1b 60%, #06080f)",
          color: "#F5F8FF",
        }}
      >
        <section
          style={{
            width: "min(560px, 100%)",
            borderRadius: "14px",
            border: "1px solid rgba(138,160,255,0.28)",
            background: "linear-gradient(180deg, rgba(11,16,32,0.90), rgba(8,12,23,0.82))",
            padding: "18px",
            display: "grid",
            gap: "10px",
          }}
        >
          <h1 style={{ margin: 0, fontSize: "20px", fontWeight: 900 }}>تسجيل الدخول مطلوب</h1>
          <p style={{ margin: 0, color: "rgba(220,231,255,0.78)", lineHeight: 1.8 }}>
            لا يمكن فتح لوحة التطبيق بدون تفعيل المصادقة. أضف مفتاح
            <code style={{ marginInline: 6 }}>NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY</code>
            أو فعّل الوضع التجريبي محليًا فقط عبر
            <code style={{ marginInline: 6 }}>NEXT_PUBLIC_OMS_ALLOW_DEMO_MODE=true</code>.
          </p>
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
            <Link href="/sign-in" className="oms-btn oms-btn-primary">
              الانتقال إلى تسجيل الدخول
            </Link>
            <Link href="/" className="oms-btn oms-btn-ghost">
              العودة للرئيسية
            </Link>
          </div>
        </section>
      </main>
    );
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
