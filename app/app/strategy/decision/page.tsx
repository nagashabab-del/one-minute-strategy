import StageScreen from "../_components/stage-screen";

export default function StrategyDecisionPage() {
  return (
    <StageScreen
      title="القرار التنفيذي"
      subtitle="اعتماد نتيجة التحليل قبل الدخول في نطاق التنفيذ."
      objective="تثبيت قرار تنفيذي واضح: هل المشروع جاهز للتنفيذ، وما الشروط اللازمة للانطلاق."
      currentScope={[
        "قراءة القرار النهائي بصياغة تنفيذية.",
        "مراجعة أهم المخاطر والشروط المقترنة بالقرار.",
        "اعتماد الانتقال إلى مرحلة إعداد التشغيل.",
      ]}
      nextDeliverables={[
        "قرار معتمد (Go / Hold / Rework).",
        "محددات تنفيذية واضحة للمرحلة التالية.",
      ]}
      primaryActionHref="/app/strategy/execution/scope"
      primaryActionLabel="الانتقال إلى هيكلة النطاق"
    />
  );
}
