import StageScreen from "../../_components/stage-screen";

export default function StrategyExecutionRisksPage() {
  return (
    <StageScreen
      title="سجل المخاطر"
      subtitle="إدارة المخاطر والمناطق الحرجة أثناء التشغيل."
      objective="تحديد المخاطر مبكرًا، قياس شدتها، وربطها بإجراءات معالجة ومسؤول مباشر."
      currentScope={[
        "تصنيف المخاطر (مالي / زمني / تشغيلي / جودة).",
        "تحديد احتمال وتأثير كل خطر.",
        "إقرار خطة تصعيد ومعالجة لكل حالة حرجة.",
      ]}
      nextDeliverables={[
        "Risk Log محدث قابل للتتبع.",
        "تنبيهات واضحة عند التأخير أو تجاوز الميزانية.",
      ]}
      primaryActionHref="/app/strategy/review"
      primaryActionLabel="الانتقال إلى المراجعة النهائية"
    />
  );
}
