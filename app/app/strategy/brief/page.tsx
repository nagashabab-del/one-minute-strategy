import StageScreen from "../_components/stage-screen";

export default function StrategyBriefPage() {
  return (
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
    />
  );
}
