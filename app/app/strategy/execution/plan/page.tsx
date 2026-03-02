import StageScreen from "../../_components/stage-screen";

export default function StrategyExecutionPlanPage() {
  return (
    <StageScreen
      title="الخطة الزمنية"
      subtitle="ضبط المعالم التشغيلية والتبعيات بين المهام."
      objective="تحويل النطاق والميزانية إلى مراحل تنفيذية بجدول واضح من التخطيط إلى الإغلاق."
      currentScope={[
        "تعريف Milestones لكل مرحلة تشغيل.",
        "ربط التبعيات (Finish-to-Start) بين البنود.",
        "متابعة التأخير المتوقع قبل تحوله لخطر فعلي.",
      ]}
      nextDeliverables={[
        "خارطة زمنية قابلة للمتابعة اليومية.",
        "نقاط تحكم واضحة لمدير المشروع.",
      ]}
      primaryActionHref="/app/strategy/execution/risks"
      primaryActionLabel="الانتقال إلى سجل المخاطر"
    />
  );
}
