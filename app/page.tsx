import Image from "next/image";
import Link from "next/link";
import styles from "./page.module.css";

const trustPoints = [
  "تدفق عربي RTL كامل",
  "مسار قرار وتنفيذ وتقارير في منصة واحدة",
  "تقارير جاهزة للعرض على الإدارة والعميل",
];

const features = [
  {
    title: "قرار تنفيذي أسرع",
    body: "حوّل ملخص المشروع إلى اتجاه قرار واضح وخطة تشغيلية قابلة للتنفيذ خلال وقت قصير.",
  },
  {
    title: "تنفيذ مترابط",
    body: "من Scope إلى BOQ والمخاطر والميزانية ضمن رحلة واحدة بدون تشتيت بين أدوات متعددة.",
  },
  {
    title: "حوكمة قابلة للقياس",
    body: "تابع الجاهزية والتكلفة والربحية التشغيلية بتفاصيل تدعم قرار الإدارة.",
  },
];

const steps = [
  {
    title: "Decision",
    body: "ابدأ بملخص المشروع والقيود الأساسية لتكوين قرار واضح وقابل للتنفيذ.",
  },
  {
    title: "Execution",
    body: "ابنِ خطة التنفيذ: نطاق العمل، BOQ، المسؤوليات، والمخاطر بترابط كامل.",
  },
  {
    title: "Reports",
    body: "اخرج تقريرًا تنفيذيًا جاهزًا للمشاركة يلخص الحالة، التكلفة، ونقاط القرار.",
  },
];

export default function LandingPage() {
  return (
    <main dir="rtl" className={styles.page}>
      <div className={styles.container}>
        <section className={styles.heroShell}>
          <header className={styles.topBar}>
            <Link href="/" className={styles.logoWrap} aria-label="One Minute Strategy">
              <Image
                src="/landing-logo.svg"
                alt="One Minute Strategy"
                width={130}
                height={38}
                className={styles.logo}
                priority
              />
            </Link>
            <div className={styles.topActions}>
              <Link href="/sign-in" className={styles.topLink}>
                لديك حساب؟ تسجيل الدخول
              </Link>
              <Link href="/sign-up" className={`${styles.btn} ${styles.btnPrimary}`}>
                مستخدم جديد؟ سجل الآن
              </Link>
            </div>
          </header>

          <div className={styles.heroGrid}>
            <div className={styles.heroContent}>
              <p className={styles.kicker}>منصة قرار وتنفيذ احترافية</p>
              <h1 className={styles.heroTitle}>من القرار إلى التنفيذ والتقرير في مسار واحد واضح</h1>
              <p className={styles.heroText}>
                One Minute Strategy تساعد فرق التشغيل على تحويل مدخلات المشروع إلى خطة تنفيذ متكاملة
                خلال أقل من 60 دقيقة.
              </p>

              <div className={styles.heroActions}>
                <Link href="/sign-up" className={`${styles.btn} ${styles.btnPrimary}`}>
                  مستخدم جديد؟ سجل الآن
                </Link>
                <Link href="/sign-in" className={`${styles.btn} ${styles.btnGhost}`}>
                  لديك حساب؟ تسجيل الدخول
                </Link>
              </div>
            </div>

            <aside className={styles.visualPanel}>
              <div className={styles.visualShade} />
              <div className={styles.visualTop}>Decision → Execution → Reports</div>
              <div className={styles.visualBody}>
                <span className={styles.visualChip}>جاهزية تنفيذية</span>
                <span className={styles.visualChip}>ربحية تشغيلية</span>
                <span className={styles.visualChip}>تقارير فورية</span>
              </div>
            </aside>
          </div>
        </section>

        <section className={styles.trustGrid} aria-label="مؤشرات الثقة">
          {trustPoints.map((point) => (
            <article key={point} className={styles.trustCard}>
              {point}
            </article>
          ))}
        </section>

        <section className={styles.featureGrid} aria-label="فوائد المنصة">
          {features.map((feature) => (
            <article key={feature.title} className={styles.featureCard}>
              <h2>{feature.title}</h2>
              <p>{feature.body}</p>
            </article>
          ))}
        </section>

        <section className={styles.stepsSection} aria-label="طريقة العمل">
          <h3>كيف تعمل المنصة خلال 3 خطوات؟</h3>
          <div className={styles.stepsGrid}>
            {steps.map((step) => (
              <article key={step.title} className={styles.stepCard}>
                <h4>{step.title}</h4>
                <p>{step.body}</p>
              </article>
            ))}
          </div>
        </section>

        <section className={styles.ctaSection}>
          <h3>ابدأ الآن</h3>
          <p>انطلق بأول تحليل استراتيجي وابدأ بناء خطة التنفيذ مباشرة.</p>
          <Link href="/sign-up" className={`${styles.btn} ${styles.btnPrimary}`}>
            مستخدم جديد؟ سجل الآن
          </Link>
        </section>

        <footer className={styles.footer}>© {new Date().getFullYear()} One Minute Strategy</footer>
      </div>
    </main>
  );
}
