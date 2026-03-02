"use client";

import Link from "next/link";

export default function SettingsPage() {
  return (
    <main>
      <h1 className="oms-page-title">الإعدادات</h1>
      <p className="oms-page-subtitle">
        مركز ضبط الواجهة والتفضيلات العامة للنظام. (إعدادات تنفيذية - مرحلة أولى)
      </p>

      <section className="oms-panel">
        <h2 className="oms-section-title">وضع العرض</h2>
        <p className="oms-text">
          إدارة نمط عرض لوحة التحكم ومسارات العمل بما يناسب الاستخدام التنفيذي.
        </p>
      </section>

      <section className="oms-panel">
        <h2 className="oms-section-title">إعدادات التقارير</h2>
        <p className="oms-text">
          تجهيز خيارات المراجعة والاعتماد والتصدير في مراحل لاحقة بدون تغيير منطق التحليل.
        </p>
      </section>

      <section className="oms-panel">
        <h2 className="oms-section-title">إجراءات سريعة</h2>
        <div style={{ marginTop: 10, display: "flex", gap: 8, flexWrap: "wrap" }}>
          <Link href="/app/strategy" className="oms-btn oms-btn-primary">
            الانتقال إلى الاستراتيجية
          </Link>
          <Link href="/app/workflows" className="oms-btn oms-btn-ghost">
            متابعة سير العمل
          </Link>
          <Link href="/app/reports" className="oms-btn oms-btn-ghost">
            عرض التقارير
          </Link>
        </div>
      </section>
    </main>
  );
}
