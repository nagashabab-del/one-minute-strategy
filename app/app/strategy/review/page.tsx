import Link from "next/link";
import StageScreen from "../_components/stage-screen";

export default function StrategyReviewPage() {
  return (
    <>
      <StageScreen
        title="المراجعة النهائية"
        subtitle="نقطة ضبط قبل الإغلاق ورفع التقارير التنفيذية."
        objective="تجميع القرار، النطاق، المال، التقدم، والمخاطر في حزمة تنفيذية واحدة جاهزة للإدارة."
        currentScope={[
          "فحص جاهزية البنود قبل الإغلاق.",
          "مراجعة الالتزام الزمني والمالي.",
          "اعتماد التوصيات النهائية.",
        ]}
        nextDeliverables={[
          "حزمة تقرير نهائي قابلة للعرض.",
          "نقطة انتقال واضحة إلى مساحة التقارير.",
        ]}
        primaryActionHref="/app/reports"
        primaryActionLabel="فتح مساحة التقارير"
      />

      <section className="oms-panel">
        <h2 className="oms-section-title">إغلاق تشغيلي</h2>
        <p className="oms-text">
          بعد اكتمال التحقق، انقل الحالة إلى التقارير لاعتماد الملخص التنفيذي ومشاركة المخرجات مع أصحاب
          المصلحة.
        </p>
        <div style={{ marginTop: 10 }}>
          <Link href="/app/reports" className="oms-btn oms-btn-primary">
            الانتقال للتقارير
          </Link>
        </div>
      </section>
    </>
  );
}
