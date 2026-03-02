"use client";

import Link from "next/link";

export default function SettingsPage() {
  return (
    <main>
      <h1 style={{ margin: 0, fontSize: 28, fontWeight: 900 }}>الإعدادات</h1>
      <p style={{ marginTop: 8, color: "rgba(226,235,255,0.78)", lineHeight: 1.8 }}>
        مركز ضبط الواجهة والتفضيلات العامة للنظام. (إعدادات تنفيذية - مرحلة أولى)
      </p>

      <section style={panelStyle}>
        <h2 style={sectionTitleStyle}>وضع العرض</h2>
        <p style={sectionTextStyle}>
          إدارة نمط عرض لوحة التحكم ومسارات العمل بما يناسب الاستخدام التنفيذي.
        </p>
      </section>

      <section style={panelStyle}>
        <h2 style={sectionTitleStyle}>إعدادات التقارير</h2>
        <p style={sectionTextStyle}>
          تجهيز خيارات المراجعة والاعتماد والتصدير في مراحل لاحقة بدون تغيير منطق التحليل.
        </p>
      </section>

      <section style={panelStyle}>
        <h2 style={sectionTitleStyle}>إجراءات سريعة</h2>
        <div style={{ marginTop: 10, display: "flex", gap: 8, flexWrap: "wrap" }}>
          <Link href="/app/strategy" style={primaryBtnStyle}>
            الانتقال إلى الاستراتيجية
          </Link>
          <Link href="/app/workflows" style={secondaryBtnStyle}>
            متابعة سير العمل
          </Link>
          <Link href="/app/reports" style={secondaryBtnStyle}>
            عرض التقارير
          </Link>
        </div>
      </section>
    </main>
  );
}

const panelStyle = {
  marginTop: 12,
  borderRadius: 14,
  border: "1px solid rgba(138,160,255,0.22)",
  background: "linear-gradient(180deg, rgba(12,20,36,0.88), rgba(10,16,28,0.80))",
  padding: "12px",
} as const;

const sectionTitleStyle = {
  margin: 0,
  fontSize: 18,
  fontWeight: 900,
} as const;

const sectionTextStyle = {
  marginTop: 8,
  color: "rgba(226,235,255,0.84)",
  lineHeight: 1.8,
} as const;

const primaryBtnStyle = {
  minHeight: 38,
  borderRadius: 10,
  border: "1px solid rgba(160,114,255,0.50)",
  background: "linear-gradient(180deg, rgba(131,64,242,0.94), rgba(88,39,187,0.92))",
  color: "#FFFFFF",
  fontWeight: 800,
  textDecoration: "none",
  padding: "0 12px",
  display: "inline-flex",
  alignItems: "center",
} as const;

const secondaryBtnStyle = {
  minHeight: 38,
  borderRadius: 10,
  border: "1px solid rgba(138,160,255,0.30)",
  background: "rgba(10,15,28,0.80)",
  color: "#F5F8FF",
  fontWeight: 800,
  textDecoration: "none",
  padding: "0 12px",
  display: "inline-flex",
  alignItems: "center",
} as const;
