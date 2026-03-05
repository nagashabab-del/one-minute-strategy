import Image from "next/image";
import Link from "next/link";
import styles from "./page.module.css";

export default function LandingPage() {
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

            <div className={styles.inputStack}>
              <label className={styles.fakeField}>
                <span className={styles.fieldIcon}>👤</span>
                <span>Username</span>
              </label>
              <label className={styles.fakeField}>
                <span className={styles.fieldIcon}>🔒</span>
                <span>Password</span>
              </label>
            </div>

            <div className={styles.rememberRow}>
              <span className={styles.fakeCheck} />
              <span>Remember me</span>
            </div>

            <Link href="/sign-in" className={styles.loginBtn}>
              LOGIN
            </Link>

            <Link href="/sign-in" className={styles.googleBtn}>
              تسجيل الدخول عبر Google
            </Link>

            <div className={styles.linkGrid}>
              <Link href="/sign-up">مستخدم جديد؟ سجل الآن</Link>
              <Link href="/sign-in">لديك حساب؟ تسجيل الدخول</Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
