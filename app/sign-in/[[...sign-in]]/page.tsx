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
      <section className={styles.stage}>
        <div className={styles.card}>
          <div className={styles.overlay} />
          <div className={styles.contentGrid}>
            <section className={styles.authPane}>
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

                <div className={styles.authIntro}>
                  <h2 className={styles.authTitle}>تسجيل الدخول</h2>
                  <p className={styles.authSubtitle}>أدخل بريدك الإلكتروني للمتابعة إلى لوحة التحكم</p>
                </div>

                {!clerkUiEnabled ? (
                  <div className={styles.missingKeyCard}>
                    {authIssueMessage || "تعذر تحميل تسجيل الدخول بسبب إعدادات المصادقة."}
                  </div>
                ) : (
                  <SignIn
                    path="/sign-in"
                    routing="path"
                    signUpUrl="/sign-up"
                    fallbackRedirectUrl="/app/strategy/workspace?entry=projects"
                    appearance={authAppearance}
                  />
                )}
              </div>
            </section>

            <section className={styles.copyPane}>
              <div className={styles.copyStack}>
                <h1 className={styles.copyTitle}>
                  <span className={styles.copyLine}>القرار في دقيقة</span>
                  <span className={styles.copyLine}>والتنفيذ تحت السيطرة</span>
                </h1>
                <p className={styles.copyDescription}>
                  <span className={styles.copyDescriptionLine}>
                    حل استراتيجي يجمع التحليل والقرار والتنفيذ
                  </span>
                  <span className={styles.copyDescriptionLine}>في منصة واحدة.</span>
                </p>
              </div>
            </section>
          </div>
        </div>
        <p className={styles.footer}>one minute 2026</p>
      </section>
    </main>
  );
}

const authAppearance = {
  variables: {
    colorForeground: "#F2F2F7",
    colorText: "#F2F2F7",
    colorMutedForeground: "#AAA",
    colorTextSecondary: "#AAA",
    colorBackground: "rgba(13, 13, 13, 0.86)",
    colorInput: "rgba(16, 16, 16, 0.72)",
    colorInputBackground: "rgba(16, 16, 16, 0.72)",
    colorInputForeground: "#E9E9EF",
    colorInputText: "#E9E9EF",
    colorBorder: "rgba(58, 58, 58, 0.9)",
    colorNeutral: "rgba(58, 58, 58, 0.9)",
    colorPrimary: "#5552FF",
  },
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
      background: "linear-gradient(180deg, rgba(13,13,13,0.86), rgba(11,11,11,0.86))",
      border: "1px solid #1A1A1A",
      borderRadius: "18px",
      boxShadow: "0 24px 56px rgba(1, 2, 5, 0.44)",
      backdropFilter: "blur(10px)",
    },
    headerTitle: {
      color: "#F2F2F7",
      fontWeight: 700,
      display: "none",
    },
    headerSubtitle: {
      color: "rgba(221,233,255,0.80)",
      display: "none",
    },
    formFieldLabel: {
      color: "#DDD",
      fontWeight: 700,
      fontSize: "13px",
    },
    formFieldHintText: {
      color: "rgba(221,233,255,0.74)",
    },
    formFieldErrorText: {
      color: "#FF9FAE",
      fontWeight: 700,
    },
    socialButtonsBlockButton: {
      borderRadius: "11px",
      border: "1px solid rgba(58,58,58,0.9)",
      background: "rgba(16,16,16,0.62)",
      color: "#F2F2F7",
      minHeight: "46px",
    },
    socialButtonsBlockButtonText: {
      fontWeight: 600,
      fontSize: "15px",
    },
    formFieldInput: {
      background: "rgba(16,16,16,0.72)",
      border: "1px solid rgba(58,58,58,0.9)",
      borderRadius: "11px",
      color: "#E9E9EF",
      caretColor: "#E9E9EF",
      minHeight: "48px",
      fontSize: "15px",
      fontWeight: 500,
      padding: "0 16px",
    },
    formFieldInputShowPasswordButton: {
      color: "#DADADA",
    },
    dividerText: {
      color: "#8A8A8A",
    },
    dividerLine: {
      background: "rgba(58,58,58,0.9)",
    },
    formButtonPrimary: {
      background: "linear-gradient(180deg, #6F67FF 0%, #5552FF 100%)",
      border: "1px solid rgba(109, 106, 255, 0.82)",
      borderRadius: "20px",
      minHeight: "48px",
      fontSize: "15px",
      fontWeight: 700,
      letterSpacing: "0.01em",
      boxShadow: "0 10px 26px rgba(85, 82, 255, 0.35), inset 0 1px 0 rgba(255, 255, 255, 0.18)",
    },
    footerActionText: {
      color: "#AAA",
    },
    footerActionLink: {
      color: "#8F8CFF",
    },
  },
} as const;
