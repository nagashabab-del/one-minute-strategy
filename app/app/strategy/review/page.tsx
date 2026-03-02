import StageScreen from "../_components/stage-screen";

export default function StrategyReviewPage() {
  return (
    <StageScreen
      title="المراجعة النهائية"
      subtitle="نقطة ضبط قبل الإغلاق ورفع التقارير التنفيذية."
      objective="تجميع القرار، النطاق، المال، التقدم، والمخاطر في حزمة تنفيذية واحدة جاهزة للإدارة."
      currentScope={["فحص جاهزية البنود قبل الإغلاق.", "مراجعة الالتزام الزمني والمالي."]}
      nextDeliverables={[
        "حزمة تقرير نهائي قابلة للعرض.",
        "نقطة انتقال واضحة إلى مساحة التقارير.",
      ]}
      primaryActionHref="/app/reports"
      primaryActionLabel="فتح مساحة التقارير"
    />
  );
}
