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
        subtitle="اعتماد القرار بعد اكتمال المسارات المالية والزمنية والمخاطر."
        objective="تحويل مخرجات جميع المراحل إلى قرار تنفيذي نهائي مع شروط اعتماد واضحة قبل الإغلاق."
        currentScope={[
          "مراجعة القرار النهائي على ضوء الميزانية والخطة الزمنية وسجل المخاطر.",
          "تثبيت شروط الاعتماد أو أسباب الإرجاء بشكل صريح.",
          "اعتماد الانتقال إلى المراجعة النهائية والتقرير.",
        ]}
        nextDeliverables={[
          "قرار معتمد (Go / Hold / Rework) مع مبررات واضحة.",
          "حزمة قرار جاهزة للمراجعة النهائية والإغلاق.",
        ]}
        primaryActionHref="/app/strategy/review"
        primaryActionLabel="الانتقال إلى المراجعة النهائية"
        secondaryActionHref="/app/strategy/execution/risks"
        secondaryActionLabel="العودة إلى سجل المخاطر"
      />
    </StrategyReadinessGuard>
  );
}
