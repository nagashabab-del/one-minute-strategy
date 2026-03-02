import StageScreen from "../../_components/stage-screen";

export default function StrategyExecutionBudgetPage() {
  return (
    <StageScreen
      title="الخطة المالية"
      subtitle="بناء ميزانية المشروع والبنود مع مراقبة الانحراف."
      objective="توزيع ميزانية المشروع على البنود والمسؤولين مع إظهار المخطط، الفعلي، والمتبقي."
      currentScope={[
        "تحديد ميزانية كل بند تنفيذي.",
        "تقدير الموردين، المشتريات، والكوادر.",
        "فحص أثر البنود الإضافية على الربحية.",
      ]}
      nextDeliverables={[
        "هيكل مالي قابل للرقابة اليومية.",
        "مؤشر ربح/خسارة متجدد حسب الواقع التنفيذي.",
      ]}
      primaryActionHref="/app/strategy/execution/plan"
      primaryActionLabel="الانتقال إلى الخطة الزمنية"
    />
  );
}
