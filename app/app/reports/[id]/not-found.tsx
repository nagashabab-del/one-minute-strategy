import Link from "next/link";

export default function ReportNotFound() {
  return (
    <main>
      <h1 className="oms-page-title" style={{ fontSize: 24 }}>
        التقرير غير موجود
      </h1>
      <p className="oms-page-subtitle">لم يتم العثور على تقرير بهذا المعرّف.</p>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <Link href="/app/reports" className="oms-btn oms-btn-ghost">
          رجوع إلى التقارير
        </Link>
        <Link href="/app/strategy" className="oms-btn oms-btn-primary">
          ابدأ التحليل الآن
        </Link>
      </div>
    </main>
  );
}
