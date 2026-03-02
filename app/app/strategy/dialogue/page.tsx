import StageScreen from "../_components/stage-screen";

export default function StrategyDialoguePage() {
  return (
    <StageScreen
      title="جلسة التحليل"
      subtitle="مرحلة الحوار التحليلي واستخراج توصيات المستشارين."
      objective="تحويل الموجز إلى مخرجات استشارية عملية: مخاطر، فرص تحسين، وبدائل قرار."
      currentScope={[
        "جولات الأسئلة والإجابات بينك وبين المستشارين.",
        "استخراج توصيات تخصصية قابلة للتنفيذ.",
      ]}
      nextDeliverables={[
        "مخرجات تحليل جاهزة للقرار التنفيذي.",
        "نسخة قابلة للانتقال إلى التخطيط التشغيلي.",
      ]}
      primaryActionHref="/app/strategy/workspace"
      primaryActionLabel="فتح جلسة التحليل الحالية"
    />
  );
}
