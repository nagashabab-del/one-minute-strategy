import StageScreen from "../../_components/stage-screen";

export default function StrategyExecutionScopePage() {
  return (
    <StageScreen
      title="هيكلة النطاق"
      subtitle="تفكيك المشروع إلى بنود تنفيذية ومسارات عمل واضحة."
      objective="تحويل القرار إلى Work Packages مفهومة: ديكور، كهرباء، مطبوعات، صوتيات، شاشات، بروتوكول، تسويق..."
      currentScope={[
        "تعريف كل بند تنفيذي بشكل مستقل.",
        "ربط كل بند بمخرجات قابلة للقياس.",
        "تحديد الجهة المالكة لكل بند.",
      ]}
      nextDeliverables={[
        "هيكل نطاق تفصيلي جاهز للتكلفة والمتابعة.",
        "قائمة بنود يمكن توزيعها على المسؤولين.",
      ]}
      primaryActionHref="/app/strategy/execution/budget"
      primaryActionLabel="الانتقال إلى الخطة المالية"
    />
  );
}
