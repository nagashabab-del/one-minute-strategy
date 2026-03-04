import StageScreen from "../_components/stage-screen";
import { StrategyReadinessGuard, StrategyReadinessPanel } from "../_components/readiness-gate";

export default function StrategyDecisionPage() {
  return (
    <StrategyReadinessGuard
      blockedTitle="لا يمكن اعتماد القرار التنفيذي"
      blockedDescription="اعتماد القرار يتطلب اكتمال الحد الأدنى من بيانات المشروع أولًا حتى لا يتم اتخاذ قرار على معلومات ناقصة."
    >
      <StrategyReadinessPanel stageLabel="القرار التنفيذي" compact />
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
    </StrategyReadinessGuard>
  );
}
