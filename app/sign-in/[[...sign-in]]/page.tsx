"use client";

import Image from "next/image";
import Link from "next/link";
import { SignIn } from "@clerk/nextjs";
import { clerkUiEnabled, readClerkUiIssueMessage } from "../../clerk-runtime";
import styles from "../../auth-shell.module.css";

export default function SignInPage() {
  const authIssueMessage = readClerkUiIssueMessage();

  return (
    <main dir="rtl" className={styles.page}>
      <section className={styles.card}>
        <div className={styles.overlay} />
        <div className={styles.panel}>
          <Link href="/" className={styles.logoWrap} aria-label="One Minute Strategy home">
            <Image
              src="/landing-logo.svg"
              alt="One Minute Strategy"
              width={130}
              height={36}
              className={styles.logo}
              priority
            />
          </Link>

          {!clerkUiEnabled ? (
            <div className={styles.missingKeyCard}>
              {authIssueMessage || "تعذر تحميل تسجيل الدخول بسبب إعدادات المصادقة."}
            </div>
          ) : (
            <SignIn
              path="/sign-in"
              routing="path"
              signUpUrl="/sign-up"
              fallbackRedirectUrl="/app"
              appearance={authAppearance}
            />
          )}
        </div>
      </section>
    </main>
  );
}

const authAppearance = {
  layout: {
    socialButtonsPlacement: "top",
    socialButtonsVariant: "blockButton",
    showOptionalFields: false,
  },
  elements: {
    cardBox: {
      boxShadow: "none",
      width: "100%",
    },
    card: {
      background: "rgba(6, 11, 22, 0.64)",
      border: "1px solid rgba(138,160,255,0.28)",
      borderRadius: "12px",
      boxShadow: "none",
      backdropFilter: "blur(2px)",
    },
    headerTitle: {
      color: "#F5F8FF",
      fontWeight: 800,
    },
    headerSubtitle: {
      color: "rgba(221,233,255,0.80)",
    },
    socialButtonsBlockButton: {
      borderRadius: "10px",
      border: "1px solid rgba(138,160,255,0.36)",
      background: "rgba(12,20,36,0.86)",
      color: "#F5F8FF",
      minHeight: "42px",
    },
    socialButtonsBlockButtonText: {
      fontWeight: 800,
    },
    formFieldInput: {
      background: "rgba(9,16,30,0.84)",
      border: "1px solid rgba(138,160,255,0.26)",
      color: "#F5F8FF",
    },
    formButtonPrimary: {
      background: "linear-gradient(180deg, #3f8bcf 0%, #2c6ea8 100%)",
      border: "1px solid rgba(124, 180, 227, 0.6)",
      minHeight: "42px",
    },
    footerActionLink: {
      color: "#9bb8ff",
    },
  },
} as const;
