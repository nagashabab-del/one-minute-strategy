export type MockReport = {
  id: string;
  title: string;
  date: string;
  status: "مسودة" | "مكتمل" | "معتمد";
  executiveDecision: string;
  advisorsHighlights: string[];
  risks: string[];
  recommendations: string[];
};

const REPORTS_KEY = "oms_mock_reports_v1";

const seededReports: MockReport[] = [
  {
    id: "rpt-001",
    title: "تحليل إطلاق الفعالية الموسمية",
    date: "2026-03-01",
    status: "مكتمل",
    executiveDecision: "المضي في التنفيذ مع رفع جاهزية التشغيل قبل 72 ساعة.",
    advisorsHighlights: [
      "المالي: ضبط عقود الموردين يقلل الانحراف.",
      "التشغيلي: اعتماد بروفة نهائية قبل يوم الحدث.",
      "المخاطر: تفعيل مورد بديل للشاشة الرئيسية.",
    ],
    risks: ["تأخر توريد تجهيزات فنية", "ازدحام غير متوقع عند بوابات الدخول"],
    recommendations: ["اعتماد خطة طوارئ تشغيلية", "رفع وتيرة التقارير اليومية"],
  },
  {
    id: "rpt-002",
    title: "مراجعة الخطة المتقدمة للمشروع",
    date: "2026-02-22",
    status: "معتمد",
    executiveDecision: "اعتماد النسخة الحالية مع متابعة دقيقة للمخاطر الحرجة.",
    advisorsHighlights: ["التسويق: تعزيز ترويج الأيام الأخيرة", "الحوكمة: إقفال طلبي تغيير مفتوحين"],
    risks: ["ضغط عالي على فريق التشغيل في آخر 48 ساعة"],
    recommendations: ["تعزيز الفريق الميداني", "تثبيت جدول مراجعة صباحي ومسائي"],
  },
];

export function readReports(): MockReport[] {
  if (typeof window === "undefined") return seededReports;

  try {
    const raw = localStorage.getItem(REPORTS_KEY);
    if (!raw) {
      localStorage.setItem(REPORTS_KEY, JSON.stringify(seededReports));
      return seededReports;
    }

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      localStorage.setItem(REPORTS_KEY, JSON.stringify(seededReports));
      return seededReports;
    }

    return parsed as MockReport[];
  } catch {
    return seededReports;
  }
}

export function readReportById(id: string): MockReport | null {
  return readReports().find((report) => report.id === id) ?? null;
}
