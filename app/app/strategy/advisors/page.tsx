import StageScreen from "../_components/stage-screen";
import { StrategyReadinessGuard, StrategyReadinessPanel } from "../_components/readiness-gate";

export default function StrategyAdvisorsPage() {
  return (
    <StrategyReadinessGuard
      blockedTitle="لا يمكن تجهيز مسار المستشارين الآن"
      blockedDescription="تجهيز المستشارين يعتمد على موجز مشروع مكتمل بالحد الأدنى. أكمل البيانات الحرجة أولًا لضمان أن توصيات الذكاء الاصطناعي مبنية على أساس دقيق."
    >
      <StrategyReadinessPanel stageLabel="تجهيز المستشارين" compact />
      <StageScreen
        title="تجهيز المستشارين"
        subtitle="تحديد الجهات الاستشارية الداخلة في الحوار التحليلي."
        objective="تكوين مجلس استشاري متوازن (مالي، تشغيلي، تسويقي، مخاطر، تنظيمي) قبل بدء جلسة القرار."
        currentScope={[
          "اختيار نوع المشاركة (كل المستشارين أو مخصص).",
          "ضبط الأولويات حسب طبيعة المشروع الحالي.",
          "تأكيد نطاق النقاش المطلوب في الجولة الأولى.",
        ]}
        nextDeliverables={[
          "مجلس مستشارين مفعل وجاهز لجلسة التحليل.",
          "إطار حوار واضح يمنع العشوائية في التوصيات.",
        ]}
        primaryActionHref="/app/strategy/dialogue"
        primaryActionLabel="بدء جلسة التحليل"
      />
    </StrategyReadinessGuard>
  );
}
