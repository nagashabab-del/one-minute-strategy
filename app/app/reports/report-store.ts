export type StrategyReport = {
  id: string;
  title: string;
  date: string;
  status: "مسودة" | "مكتمل" | "معتمد";
  executiveDecision: string;
  advisorsHighlights: string[];
  risks: string[];
  recommendations: string[];
  regulatoryCompliance?: {
    readiness: "جاهز" | "جزئي" | "خطر";
    requiredCount: number;
    completedCount: number;
    pendingPaths: string[];
  };
};

export type ReportExportAction = "txt" | "docx" | "pdf" | "csv" | "bundle" | "copy";
export type BundleExportAction = "txt" | "docx" | "pdf";
export type ReportExportStatus = "pending" | "success" | "error";
export const BUNDLE_EXPORT_ACTIONS: ReadonlyArray<BundleExportAction> = ["txt", "docx", "pdf"];

export class ReportExportError extends Error {
  code: string;
  details?: string;
  cause?: unknown;
  failedActions?: BundleExportAction[];

  constructor(
    code: string,
    message: string,
    options?: { details?: string; cause?: unknown; failedActions?: BundleExportAction[] }
  ) {
    super(message);
    this.name = "ReportExportError";
    this.code = code;
    this.details = options?.details;
    this.cause = options?.cause;
    this.failedActions = options?.failedActions;
  }
}

type ProjectsRegistry = {
  activeProjectId: string;
  projects: Array<{
    id: string;
    name: string;
    updatedAt?: string;
    isArchived?: boolean;
  }>;
};

type AdvisorRecommendation = {
  recommendations?: string[];
  strategic_warning?: string;
};

type ProjectSnapshot = {
  project?: string;
  reportText?: string;
  advancedApproved?: boolean;
  analysis?: {
    executive_decision?: {
      decision?: string;
    };
    strategic_analysis?: {
      risks?: string[];
      top_3_upgrades?: string[];
    };
    advisor_recommendations?: Record<string, AdvisorRecommendation | undefined>;
  };
};

type BudgetCommitmentSnapshot = {
  path?: string;
  required?: boolean;
  status?: string;
  expiryDate?: string;
};

type BudgetSnapshot = {
  regulatoryCommitments?: BudgetCommitmentSnapshot[];
};

type PlanSnapshot = {
  regulatoryInsights?: {
    regulatoryRiskScore?: {
      level?: string;
    };
  };
};

const EXPORT_ACTION_LABELS: Record<ReportExportAction, string> = {
  txt: "تصدير TXT",
  docx: "تصدير DOCX",
  pdf: "تصدير PDF",
  csv: "تصدير CSV",
  bundle: "تصدير الحزمة",
  copy: "نسخ التقرير",
};

const PROJECTS_REGISTRY_KEY = "oms_dashboard_projects_registry_v1";
const PROJECT_DATA_KEY_PREFIX = "oms_dashboard_project_data_v1_";
const BUDGET_TRACKER_PREFIX = "oms_exec_budget_tracker_v1_";
const PLAN_TRACKER_PREFIX = "oms_exec_plan_tracker_v1_";
const REGULATORY_PATH_LABELS: Record<string, string> = {
  municipality: "البلدية/الأمانة",
  civil_defense: "الدفاع المدني",
  gea: "الجهة المنظمة للمحتوى",
  traffic: "المرور",
  insurance: "التأمين",
};
const ADVISOR_LABELS: Record<string, string> = {
  financial_advisor: "المستشار المالي",
  regulatory_advisor: "المستشار التنظيمي",
  operations_advisor: "المستشار التشغيلي",
  marketing_advisor: "المستشار التسويقي",
  risk_advisor: "مستشار المخاطر",
};

export function getReportExportPendingMessage(action: ReportExportAction): string {
  if (action === "copy") return "جاري نسخ التقرير للحافظة...";
  if (action === "bundle") return "جاري تجهيز الحزمة (TXT + DOCX + PDF)...";
  return `جاري تنفيذ ${EXPORT_ACTION_LABELS[action]}...`;
}

export function getReportExportSuccessMessage(action: ReportExportAction): string {
  if (action === "txt") return "تم تنزيل ملف TXT بنجاح.";
  if (action === "docx") return "تم تنزيل ملف DOCX بنجاح.";
  if (action === "pdf") return "تم تنزيل ملف PDF بنجاح.";
  if (action === "csv") return "تم تنزيل ملف CSV بنجاح.";
  if (action === "bundle") return "تم تنزيل الحزمة (TXT + DOCX + PDF).";
  return "تم نسخ محتوى التقرير للحافظة.";
}

export function createBundlePartialError(failedActions: Array<ReportExportAction>): ReportExportError {
  const normalizedActions = normalizeBundleFailedActions(failedActions);
  const labels = normalizedActions.map((action) => EXPORT_ACTION_LABELS[action]);
  return new ReportExportError("BUNDLE_PARTIAL", "Bundle export failed partially.", {
    details: labels.join("، "),
    failedActions: normalizedActions,
  });
}

export function getBundleFailedActions(error: unknown): BundleExportAction[] {
  const exportError = toReportExportError(error);
  if (exportError.code !== "BUNDLE_PARTIAL") return [];
  return normalizeBundleFailedActions(exportError.failedActions ?? []);
}

export function toReportExportError(error: unknown, fallbackCode = "UNKNOWN"): ReportExportError {
  if (error instanceof ReportExportError) return error;
  if (error instanceof Error) {
    return new ReportExportError(fallbackCode, error.message || "Export failed.", { cause: error });
  }
  return new ReportExportError(fallbackCode, "Export failed.");
}

export function getReportExportErrorMessage(action: ReportExportAction, error: unknown): string {
  const exportError = toReportExportError(error);

  if (exportError.code === "BUNDLE_PARTIAL") {
    return exportError.details
      ? `فشل جزء من الحزمة: ${exportError.details}. يمكنك إعادة المحاولة للعناصر الفاشلة فقط.`
      : "فشل جزء من الحزمة. يمكنك إعادة المحاولة للعناصر الفاشلة فقط.";
  }
  if (exportError.code === "BUNDLE_RETRY_EMPTY") {
    return "لا توجد عناصر فاشلة لإعادة محاولتها ضمن الحزمة.";
  }
  if (exportError.code === "REPORT_NOT_FOUND") {
    return "لم يعد التقرير متوفرًا. حدّث الصفحة ثم أعد المحاولة.";
  }
  if (exportError.code === "CSV_EMPTY_FILTER") {
    return "لا توجد نتائج ضمن الفلتر الحالي لتصديرها.";
  }
  if (exportError.code === "ACTION_BUSY") {
    return "يوجد إجراء تصدير آخر قيد التنفيذ. انتظر اكتماله ثم أعد المحاولة.";
  }
  if (exportError.code === "ACTION_BLOCKED") {
    return "الإجراء غير متاح في الوضع الحالي.";
  }
  if (exportError.code === "BROWSER_ONLY") {
    return "هذا الإجراء متاح من المتصفح فقط.";
  }
  if (exportError.code === "LIBRARY_LOAD_FAILED") {
    return "تعذر تحميل مكوّنات التصدير. تحقق من الاتصال ثم أعد المحاولة.";
  }
  if (exportError.code === "PDF_SANDBOX_INIT_FAILED" || exportError.code === "PDF_CONTENT_MISSING") {
    return "تعذر تجهيز محتوى PDF للتصدير. أعد المحاولة.";
  }
  if (exportError.code === "PDF_RENDER_FAILED") {
    return "حدث خطأ أثناء توليد PDF. أعد المحاولة بعد لحظات.";
  }
  if (exportError.code === "DOWNLOAD_FAILED") {
    return "تعذر بدء التنزيل من المتصفح. تحقق من إعدادات الحظر ثم أعد المحاولة.";
  }
  if (exportError.code === "COPY_BLOCKED") {
    return "تعذر النسخ للحافظة. تأكد من صلاحية النسخ في المتصفح.";
  }
  if (exportError.code === "DOCX_BUILD_FAILED") {
    return "تعذر توليد ملف DOCX. أعد المحاولة.";
  }
  return `تعذر تنفيذ ${EXPORT_ACTION_LABELS[action]}.`;
}

function projectDataKey(projectId: string) {
  return `${PROJECT_DATA_KEY_PREFIX}${projectId}`;
}

function budgetTrackerKey(projectId: string) {
  return `${BUDGET_TRACKER_PREFIX}${projectId}`;
}

function planTrackerKey(projectId: string) {
  return `${PLAN_TRACKER_PREFIX}${projectId}`;
}

function safeParse<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function toIsoDate(value?: string): string {
  if (!value) return new Date().toISOString().slice(0, 10);
  const asDate = new Date(value);
  if (Number.isNaN(asDate.getTime())) return new Date().toISOString().slice(0, 10);
  return asDate.toISOString().slice(0, 10);
}

function deriveStatus(snapshot: ProjectSnapshot): StrategyReport["status"] {
  if (snapshot.advancedApproved) return "معتمد";
  if (snapshot.reportText?.trim() || snapshot.analysis?.executive_decision?.decision?.trim()) return "مكتمل";
  return "مسودة";
}

function deriveExecutiveDecision(snapshot: ProjectSnapshot): string {
  const decision = snapshot.analysis?.executive_decision?.decision?.trim();
  if (decision) return decision;

  const firstReportLine = snapshot.reportText
    ?.split("\n")
    .map((line) => line.trim())
    .find(Boolean);
  if (firstReportLine) return firstReportLine;

  return "لا يوجد قرار تنفيذي مولّد بعد.";
}

function deriveAdvisorHighlights(snapshot: ProjectSnapshot): string[] {
  const items = Object.entries(snapshot.analysis?.advisor_recommendations ?? {})
    .map(([key, rec]) => {
      if (!rec) return "";
      const advisorName = ADVISOR_LABELS[key] ?? key;
      const oneRec = rec.recommendations?.find((line) => line?.trim());
      if (oneRec?.trim()) return `${advisorName}: ${oneRec.trim()}`;
      if (rec.strategic_warning?.trim()) return `${advisorName}: ${rec.strategic_warning.trim()}`;
      return "";
    })
    .filter(Boolean);

  return items.length ? items : ["لا توجد ملاحظات مستشارين منشورة بعد."];
}

function deriveRisks(snapshot: ProjectSnapshot): string[] {
  const risks = (snapshot.analysis?.strategic_analysis?.risks ?? [])
    .map((line) => line?.trim())
    .filter(Boolean);
  return risks.length ? risks : ["لا توجد مخاطر مسجلة حاليًا."];
}

function deriveRecommendations(snapshot: ProjectSnapshot): string[] {
  const upgrades = (snapshot.analysis?.strategic_analysis?.top_3_upgrades ?? [])
    .map((line) => line?.trim())
    .filter(Boolean);

  if (upgrades.length) return upgrades;

  const recs = Object.values(snapshot.analysis?.advisor_recommendations ?? {})
    .flatMap((rec) => rec?.recommendations ?? [])
    .map((line) => line?.trim())
    .filter(Boolean);

  return recs.length ? recs.slice(0, 5) : ["لا توجد توصيات منشورة بعد."];
}

function deriveRegulatoryCompliance(projectId: string): StrategyReport["regulatoryCompliance"] | undefined {
  const budgetSnapshot = safeParse<BudgetSnapshot>(localStorage.getItem(budgetTrackerKey(projectId)), {});
  const planSnapshot = safeParse<PlanSnapshot>(localStorage.getItem(planTrackerKey(projectId)), {});
  const items = Array.isArray(budgetSnapshot.regulatoryCommitments) ? budgetSnapshot.regulatoryCommitments : [];
  if (items.length === 0) return undefined;

  const required = items.filter((item) => item.required);
  const completed = required.filter((item) => item.status === "مكتمل");
  const pending = required.filter((item) => item.status !== "مكتمل");
  const overdue = pending.filter((item) => {
    if (!item.expiryDate) return false;
    return item.expiryDate < new Date().toISOString().slice(0, 10);
  });
  const riskLevel = planSnapshot.regulatoryInsights?.regulatoryRiskScore?.level;

  const readiness: "جاهز" | "جزئي" | "خطر" =
    required.length === 0
      ? "جاهز"
      : overdue.length > 0 || (pending.length > 0 && riskLevel === "high")
        ? "خطر"
        : pending.length > 0
          ? "جزئي"
          : "جاهز";

  return {
    readiness,
    requiredCount: required.length,
    completedCount: completed.length,
    pendingPaths: pending
      .map((item) => (item.path ? REGULATORY_PATH_LABELS[item.path] ?? item.path : "مسار غير محدد"))
      .slice(0, 3),
  };
}

export function readReports(): StrategyReport[] {
  if (typeof window === "undefined") return [];

  const registry = safeParse<ProjectsRegistry>(localStorage.getItem(PROJECTS_REGISTRY_KEY), {
    activeProjectId: "",
    projects: [],
  });

  const reports = registry.projects
    .filter((project) => !project.isArchived)
    .map<StrategyReport | null>((project) => {
      const snapshot = safeParse<ProjectSnapshot>(localStorage.getItem(projectDataKey(project.id)), {});
      const hasAnyContent =
        !!snapshot.project?.trim() || !!snapshot.reportText?.trim() || !!snapshot.analysis?.executive_decision;

      if (!hasAnyContent) return null;

      return {
        id: project.id,
        title: snapshot.project?.trim() || project.name || "مشروع بدون اسم",
        date: toIsoDate(project.updatedAt),
        status: deriveStatus(snapshot),
        executiveDecision: deriveExecutiveDecision(snapshot),
        advisorsHighlights: deriveAdvisorHighlights(snapshot),
        risks: deriveRisks(snapshot),
        recommendations: deriveRecommendations(snapshot),
        regulatoryCompliance: deriveRegulatoryCompliance(project.id),
      };
    })
    .filter((item): item is StrategyReport => item !== null);

  return reports.sort((a, b) => b.date.localeCompare(a.date));
}

export function readReportById(id: string): StrategyReport | null {
  return readReports().find((report) => report.id === id) ?? null;
}

export function subscribeReportsChanges(callback: () => void) {
  if (typeof window === "undefined") return () => {};

  const onStorage = () => callback();
  const onFocus = () => callback();
  const onVisibilityChange = () => {
    if (document.visibilityState === "visible") callback();
  };

  window.addEventListener("storage", onStorage);
  window.addEventListener("focus", onFocus);
  document.addEventListener("visibilitychange", onVisibilityChange);

  return () => {
    window.removeEventListener("storage", onStorage);
    window.removeEventListener("focus", onFocus);
    document.removeEventListener("visibilitychange", onVisibilityChange);
  };
}

export function getReportsSignature(): string {
  if (typeof window === "undefined") return "server";

  const registryRaw = localStorage.getItem(PROJECTS_REGISTRY_KEY) ?? "";
  const registry = safeParse<ProjectsRegistry>(registryRaw, {
    activeProjectId: "",
    projects: [],
  });
  const parts: string[] = [registryRaw];

  for (const project of registry.projects) {
    if (!project?.id || project.isArchived) continue;
    parts.push(localStorage.getItem(projectDataKey(project.id)) ?? "");
    parts.push(localStorage.getItem(budgetTrackerKey(project.id)) ?? "");
    parts.push(localStorage.getItem(planTrackerKey(project.id)) ?? "");
  }

  return parts.join("::");
}

export function buildReportText(report: StrategyReport): string {
  const sections: string[] = [];
  sections.push(`One Minute Strategy`);
  sections.push(`====================`);
  sections.push(`عنوان التقرير: ${report.title}`);
  sections.push(`المعرّف: ${report.id}`);
  sections.push(`تاريخ التحديث: ${report.date}`);
  sections.push(`الحالة: ${report.status}`);
  sections.push("");
  sections.push("القرار التنفيذي");
  sections.push("---------------");
  sections.push(report.executiveDecision || "لا يوجد قرار تنفيذي مولّد بعد.");
  sections.push("");

  if (report.regulatoryCompliance) {
    sections.push("الالتزام التنظيمي");
    sections.push("---------------");
    sections.push(`الحالة: ${report.regulatoryCompliance.readiness}`);
    sections.push(
      `مستوى الإكمال: ${report.regulatoryCompliance.completedCount}/${report.regulatoryCompliance.requiredCount}`
    );
    sections.push(
      `المسارات المفتوحة: ${
        report.regulatoryCompliance.pendingPaths.length
          ? report.regulatoryCompliance.pendingPaths.join("، ")
          : "لا توجد"
      }`
    );
    sections.push("");
  }

  sections.push("أبرز ملاحظات المستشارين");
  sections.push("----------------------");
  for (const line of report.advisorsHighlights) {
    sections.push(`- ${line}`);
  }
  sections.push("");

  sections.push("التوصيات التنفيذية");
  sections.push("-----------------");
  for (const line of report.recommendations) {
    sections.push(`- ${line}`);
  }
  sections.push("");

  sections.push("المخاطر");
  sections.push("-------");
  for (const line of report.risks) {
    sections.push(`- ${line}`);
  }

  return sections.join("\n");
}

export function buildReportFileName(report: StrategyReport): string {
  const baseName = buildReportBaseName(report);
  return `oms-report-${baseName}.txt`;
}

export function buildReportWordFileName(report: StrategyReport): string {
  return buildReportDocxFileName(report);
}

export function buildReportDocxFileName(report: StrategyReport): string {
  const baseName = buildReportBaseName(report);
  return `oms-report-${baseName}.docx`;
}

export async function buildReportDocxBlob(report: StrategyReport): Promise<Blob> {
  try {
    const { AlignmentType, Document, HeadingLevel, Packer, Paragraph, TextRun } = await import("docx");

    const heading = (title: string) =>
      new Paragraph({
        heading: HeadingLevel.HEADING_2,
        alignment: AlignmentType.RIGHT,
        bidirectional: true,
        spacing: { before: 260, after: 110 },
        children: [new TextRun({ text: title, bold: true, size: 26 })],
      });
    const body = (text: string) =>
      new Paragraph({
        alignment: AlignmentType.RIGHT,
        bidirectional: true,
        spacing: { after: 110 },
        children: [new TextRun({ text, size: 24 })],
      });
    const bullet = (text: string) =>
      new Paragraph({
        alignment: AlignmentType.RIGHT,
        bidirectional: true,
        spacing: { after: 90 },
        bullet: { level: 0 },
        children: [new TextRun({ text, size: 24 })],
      });
    const compliance = report.regulatoryCompliance
      ? [
          heading("الالتزام التنظيمي"),
          body(`الحالة: ${report.regulatoryCompliance.readiness}`),
          body(
            `مستوى الإكمال: ${report.regulatoryCompliance.completedCount}/${report.regulatoryCompliance.requiredCount}`
          ),
          body(
            `المسارات المفتوحة: ${
              report.regulatoryCompliance.pendingPaths.length
                ? report.regulatoryCompliance.pendingPaths.join("، ")
                : "لا توجد"
            }`
          ),
        ]
      : [];

    const doc = new Document({
      creator: "One Minute Strategy",
      title: report.title,
      description: `Strategy report ${report.id}`,
      sections: [
        {
          children: [
            new Paragraph({
              alignment: AlignmentType.RIGHT,
              bidirectional: true,
              spacing: { after: 90 },
              children: [new TextRun({ text: "One Minute Strategy", bold: true, size: 22 })],
            }),
            new Paragraph({
              alignment: AlignmentType.RIGHT,
              bidirectional: true,
              spacing: { after: 110 },
              children: [new TextRun({ text: report.title, bold: true, size: 38 })],
            }),
            body(`المعرّف: ${report.id}`),
            body(`تاريخ التحديث: ${report.date}`),
            body(`الحالة: ${report.status}`),
            heading("القرار التنفيذي"),
            body(report.executiveDecision || "لا يوجد قرار تنفيذي مولّد بعد."),
            ...compliance,
            heading("أبرز ملاحظات المستشارين"),
            ...report.advisorsHighlights.map((line) => bullet(line)),
            heading("التوصيات التنفيذية"),
            ...report.recommendations.map((line) => bullet(line)),
            heading("المخاطر"),
            ...report.risks.map((line) => bullet(line)),
          ],
        },
      ],
    });

    return Packer.toBlob(doc);
  } catch (error) {
    throw toReportExportError(error, "DOCX_BUILD_FAILED");
  }
}

export function buildReportPdfFileName(report: StrategyReport): string {
  const baseName = buildReportBaseName(report);
  return `oms-report-${baseName}.pdf`;
}

export async function buildReportPdfBlob(report: StrategyReport): Promise<Blob> {
  if (typeof window === "undefined" || typeof document === "undefined") {
    throw new ReportExportError("BROWSER_ONLY", "PDF export is available in browser only.");
  }

  let html2canvas: (typeof import("html2canvas"))["default"];
  let jsPDFCtor: (typeof import("jspdf"))["jsPDF"];
  try {
    const imports = await Promise.all([import("html2canvas"), import("jspdf")]);
    html2canvas = imports[0].default;
    jsPDFCtor = imports[1].jsPDF;
  } catch (error) {
    throw toReportExportError(error, "LIBRARY_LOAD_FAILED");
  }

  const pdfWidth = 794;
  const pdfHeight = 1123;
  const iframe = document.createElement("iframe");
  iframe.style.position = "fixed";
  iframe.style.left = "-99999px";
  iframe.style.top = "0";
  iframe.style.width = `${pdfWidth}px`;
  iframe.style.height = `${pdfHeight}px`;
  iframe.style.opacity = "0";

  document.body.appendChild(iframe);
  try {
    const html = buildReportPdfHtml(report);
    const doc = iframe.contentDocument;
    if (!doc) throw new ReportExportError("PDF_SANDBOX_INIT_FAILED", "Cannot initialize PDF sandbox.");
    doc.open();
    doc.write(html);
    doc.close();
    await waitForMs(90);
    const body = doc.body;
    if (!body) throw new ReportExportError("PDF_CONTENT_MISSING", "No report content for PDF export.");

    let canvas: HTMLCanvasElement;
    try {
      canvas = await html2canvas(body, {
        scale: 2.4,
        backgroundColor: "#ffffff",
        useCORS: true,
        width: pdfWidth,
        windowWidth: Math.max(body.scrollWidth, pdfWidth),
        windowHeight: body.scrollHeight,
        scrollX: 0,
        scrollY: 0,
      });
    } catch (error) {
      throw toReportExportError(error, "PDF_RENDER_FAILED");
    }

    const imageData = canvas.toDataURL("image/png");
    try {
      const pdf = new jsPDFCtor({ orientation: "p", unit: "pt", format: "a4" });
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 28;
      const imageWidth = pageWidth - margin * 2;
      const imageHeight = (canvas.height * imageWidth) / canvas.width;

      let heightLeft = imageHeight;
      let yPosition = 0;
      pdf.addImage(imageData, "PNG", margin, yPosition + margin, imageWidth, imageHeight, undefined, "FAST");
      heightLeft -= pageHeight;

      while (heightLeft > 0) {
        yPosition = heightLeft - imageHeight;
        pdf.addPage();
        pdf.addImage(imageData, "PNG", margin, yPosition + margin, imageWidth, imageHeight, undefined, "FAST");
        heightLeft -= pageHeight;
      }

      return pdf.output("blob");
    } catch (error) {
      throw toReportExportError(error, "PDF_RENDER_FAILED");
    }
  } finally {
    document.body.removeChild(iframe);
  }
}

export function buildReportWordHtml(report: StrategyReport): string {
  return buildReportHtml(report, {
    bodyMargin: 24,
    panelMarginBottom: 12,
    headingOneSize: 28,
    headingTwoSize: 20,
    lineHeight: 1.7,
    fontSize: 16,
  });
}

function buildReportPdfHtml(report: StrategyReport): string {
  return buildReportHtml(report, {
    bodyMargin: 18,
    panelMarginBottom: 10,
    headingOneSize: 24,
    headingTwoSize: 18,
    lineHeight: 1.6,
    fontSize: 14,
  });
}

function buildReportHtml(
  report: StrategyReport,
  options: {
    bodyMargin: number;
    panelMarginBottom: number;
    headingOneSize: number;
    headingTwoSize: number;
    lineHeight: number;
    fontSize: number;
  }
): string {
  const highlights = report.advisorsHighlights
    .map((line) => `<li>${escapeHtml(line)}</li>`)
    .join("");
  const recommendations = report.recommendations
    .map((line) => `<li>${escapeHtml(line)}</li>`)
    .join("");
  const risks = report.risks.map((line) => `<li>${escapeHtml(line)}</li>`).join("");
  const compliance = report.regulatoryCompliance
    ? `
      <section class="panel">
        <h2>الالتزام التنظيمي</h2>
        <p>الحالة: ${escapeHtml(report.regulatoryCompliance.readiness)}</p>
        <p>مستوى الإكمال: ${report.regulatoryCompliance.completedCount}/${report.regulatoryCompliance.requiredCount}</p>
        <p>المسارات المفتوحة: ${escapeHtml(
          report.regulatoryCompliance.pendingPaths.length
            ? report.regulatoryCompliance.pendingPaths.join("، ")
            : "لا توجد"
        )}</p>
      </section>
    `
    : "";

  return `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(report.title)}</title>
  <style>
    * { box-sizing: border-box; }
    body {
      font-family: "Segoe UI", Tahoma, Arial, sans-serif;
      margin: ${options.bodyMargin}px;
      color: #111827;
      line-height: ${options.lineHeight};
      font-size: ${options.fontSize}px;
      direction: rtl;
      text-align: right;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    h1 { margin: 0 0 8px; font-size: ${options.headingOneSize}px; }
    h2 { margin: 0 0 10px; font-size: ${options.headingTwoSize}px; page-break-after: avoid; }
    p { margin: 0 0 8px; }
    ul { margin: 0; padding-right: 20px; }
    li { margin-bottom: 6px; page-break-inside: avoid; }
    .meta { color: #4b5563; margin-bottom: 14px; font-size: 14px; }
    .panel {
      border: 1px solid #d1d5db;
      border-radius: 10px;
      padding: 14px;
      margin-bottom: ${options.panelMarginBottom}px;
      background: #ffffff;
      page-break-inside: avoid;
    }
    .brand {
      font-size: 12px;
      color: #6b7280;
      margin-bottom: 6px;
    }
    @media print {
      body { margin: 12mm; }
      .panel { page-break-inside: avoid; }
    }
  </style>
</head>
<body>
  <div class="brand">One Minute Strategy</div>
  <h1>${escapeHtml(report.title)}</h1>
  <div class="meta">المعرّف: ${escapeHtml(report.id)} | التاريخ: ${escapeHtml(report.date)} | الحالة: ${escapeHtml(
    report.status
  )}</div>

  <section class="panel">
    <h2>القرار التنفيذي</h2>
    <p>${escapeHtml(report.executiveDecision || "لا يوجد قرار تنفيذي مولّد بعد.")}</p>
  </section>

  ${compliance}

  <section class="panel">
    <h2>أبرز ملاحظات المستشارين</h2>
    <ul>${highlights}</ul>
  </section>

  <section class="panel">
    <h2>التوصيات التنفيذية</h2>
    <ul>${recommendations}</ul>
  </section>

  <section class="panel">
    <h2>المخاطر</h2>
    <ul>${risks}</ul>
  </section>
</body>
</html>`;
}

export function buildReportsCsv(reports: StrategyReport[]): string {
  const header = [
    "المعرف",
    "العنوان",
    "التاريخ",
    "الحالة",
    "القرار التنفيذي",
    "عدد ملاحظات المستشارين",
    "عدد التوصيات",
    "عدد المخاطر",
    "حالة الامتثال",
    "الامتثال المكتمل",
    "الامتثال المطلوب",
    "المسارات المفتوحة",
  ];

  const rows = reports.map((report) => {
    const highlightsCount = report.advisorsHighlights.filter((line) => !line.startsWith("لا توجد")).length;
    const recommendationsCount = report.recommendations.filter((line) => !line.startsWith("لا توجد")).length;
    const risksCount = report.risks.filter((line) => !line.startsWith("لا توجد")).length;
    const complianceReady = report.regulatoryCompliance?.readiness ?? "غير متوفر";
    const complianceCompleted = String(report.regulatoryCompliance?.completedCount ?? 0);
    const complianceRequired = String(report.regulatoryCompliance?.requiredCount ?? 0);
    const pendingPaths = report.regulatoryCompliance?.pendingPaths.join(" | ") || "";

    return [
      report.id,
      report.title,
      report.date,
      report.status,
      report.executiveDecision,
      String(highlightsCount),
      String(recommendationsCount),
      String(risksCount),
      complianceReady,
      complianceCompleted,
      complianceRequired,
      pendingPaths,
    ];
  });

  const allRows = [header, ...rows];
  return allRows.map((row) => row.map(csvCell).join(",")).join("\n");
}

export function buildReportsCsvFileName(): string {
  const today = new Date().toISOString().slice(0, 10);
  return `oms-report-portfolio-${today}-mixed.csv`;
}

function buildReportBaseName(report: StrategyReport): string {
  const normalizedTitle = normalizeFileToken(report.title, 48);
  const normalizedId = normalizeFileToken(report.id, 24);
  const normalizedDate = (report.date || "").replace(/[^\d-]/g, "").slice(0, 10) || "date";
  const status = statusSlug(report.status);
  return `${normalizedTitle || normalizedId || "project"}-${normalizedDate}-${status}`;
}

function normalizeBundleFailedActions(actions: Array<ReportExportAction | BundleExportAction>): BundleExportAction[] {
  const filtered = actions.filter((action): action is BundleExportAction =>
    action === "txt" || action === "docx" || action === "pdf"
  );
  return Array.from(new Set(filtered));
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function csvCell(value: string): string {
  const escaped = value.replaceAll('"', '""');
  return `"${escaped}"`;
}

function statusSlug(status: StrategyReport["status"]): string {
  if (status === "معتمد") return "approved";
  if (status === "مكتمل") return "completed";
  return "draft";
}

function normalizeFileToken(value: string, maxLength: number): string {
  const normalized = value
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[\\/:*?"<>|]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-+/, "")
    .replace(/-+$/, "");
  return normalized.slice(0, maxLength);
}

function waitForMs(ms: number) {
  return new Promise<void>((resolve) => {
    if (typeof window === "undefined") {
      resolve();
      return;
    }
    window.setTimeout(resolve, ms);
  });
}
