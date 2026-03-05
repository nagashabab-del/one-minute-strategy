"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, ReactNode, useEffect, useMemo, useState } from "react";
import { useSignIn } from "@clerk/nextjs";
import styles from "./page.module.css";

const clerkEnabled = Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY);
const demoModeEnabled =
  process.env.NODE_ENV !== "production" && process.env.NEXT_PUBLIC_OMS_ALLOW_DEMO_MODE === "true";

function readClerkErrorMessage(err: unknown) {
  if (typeof err === "object" && err !== null && "errors" in err && Array.isArray(err.errors)) {
    const first = err.errors[0];
    if (first && typeof first === "object" && "longMessage" in first && typeof first.longMessage === "string") {
      return first.longMessage;
    }
    if (first && typeof first === "object" && "message" in first && typeof first.message === "string") {
      return first.message;
    }
  }
  return "تعذر تسجيل الدخول الآن. حاول مرة أخرى.";
}

export default function LandingPage() {
  if (!clerkEnabled) {
    return <LandingWithoutClerk />;
  }

  return <LandingWithClerk />;
}

function LandingWithClerk() {
  const router = useRouter();
  const { isLoaded, signIn, setActive } = useSignIn();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const canSubmit = useMemo(() => !isSubmitting && !isGoogleLoading, [isSubmitting, isGoogleLoading]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const savedIdentifier = window.localStorage.getItem("oms_last_identifier");
    if (savedIdentifier) {
      setIdentifier(savedIdentifier);
      setRemember(true);
    }
  }, []);

  async function handlePasswordLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage("");

    const cleanIdentifier = identifier.trim();
    if (!cleanIdentifier || !password.trim()) {
      setErrorMessage("أدخل اسم المستخدم وكلمة المرور.");
      return;
    }

    if (!clerkEnabled || !isLoaded || !signIn || !setActive) {
      router.push("/sign-in");
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await signIn.create({
        identifier: cleanIdentifier,
        password,
      });

      if (result.status === "complete" && result.createdSessionId) {
        await setActive({ session: result.createdSessionId });
        if (typeof window !== "undefined") {
          if (remember) {
            window.localStorage.setItem("oms_last_identifier", cleanIdentifier);
          } else {
            window.localStorage.removeItem("oms_last_identifier");
          }
        }
        router.push("/app");
        return;
      }

      router.push("/sign-in");
    } catch (error) {
      setErrorMessage(readClerkErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleGoogleLogin() {
    setErrorMessage("");
    if (!clerkEnabled || !isLoaded || !signIn) {
      router.push("/sign-in");
      return;
    }

    setIsGoogleLoading(true);
    try {
      await signIn.authenticateWithRedirect({
        strategy: "oauth_google",
        redirectUrl: "/sign-in",
        redirectUrlComplete: "/app",
      });
    } catch (error) {
      setErrorMessage(readClerkErrorMessage(error));
      setIsGoogleLoading(false);
    }
  }

  return (
    <main className={styles.page}>
      <section className={styles.stage} aria-label="Landing hero">
        <div className={styles.card}>
          <div className={styles.overlay} />

          <div className={styles.contentGrid}>
            <section className={styles.authPane}>
              <form className={styles.loginForm} onSubmit={handlePasswordLogin} dir="rtl">
                <div className={styles.inputStack}>
                  <label className={styles.fieldLabel}>
                    <span className={styles.fieldText}>اسم المستخدم</span>
                    <input
                      className={styles.fieldInput}
                      value={identifier}
                      onChange={(event) => setIdentifier(event.target.value)}
                      autoComplete="username"
                      placeholder="ادخل اسم المستخدم"
                      disabled={!canSubmit}
                    />
                  </label>

                  <label className={styles.fieldLabel}>
                    <span className={styles.fieldText}>كلمة المرور</span>
                    <input
                      type="password"
                      className={styles.fieldInput}
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      autoComplete="current-password"
                      placeholder="ادخل كلمة المرور"
                      disabled={!canSubmit}
                    />
                  </label>
                </div>

                <label className={styles.rememberRow}>
                  <input
                    type="checkbox"
                    checked={remember}
                    onChange={(event) => setRemember(event.target.checked)}
                    disabled={!canSubmit}
                  />
                  <span>تذكرني</span>
                </label>

                <div className={styles.actionRow}>
                  <button type="submit" className={styles.loginBtn} disabled={!canSubmit}>
                    {isSubmitting ? "جاري تسجيل الدخول..." : "تسجيل الدخول"}
                  </button>
                  <button
                    type="button"
                    className={styles.googleBtn}
                    onClick={handleGoogleLogin}
                    disabled={!canSubmit}
                  >
                    {isGoogleLoading ? "جاري التحويل..." : "متابعة عبر Google"}
                  </button>
                </div>

                {errorMessage ? <p className={styles.errorText}>{errorMessage}</p> : null}
              </form>

              <div className={styles.registerRow}>
                <Link href="/sign-up">مستخدم جديد؟ سجل الآن</Link>
              </div>
            </section>

            <MarketingCopy />
          </div>
        </div>

        <footer className={styles.footer}>one minute 2026</footer>
      </section>
    </main>
  );
}

function LandingWithoutClerk() {
  return (
    <LandingShell
      authPane={
        <section className={styles.authPane}>
          <form className={styles.loginForm} dir="rtl">
            <div className={styles.inputStack}>
              <label className={styles.fieldLabel}>
                <span className={styles.fieldText}>اسم المستخدم</span>
                <input
                  className={styles.fieldInput}
                  autoComplete="username"
                  placeholder="ادخل اسم المستخدم"
                  disabled
                />
              </label>

              <label className={styles.fieldLabel}>
                <span className={styles.fieldText}>كلمة المرور</span>
                <input
                  type="password"
                  className={styles.fieldInput}
                  autoComplete="current-password"
                  placeholder="ادخل كلمة المرور"
                  disabled
                />
              </label>
            </div>

            <label className={styles.rememberRow}>
              <input type="checkbox" disabled />
              <span>تذكرني</span>
            </label>

            <div className={styles.actionRow}>
              <Link href="/sign-in" className={`${styles.loginBtn} ${styles.actionLink}`}>
                فتح تسجيل الدخول
              </Link>
              {demoModeEnabled ? (
                <Link href="/app" className={`${styles.googleBtn} ${styles.actionLink}`}>
                  دخول الوضع التجريبي
                </Link>
              ) : (
                <Link href="/sign-up" className={`${styles.googleBtn} ${styles.actionLink}`}>
                  إنشاء حساب
                </Link>
              )}
            </div>

            <p className={styles.infoText}>
              تسجيل الدخول المباشر يتطلب تفعيل Clerk.{" "}
              {demoModeEnabled
                ? "الوضع التجريبي مفعّل محليًا ويمكنك الدخول مباشرة."
                : "الوضع التجريبي غير مفعّل في هذه البيئة."}
            </p>
          </form>

          <div className={styles.registerRow}>
            <Link href="/sign-up">مستخدم جديد؟ سجل الآن</Link>
          </div>
        </section>
      }
    />
  );
}

function LandingShell({ authPane }: { authPane: ReactNode }) {
  return (
    <main className={styles.page}>
      <section className={styles.stage} aria-label="Landing hero">
        <div className={styles.card}>
          <div className={styles.overlay} />

          <div className={styles.contentGrid}>
            {authPane}
            <MarketingCopy />
          </div>
        </div>

        <footer className={styles.footer}>one minute 2026</footer>
      </section>
    </main>
  );
}

function MarketingCopy() {
  return (
    <aside className={styles.copyPane} dir="rtl">
      <Link href="/" className={styles.logoWrap} aria-label="One Minute Strategy home">
        <Image
          src="/landing-logo.svg"
          alt="One Minute Strategy"
          width={178}
          height={50}
          className={styles.logo}
          priority
        />
      </Link>
      <h2 className={styles.copyTitle}>
        <span className={styles.copyLine}>القرار في دقيقة</span>
        <span className={styles.copyLine}>والتنفيذ تحت السيطرة</span>
      </h2>
      <p className={styles.copyDescription}>
        منصة استراتيجية تجمع التحليل، القرار، والتنفيذ
        <br />
        في رحلة واحدة لإدارة المشاريع والفعاليات بوضوح كامل.
      </p>
    </aside>
  );
}
