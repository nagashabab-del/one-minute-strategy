import StageScreen from "../_components/stage-screen";
import { StrategyReadinessChecklist, StrategyReadinessPanel } from "../_components/readiness-gate";

export default function StrategyBriefPage() {
  return (
    <>
      <StrategyReadinessPanel stageLabel="موجز المشروع" />
      <StrategyReadinessChecklist />
      <StageScreen
        title="موجز المشروع"
        subtitle="إدخال سريع وغير تفصيلي لبدء الاستشارة قبل الالتزام التنفيذي."
        objective="جمع الأساس التنفيذي: نوع المشروع، الهدف، نطاقه العام، والميزانية التقديرية الأولية."
        currentScope={[
          "اسم المشروع ونوعه وحجمه (صغير/متوسط/كبير).",
          "الهدف التنفيذي المتوقع من المشروع.",
          "النطاق العام بدون تفاصيل تشغيلية عميقة.",
          "الميزانية التقديرية المبدئية والإطار الزمني العام.",
        ]}
        nextDeliverables={[
          "Brief واضح قابل للتحليل من المستشارين.",
          "قاعدة قرار أولي قبل الدخول في التخطيط التفصيلي.",
        ]}
        primaryActionHref="/app/strategy/advisors"
        primaryActionLabel="اعتماد الموجز والانتقال للمستشارين"
        secondaryActionHref="/app/strategy"
        secondaryActionLabel="العودة إلى مركز الاستراتيجية"
      />
    </>
  );
}
