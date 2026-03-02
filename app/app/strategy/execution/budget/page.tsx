"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type BudgetLine = {
  id: string;
  title: string;
  owner: string;
  planned: number;
  actual: number;
};

type BudgetSnapshot = {
  lines: BudgetLine[];
  plannedRevenue: number;
  actualRevenue: number;
  updatedAt: string;
};

type ProjectContext = {
  id: string;
  name: string;
  budgetTarget: number;
};

const PROJECTS_REGISTRY_KEY = "oms_dashboard_projects_registry_v1";
const PROJECT_DATA_KEY_PREFIX = "oms_dashboard_project_data_v1_";
const SETTINGS_STORAGE_KEY = "oms_exec_settings_v1";
const BUDGET_TRACKER_PREFIX = "oms_exec_budget_tracker_v1_";

export default function StrategyExecutionBudgetPage() {
  const [projectContext, setProjectContext] = useState<ProjectContext | null>(null);
  const [lines, setLines] = useState<BudgetLine[]>([]);
  const [plannedRevenue, setPlannedRevenue] = useState(0);
  const [actualRevenue, setActualRevenue] = useState(0);
  const [budgetAlertThreshold, setBudgetAlertThreshold] = useState(10);
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const context = readProjectContext();
    setProjectContext(context);
    setBudgetAlertThreshold(readBudgetAlertThreshold());

    const snapshot = readBudgetSnapshot(context.id);
    if (snapshot) {
      setLines(snapshot.lines.length ? snapshot.lines : defaultLines(context.budgetTarget));
      setPlannedRevenue(snapshot.plannedRevenue);
      setActualRevenue(snapshot.actualRevenue);
      setLastSavedAt(snapshot.updatedAt);
    } else {
      setLines(defaultLines(context.budgetTarget));
      setPlannedRevenue(0);
      setActualRevenue(0);
      setLastSavedAt(null);
    }

    setIsLoaded(true);
  }, []);

  useEffect(() => {
    if (!isLoaded || !projectContext) return;
    const nowText = new Date().toLocaleTimeString("ar-SA", {
      hour: "2-digit",
      minute: "2-digit",
    });
    const payload: BudgetSnapshot = {
      lines,
      plannedRevenue,
      actualRevenue,
      updatedAt: nowText,
    };
    localStorage.setItem(budgetTrackerKey(projectContext.id), JSON.stringify(payload));
    setLastSavedAt(nowText);
  }, [isLoaded, projectContext, lines, plannedRevenue, actualRevenue]);

  const summary = useMemo(() => {
    const plannedTotal = lines.reduce((sum, row) => sum + positive(row.planned), 0);
    const actualTotal = lines.reduce((sum, row) => sum + positive(row.actual), 0);
    const remaining = plannedTotal - actualTotal;
    const variancePct = plannedTotal > 0 ? ((actualTotal - plannedTotal) / plannedTotal) * 100 : null;
    const baseline = projectContext?.budgetTarget && projectContext.budgetTarget > 0 ? projectContext.budgetTarget : plannedTotal;
    const consumptionPct = baseline > 0 ? (actualTotal / baseline) * 100 : null;
    const plannedProfit = plannedRevenue - plannedTotal;
    const actualProfit = actualRevenue - actualTotal;
    const tone = resolveBudgetTone(variancePct, remaining, budgetAlertThreshold);

    return {
      plannedTotal,
      actualTotal,
      remaining,
      variancePct,
      consumptionPct,
      plannedProfit,
      actualProfit,
      tone,
    };
  }, [lines, plannedRevenue, actualRevenue, projectContext, budgetAlertThreshold]);

  const projectName = projectContext?.name ?? "مشروع غير محدد";
  const projectBudget = projectContext?.budgetTarget ?? 0;

  return (
    <main>
      <h1 className="oms-page-title">الخطة المالية التنفيذية</h1>
      <p className="oms-page-subtitle">
        متابعة الميزانية المخططة مقابل الصرف الفعلي لكل بند، مع قياس فوري للانحراف والربحية.
      </p>

      <section className="oms-panel budget-top-summary">
        <div className="budget-top-grid">
          <div>
            <div className="budget-top-label">المشروع الحالي</div>
            <div className="budget-top-title">{projectName}</div>
            <div className="budget-top-meta">
              الميزانية المرجعية: {projectBudget > 0 ? formatCurrency(projectBudget) : "غير محددة"}
            </div>
          </div>
          <div className={`budget-health ${summary.tone.className}`}>
            <div className="budget-health-label">مؤشر الحالة المالية</div>
            <div className="budget-health-title">{summary.tone.label}</div>
            <div className="budget-health-meta">
              الحد التنبيهي الحالي: {formatPercent(budgetAlertThreshold)} من المخطط
            </div>
          </div>
        </div>
      </section>

      <section className="budget-kpi-grid">
        <article className="oms-kpi-card">
          <div className="oms-kpi-label">إجمالي المخطط</div>
          <div className="oms-kpi-value budget-kpi-value">{formatCurrency(summary.plannedTotal)}</div>
        </article>
        <article className="oms-kpi-card">
          <div className="oms-kpi-label">إجمالي الفعلي</div>
          <div className="oms-kpi-value budget-kpi-value">{formatCurrency(summary.actualTotal)}</div>
        </article>
        <article className="oms-kpi-card">
          <div className="oms-kpi-label">المتبقي من الخطة</div>
          <div className="oms-kpi-value budget-kpi-value">{formatSignedCurrency(summary.remaining)}</div>
        </article>
        <article className="oms-kpi-card">
          <div className="oms-kpi-label">الانحراف الكلي</div>
          <div className="oms-kpi-value budget-kpi-value">{formatSignedPercent(summary.variancePct)}</div>
        </article>
        <article className="oms-kpi-card">
          <div className="oms-kpi-label">استهلاك الميزانية</div>
          <div className="oms-kpi-value budget-kpi-value">{formatPercent(summary.consumptionPct)}</div>
        </article>
      </section>

      <section className="oms-panel">
        <h2 className="oms-section-title">قياس الربحية</h2>
        <p className="oms-text">
          أدخل الإيرادات المخططة والفعلية لمعرفة صافي الربح/الخسارة أثناء التنفيذ.
        </p>

        <div className="budget-revenue-grid">
          <label className="budget-field">
            <span className="budget-field-label">الإيرادات المخططة</span>
            <input
              className="budget-input"
              type="number"
              min={0}
              value={plannedRevenue}
              onChange={(event) => setPlannedRevenue(toNumber(event.target.value))}
            />
          </label>
          <label className="budget-field">
            <span className="budget-field-label">الإيرادات الفعلية</span>
            <input
              className="budget-input"
              type="number"
              min={0}
              value={actualRevenue}
              onChange={(event) => setActualRevenue(toNumber(event.target.value))}
            />
          </label>
          <div className="budget-profit-box">
            <div className="budget-profit-label">الربح/الخسارة المتوقعة</div>
            <div className="budget-profit-value">{formatSignedCurrency(summary.plannedProfit)}</div>
          </div>
          <div className="budget-profit-box">
            <div className="budget-profit-label">الربح/الخسارة الفعلية</div>
            <div className="budget-profit-value">{formatSignedCurrency(summary.actualProfit)}</div>
          </div>
        </div>
      </section>

      <section className="oms-panel">
        <div className="budget-lines-head">
          <h2 className="oms-section-title">بنود الصرف التنفيذي</h2>
          <div className="budget-lines-actions">
            <button className="oms-btn oms-btn-ghost" type="button" onClick={handleAutoDistribute}>
              توزيع تلقائي
            </button>
            <button className="oms-btn oms-btn-ghost" type="button" onClick={handleAddLine}>
              إضافة بند
            </button>
          </div>
        </div>

        <div className="budget-lines-list">
          {lines.map((line) => {
            const rowRemaining = positive(line.planned) - positive(line.actual);
            const rowVariance = line.planned > 0 ? ((line.actual - line.planned) / line.planned) * 100 : null;
            return (
              <article key={line.id} className="budget-row">
                <label className="budget-field">
                  <span className="budget-field-label">البند</span>
                  <input
                    className="budget-input"
                    value={line.title}
                    onChange={(event) => updateLine(line.id, { title: event.target.value })}
                    placeholder="مثال: تجهيزات الموقع"
                  />
                </label>
                <label className="budget-field">
                  <span className="budget-field-label">المسؤول</span>
                  <input
                    className="budget-input"
                    value={line.owner}
                    onChange={(event) => updateLine(line.id, { owner: event.target.value })}
                    placeholder="مدير التشغيل"
                  />
                </label>
                <label className="budget-field">
                  <span className="budget-field-label">المخطط</span>
                  <input
                    className="budget-input"
                    type="number"
                    min={0}
                    value={line.planned}
                    onChange={(event) => updateLine(line.id, { planned: toNumber(event.target.value) })}
                  />
                </label>
                <label className="budget-field">
                  <span className="budget-field-label">الفعلي</span>
                  <input
                    className="budget-input"
                    type="number"
                    min={0}
                    value={line.actual}
                    onChange={(event) => updateLine(line.id, { actual: toNumber(event.target.value) })}
                  />
                </label>

                <div className="budget-row-stats">
                  <div className="budget-row-stat">
                    <span>المتبقي:</span>
                    <strong>{formatSignedCurrency(rowRemaining)}</strong>
                  </div>
                  <div className="budget-row-stat">
                    <span>الانحراف:</span>
                    <strong>{formatSignedPercent(rowVariance)}</strong>
                  </div>
                </div>

                <div className="budget-row-actions">
                  <button className="oms-btn oms-btn-ghost" type="button" onClick={() => removeLine(line.id)}>
                    حذف
                  </button>
                </div>
              </article>
            );
          })}
        </div>

        <div className="budget-foot-note">
          {lastSavedAt ? `آخر حفظ تلقائي: ${lastSavedAt}` : "الحفظ التلقائي يعمل عند أي تعديل."}
        </div>
      </section>

      <section className="oms-panel">
        <h2 className="oms-section-title">إجراء تنفيذي</h2>
        <div className="budget-footer-actions">
          <Link href="/app/strategy/execution/plan" className="oms-btn oms-btn-primary">
            اعتماد الخطة المالية والانتقال للخطة الزمنية
          </Link>
          <Link href="/app/workflows" className="oms-btn oms-btn-ghost">
            فتح سير العمل التنفيذي
          </Link>
        </div>
      </section>

      <style>{`
        .budget-top-summary {
          background: linear-gradient(155deg, rgba(24,36,64,0.92), rgba(15,24,43,0.86));
        }

        .budget-top-grid {
          display: grid;
          grid-template-columns: minmax(0, 1.2fr) minmax(0, 1fr);
          gap: 10px;
          align-items: stretch;
        }

        .budget-top-label {
          color: var(--oms-text-faint);
          font-size: 12px;
          font-weight: 800;
        }

        .budget-top-title {
          margin-top: 6px;
          font-size: 24px;
          font-weight: 900;
        }

        .budget-top-meta {
          margin-top: 6px;
          color: var(--oms-text-muted);
          line-height: 1.7;
        }

        .budget-health {
          border: 1px solid var(--oms-border-strong);
          border-radius: var(--oms-radius-md);
          background: rgba(9, 15, 28, 0.75);
          padding: 10px;
          display: grid;
          gap: 4px;
        }

        .budget-health.is-good {
          border-color: rgba(88, 214, 165, 0.52);
          background: linear-gradient(180deg, rgba(16, 49, 40, 0.72), rgba(9, 25, 21, 0.72));
        }

        .budget-health.is-warning {
          border-color: rgba(232, 182, 102, 0.52);
          background: linear-gradient(180deg, rgba(53, 39, 14, 0.72), rgba(28, 20, 10, 0.72));
        }

        .budget-health.is-risk {
          border-color: rgba(247, 106, 121, 0.52);
          background: linear-gradient(180deg, rgba(56, 20, 30, 0.72), rgba(29, 14, 20, 0.72));
        }

        .budget-health-label {
          color: var(--oms-text-faint);
          font-size: 12px;
          font-weight: 800;
        }

        .budget-health-title {
          font-size: 22px;
          font-weight: 900;
        }

        .budget-health-meta {
          color: var(--oms-text-muted);
          font-size: 13px;
          line-height: 1.7;
        }

        .budget-kpi-grid {
          margin-top: 12px;
          display: grid;
          grid-template-columns: repeat(5, minmax(0, 1fr));
          gap: 10px;
        }

        .budget-kpi-value {
          font-size: 20px;
          line-height: 1.4;
        }

        .budget-revenue-grid {
          margin-top: 10px;
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 8px;
        }

        .budget-field {
          display: grid;
          gap: 6px;
        }

        .budget-field-label {
          font-size: 12px;
          font-weight: 800;
          color: var(--oms-text-faint);
        }

        .budget-input {
          min-height: 40px;
          border-radius: var(--oms-radius-sm);
          border: 1px solid var(--oms-border-strong);
          background: rgba(8, 14, 26, 0.82);
          color: var(--oms-text);
          padding: 0 10px;
          font-size: 14px;
        }

        .budget-profit-box {
          border: 1px solid var(--oms-border);
          border-radius: var(--oms-radius-md);
          background: var(--oms-bg-card);
          padding: 10px;
          display: grid;
          gap: 6px;
        }

        .budget-profit-label {
          color: var(--oms-text-faint);
          font-size: 12px;
          font-weight: 800;
        }

        .budget-profit-value {
          font-size: 22px;
          font-weight: 900;
        }

        .budget-lines-head {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          flex-wrap: wrap;
        }

        .budget-lines-actions {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
        }

        .budget-lines-list {
          margin-top: 10px;
          display: grid;
          gap: 8px;
        }

        .budget-row {
          border: 1px solid var(--oms-border);
          border-radius: var(--oms-radius-md);
          background: var(--oms-bg-card);
          padding: 10px;
          display: grid;
          grid-template-columns: minmax(160px, 1fr) minmax(140px, 1fr) 130px 130px minmax(170px, 1fr) auto;
          gap: 8px;
          align-items: end;
        }

        .budget-row-stats {
          border: 1px solid var(--oms-border);
          border-radius: var(--oms-radius-sm);
          background: rgba(9, 15, 28, 0.72);
          padding: 8px;
          display: grid;
          gap: 4px;
        }

        .budget-row-stat {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
          font-size: 13px;
          color: var(--oms-text-muted);
        }

        .budget-row-stat strong {
          color: var(--oms-text);
          font-size: 14px;
          font-weight: 900;
        }

        .budget-row-actions {
          display: flex;
          justify-content: flex-end;
        }

        .budget-foot-note {
          margin-top: 10px;
          font-size: 12px;
          color: var(--oms-text-faint);
        }

        .budget-footer-actions {
          margin-top: 10px;
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
        }

        @media (max-width: 1180px) {
          .budget-top-grid {
            grid-template-columns: 1fr;
          }

          .budget-kpi-grid {
            grid-template-columns: repeat(3, minmax(0, 1fr));
          }

          .budget-row {
            grid-template-columns: repeat(2, minmax(0, 1fr));
            align-items: stretch;
          }

          .budget-row-actions {
            justify-content: stretch;
          }

          .budget-row-actions .oms-btn {
            width: 100%;
          }
        }

        @media (max-width: 720px) {
          .budget-kpi-grid,
          .budget-revenue-grid,
          .budget-row {
            grid-template-columns: 1fr;
          }

          .budget-lines-actions,
          .budget-footer-actions {
            display: grid;
          }

          .budget-lines-actions .oms-btn,
          .budget-footer-actions .oms-btn {
            width: 100%;
            justify-content: center;
          }
        }
      `}</style>
    </main>
  );

  function updateLine(lineId: string, patch: Partial<BudgetLine>) {
    setLines((prev) => prev.map((row) => (row.id === lineId ? { ...row, ...patch } : row)));
  }

  function removeLine(lineId: string) {
    setLines((prev) => {
      if (prev.length <= 1) return prev;
      return prev.filter((row) => row.id !== lineId);
    });
  }

  function handleAddLine() {
    setLines((prev) => [
      ...prev,
      {
        id: randomId(),
        title: "بند إضافي",
        owner: "غير محدد",
        planned: 0,
        actual: 0,
      },
    ]);
  }

  function handleAutoDistribute() {
    const next = defaultLines(projectBudget);
    setLines(next);
  }
}

function readProjectContext(): ProjectContext {
  if (typeof window === "undefined") {
    return { id: "global", name: "مشروع غير محدد", budgetTarget: 0 };
  }

  try {
    const raw = localStorage.getItem(PROJECTS_REGISTRY_KEY);
    if (!raw) return { id: "global", name: "مشروع غير محدد", budgetTarget: 0 };

    const parsed = JSON.parse(raw) as {
      activeProjectId?: string;
      projects?: Array<{ id: string; name: string }>;
    };

    const projects = Array.isArray(parsed.projects) ? parsed.projects : [];
    const active = projects.find((item) => item.id === parsed.activeProjectId) ?? projects[0];
    if (!active) return { id: "global", name: "مشروع غير محدد", budgetTarget: 0 };

    const snapshotRaw = localStorage.getItem(`${PROJECT_DATA_KEY_PREFIX}${active.id}`);
    const snapshot = snapshotRaw ? (JSON.parse(snapshotRaw) as { budget?: string | number }) : {};
    const budgetTarget = parseAmount(snapshot.budget);

    return {
      id: active.id,
      name: active.name?.trim() || "مشروع بدون اسم",
      budgetTarget,
    };
  } catch {
    return { id: "global", name: "مشروع غير محدد", budgetTarget: 0 };
  }
}

function readBudgetAlertThreshold() {
  if (typeof window === "undefined") return 10;
  try {
    const raw = localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (!raw) return 10;
    const parsed = JSON.parse(raw) as { budgetAlertThreshold?: number };
    if (!Number.isFinite(parsed.budgetAlertThreshold)) return 10;
    return Math.max(1, Math.min(100, Number(parsed.budgetAlertThreshold)));
  } catch {
    return 10;
  }
}

function readBudgetSnapshot(projectId: string): BudgetSnapshot | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(budgetTrackerKey(projectId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<BudgetSnapshot>;
    const normalizedLines = Array.isArray(parsed.lines)
      ? parsed.lines.map((line) => ({
          id: typeof line.id === "string" ? line.id : randomId(),
          title: typeof line.title === "string" ? line.title : "بند بدون اسم",
          owner: typeof line.owner === "string" ? line.owner : "غير محدد",
          planned: Number.isFinite(line.planned) ? Number(line.planned) : 0,
          actual: Number.isFinite(line.actual) ? Number(line.actual) : 0,
        }))
      : [];

    return {
      lines: normalizedLines,
      plannedRevenue: Number.isFinite(parsed.plannedRevenue) ? Number(parsed.plannedRevenue) : 0,
      actualRevenue: Number.isFinite(parsed.actualRevenue) ? Number(parsed.actualRevenue) : 0,
      updatedAt: typeof parsed.updatedAt === "string" ? parsed.updatedAt : "",
    };
  } catch {
    return null;
  }
}

function budgetTrackerKey(projectId: string) {
  return `${BUDGET_TRACKER_PREFIX}${projectId}`;
}

function defaultLines(budgetTarget: number): BudgetLine[] {
  const distribution = [
    { title: "التشغيل والموقع", owner: "مدير التشغيل", ratio: 0.35 },
    { title: "التجهيزات الفنية", owner: "القسم الفني", ratio: 0.25 },
    { title: "التسويق والترويج", owner: "قائد التسويق", ratio: 0.15 },
    { title: "الموردون والمشتريات", owner: "قائد المشتريات", ratio: 0.15 },
    { title: "احتياطي المخاطر", owner: "مدير المشروع", ratio: 0.1 },
  ];

  if (budgetTarget <= 0) {
    return distribution.map((item) => ({
      id: randomId(),
      title: item.title,
      owner: item.owner,
      planned: 0,
      actual: 0,
    }));
  }

  return distribution.map((item) => ({
    id: randomId(),
    title: item.title,
    owner: item.owner,
    planned: Math.round(budgetTarget * item.ratio),
    actual: 0,
  }));
}

function resolveBudgetTone(variancePct: number | null, remaining: number, threshold: number) {
  if (variancePct === null) return { label: "بانتظار بيانات كافية", className: "is-warning" };
  if (remaining < 0 || variancePct > threshold) return { label: "تجاوز يحتاج تدخل", className: "is-risk" };
  if (Math.abs(variancePct) > threshold / 2) return { label: "تحت المراقبة", className: "is-warning" };
  return { label: "ضمن الحدود", className: "is-good" };
}

function parseAmount(value: string | number | undefined) {
  if (typeof value === "number") return positive(value);
  if (!value) return 0;
  const normalized = toEnglishDigits(String(value)).replace(/[^\d.-]/g, "");
  const numeric = Number(normalized);
  if (!Number.isFinite(numeric)) return 0;
  return positive(numeric);
}

function toEnglishDigits(value: string) {
  const arabic = "٠١٢٣٤٥٦٧٨٩";
  return value.replace(/[٠-٩]/g, (digit) => String(arabic.indexOf(digit)));
}

function toNumber(value: string) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 0;
  return Math.max(0, parsed);
}

function positive(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, value);
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("ar-SA", {
    style: "currency",
    currency: "SAR",
    maximumFractionDigits: 0,
  }).format(positive(value));
}

function formatSignedCurrency(value: number) {
  const sign = value < 0 ? "-" : value > 0 ? "+" : "";
  return `${sign}${formatCurrency(Math.abs(value))}`;
}

function formatPercent(value: number | null) {
  if (value === null || !Number.isFinite(value)) return "—";
  return `${value.toFixed(1)}%`;
}

function formatSignedPercent(value: number | null) {
  if (value === null || !Number.isFinite(value)) return "—";
  const sign = value > 0 ? "+" : value < 0 ? "-" : "";
  return `${sign}${Math.abs(value).toFixed(1)}%`;
}

function randomId() {
  return `line_${Math.random().toString(36).slice(2, 10)}`;
}
