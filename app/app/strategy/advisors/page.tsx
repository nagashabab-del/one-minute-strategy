import StageScreen from "../_components/stage-screen";

export default function StrategyAdvisorsPage() {
  return (
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
  );
}
