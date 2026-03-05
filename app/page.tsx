"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { useSignIn } from "@clerk/nextjs";
import styles from "./page.module.css";

const clerkEnabled = Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY);

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
        if (remember && typeof window !== "undefined") {
          window.localStorage.setItem("oms_last_identifier", cleanIdentifier);
        } else if (typeof window !== "undefined") {
          window.localStorage.removeItem("oms_last_identifier");
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

          <div className={styles.panel}>
            <Link href="/" className={styles.logoWrap} aria-label="One Minute Strategy home">
              <Image
                src="/landing-logo.svg"
                alt="One Minute Strategy"
                width={126}
                height={36}
                className={styles.logo}
                priority
              />
            </Link>

            <h1 className={styles.title}>Welcome!</h1>
            <p className={styles.subtitle}>Today will be great.</p>

            <form className={styles.loginForm} onSubmit={handlePasswordLogin}>
              <div className={styles.inputStack}>
                <label className={styles.fieldLabel}>
                  <span className={styles.fieldIcon}>👤</span>
                  <input
                    className={styles.fieldInput}
                    value={identifier}
                    onChange={(event) => setIdentifier(event.target.value)}
                    autoComplete="username"
                    placeholder="Username"
                    disabled={!canSubmit}
                  />
                </label>
                <label className={styles.fieldLabel}>
                  <span className={styles.fieldIcon}>🔒</span>
                  <input
                    type="password"
                    className={styles.fieldInput}
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    autoComplete="current-password"
                    placeholder="Password"
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
                <span>Remember me</span>
              </label>

              <div className={styles.actionRow}>
                <button type="submit" className={styles.loginBtn} disabled={!canSubmit}>
                  {isSubmitting ? "Logging in..." : "LOGIN"}
                </button>
                <button
                  type="button"
                  className={styles.googleBtn}
                  onClick={handleGoogleLogin}
                  disabled={!canSubmit}
                >
                  {isGoogleLoading ? "Redirecting..." : "تسجيل الدخول عبر Google"}
                </button>
              </div>

              {errorMessage ? <p className={styles.errorText}>{errorMessage}</p> : null}
            </form>

            <div className={styles.registerRow}>
              <Link href="/sign-up">مستخدم جديد؟ سجل الآن</Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
