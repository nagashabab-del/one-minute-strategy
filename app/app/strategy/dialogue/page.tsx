import Link from "next/link";
import StageScreen from "../_components/stage-screen";

export default function StrategyDialoguePage() {
  return (
    <>
      <StageScreen
        title="جلسة التحليل"
        subtitle="مرحلة الحوار التحليلي واستخراج توصيات المستشارين."
        objective="تحويل الموجز إلى مخرجات استشارية عملية: مخاطر، فرص تحسين، وبدائل قرار."
        currentScope={[
          "جولات الأسئلة والإجابات بينك وبين المستشارين.",
          "استخراج توصيات تخصصية قابلة للتنفيذ.",
          "تجميع المخاطر والتأثيرات المحتملة مبكرًا.",
        ]}
        nextDeliverables={[
          "مخرجات تحليل جاهزة للقرار التنفيذي.",
          "نسخة قابلة للانتقال إلى التخطيط التشغيلي.",
        ]}
        primaryActionHref="/app/strategy/workspace"
        primaryActionLabel="فتح جلسة التحليل الحالية"
      />

      <section className="oms-panel">
        <h2 className="oms-section-title">تشغيل المحرك الحالي</h2>
        <p className="oms-text">
          هذه المرحلة مرتبطة مباشرة بالمنطق الموجود حاليًا في النظام. استخدم المحرك الحالي دون أي تغيير في
          آلية التحليل.
        </p>
        <div style={{ marginTop: 10 }}>
          <Link href="/app/strategy/workspace" className="oms-btn oms-btn-primary">
            فتح مساحة التحليل
          </Link>
        </div>
      </section>
    </>
  );
}
