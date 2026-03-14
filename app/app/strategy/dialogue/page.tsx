import StageScreen from "../_components/stage-screen";
import { StrategyReadinessGuard, StrategyReadinessPanel } from "../_components/readiness-gate";

export default function StrategyDialoguePage() {
  return (
    <StrategyReadinessGuard
      blockedTitle="تم إيقاف بدء جلسة التحليل"
      blockedDescription="المستشارون يعملون حاليًا في Gap Mode بسبب نقص البيانات الحرجة. أكمل بيانات الموجز أولًا لضمان توصيات دقيقة."
    >
      <StrategyReadinessPanel stageLabel="جلسة التحليل" compact />
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
        secondaryActionHref="/app/strategy/advisors"
        secondaryActionLabel="العودة إلى تجهيز المستشارين"
      />
    </StrategyReadinessGuard>
  );
}
