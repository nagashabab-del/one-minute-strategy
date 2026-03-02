import Link from "next/link";
import { auth } from "@clerk/nextjs/server";

const features = [
  {
    title: "قرار تنفيذي أسرع",
    body: "حوّل مدخلات المستشارين إلى قرار واضح وخطة تنفيذ قابلة للقياس خلال دقائق.",
  },
  {
    title: "مسار تشغيلي متكامل",
    body: "من نطاق العمل إلى التقارير النهائية، كل مرحلة موثقة داخل رحلة واحدة.",
  },
  {
    title: "حوكمة وتتبّع فوري",
    body: "راقب التغييرات، المخاطر، ومؤشرات الأداء من لوحة مركزية واحدة.",
  },
];

export default async function LandingPage() {
  const { userId } = await auth();
  const primaryHref = userId ? "/app" : "/sign-up";

  return (
    <main
      dir="rtl"
      style={{
        minHeight: "100vh",
        background:
          "radial-gradient(circle at 15% 10%, rgba(121,41,255,0.30), transparent 38%), radial-gradient(circle at 80% 90%, rgba(0,229,255,0.18), transparent 40%), linear-gradient(180deg, #080b16, #090f1d 55%, #05070d)",
        color: "#F4F7FF",
      }}
    >
      <div style={{ maxWidth: 1140, margin: "0 auto", padding: "28px 16px 48px" }}>
        <header
          style={{
            border: "1px solid rgba(141,160,255,0.22)",
            background: "linear-gradient(145deg, rgba(10,14,30,0.88), rgba(19,26,48,0.64))",
            borderRadius: 20,
            padding: "14px 16px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 10,
          }}
        >
          <div style={{ fontWeight: 900, fontSize: 17 }}>One Minute Strategy</div>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <Link href="/sign-in" style={linkBtn(false)}>
              تسجيل الدخول
            </Link>
            <Link href={primaryHref} style={linkBtn(true)}>
              ابدأ الآن
            </Link>
          </div>
        </header>

        <section
          style={{
            marginTop: 16,
            border: "1px solid rgba(141,160,255,0.20)",
            background: "linear-gradient(180deg, rgba(10,16,32,0.86), rgba(9,14,24,0.72))",
            borderRadius: 24,
            padding: "36px 20px",
            boxShadow: "0 20px 50px rgba(0,0,0,0.35)",
          }}
        >
          <h1 style={{ margin: 0, fontSize: 34, lineHeight: 1.25, fontWeight: 900 }}>
            منصة تنفيذ استراتيجية
            <br />
            بواجهة احترافية وتدفّق SaaS كامل
          </h1>
          <p style={{ margin: "12px 0 0", color: "rgba(236,242,255,0.82)", lineHeight: 1.9, fontSize: 16 }}>
            One Minute Strategy تربط التحليل، الحوكمة، والمتابعة التشغيلية داخل رحلة واحدة:
            من القرار التنفيذي حتى تقارير التنفيذ.
          </p>

          <div style={{ marginTop: 20, display: "flex", gap: 12, flexWrap: "wrap" }}>
            <Link href={primaryHref} style={linkBtn(true)} prefetch={false}>
              ابدأ الآن
            </Link>
            <Link href="/sign-in" style={linkBtn(false)} prefetch={false}>
              تسجيل الدخول
            </Link>
          </div>
        </section>

        <section
          style={{
            marginTop: 16,
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: 12,
          }}
        >
          {features.map((item) => (
            <article
              key={item.title}
              style={{
                borderRadius: 16,
                border: "1px solid rgba(141,160,255,0.18)",
                background: "linear-gradient(180deg, rgba(14,20,38,0.84), rgba(10,14,24,0.72))",
                padding: "14px 14px 16px",
              }}
            >
              <h2 style={{ margin: 0, fontSize: 18, fontWeight: 900 }}>{item.title}</h2>
              <p style={{ margin: "8px 0 0", color: "rgba(228,236,255,0.78)", lineHeight: 1.75 }}>
                {item.body}
              </p>
            </article>
          ))}
        </section>

        <section
          style={{
            marginTop: 16,
            borderRadius: 18,
            border: "1px solid rgba(141,160,255,0.20)",
            background: "linear-gradient(145deg, rgba(60,26,114,0.42), rgba(12,20,38,0.78))",
            padding: "20px 16px",
            textAlign: "center",
          }}
        >
          <h3 style={{ margin: 0, fontSize: 22, fontWeight: 900 }}>جاهز للانطلاق؟</h3>
          <p style={{ margin: "8px 0 0", color: "rgba(233,239,255,0.80)", lineHeight: 1.8 }}>
            أنشئ حسابك وابدأ أول تحليل استراتيجي الآن.
          </p>
          <div style={{ marginTop: 12 }}>
            <Link href={primaryHref} style={linkBtn(true)}>
              ابدأ الآن
            </Link>
          </div>
        </section>

        <footer style={{ marginTop: 18, textAlign: "center", color: "rgba(219,229,255,0.62)", fontSize: 13 }}>
          © {new Date().getFullYear()} One Minute Strategy
        </footer>
      </div>
    </main>
  );
}

function linkBtn(primary: boolean) {
  return {
    minHeight: 42,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
    padding: "0 14px",
    textDecoration: "none",
    fontWeight: 900,
    fontSize: 14,
    color: "#FFFFFF",
    border: primary ? "1px solid rgba(160,114,255,0.55)" : "1px solid rgba(141,160,255,0.35)",
    background: primary
      ? "linear-gradient(180deg, rgba(137,70,255,0.92), rgba(94,41,201,0.92))"
      : "linear-gradient(180deg, rgba(13,20,39,0.92), rgba(11,17,30,0.92))",
  } as const;
}
