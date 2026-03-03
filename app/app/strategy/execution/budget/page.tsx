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

type AdvanceStatus = "طلب جديد" | "معتمدة" | "مصروفة" | "مسواة" | "ملغاة";

type BudgetAdvance = {
  id: string;
  lineId: string;
  holder: string;
  purpose: string;
  requestedAmount: number;
  approvedAmount: number;
  settledAmount: number;
  status: AdvanceStatus;
  requestedAt: string;
  dueDate: string;
  updatedAt: string;
};

type BudgetIncreaseStatus = "طلب جديد" | "تحت المراجعة" | "معتمد" | "مرفوض" | "منفذ";

type BudgetIncreaseRequest = {
  id: string;
  lineId: string;
  requestedBy: string;
  requestedAmount: number;
  approvedAmount: number;
  reason: string;
  status: BudgetIncreaseStatus;
  requestedAt: string;
  reviewedAt: string;
  reviewedBy: string;
  notes: string;
  updatedAt: string;
};

type BudgetSnapshot = {
  lines: BudgetLine[];
  advances: BudgetAdvance[];
  budgetIncreases: BudgetIncreaseRequest[];
  auditTrail: BudgetAuditEntry[];
  plannedRevenue: number;
  actualRevenue: number;
  updatedAt: string;
};

type ProjectContext = {
  id: string;
  name: string;
  budgetTarget: number;
  role: UserRole;
};

type NewAdvanceForm = {
  lineId: string;
  holder: string;
  purpose: string;
  amount: number;
  dueDate: string;
};

type BudgetIncreaseForm = {
  lineId: string;
  amount: number;
  reason: string;
};

type UserRole = "project_manager" | "operations_manager" | "finance_manager" | "viewer";
type PermissionScope =
  | "edit_budget_lines"
  | "request_advance"
  | "approve_advance"
  | "disburse_advance"
  | "settle_advance"
  | "cancel_advance"
  | "request_budget_increase"
  | "approve_budget_increase"
  | "execute_budget_increase";
type BudgetAuditAction =
  | "إنشاء طلب عهدة"
  | "رفض طلب عهدة بسبب عدم كفاية البند"
  | "اعتماد عهدة"
  | "صرف عهدة"
  | "تسوية عهدة"
  | "إلغاء عهدة"
  | "إنشاء طلب رفع ميزانية بند"
  | "بدء مراجعة طلب رفع ميزانية"
  | "اعتماد طلب رفع ميزانية"
  | "رفض طلب رفع ميزانية"
  | "تنفيذ رفع ميزانية بند"
  | "إضافة بند ميزانية"
  | "حذف بند ميزانية"
  | "توزيع تلقائي لبنود الميزانية"
  | "رفض إجراء بسبب الصلاحيات";
type BudgetAuditEntry = {
  id: string;
  action: BudgetAuditAction;
  details: string;
  actorRole: UserRole;
  actorLabel: string;
  createdAt: string;
  advanceId?: string;
  lineId?: string;
};
type AuditFilter = "all" | "advances" | "increases" | "permissions";

const PROJECTS_REGISTRY_KEY = "oms_dashboard_projects_registry_v1";
const PROJECT_DATA_KEY_PREFIX = "oms_dashboard_project_data_v1_";
const SETTINGS_STORAGE_KEY = "oms_exec_settings_v1";
const BUDGET_TRACKER_PREFIX = "oms_exec_budget_tracker_v1_";

const ROLE_PERMISSIONS: Record<UserRole, Record<PermissionScope, boolean>> = {
  project_manager: {
    edit_budget_lines: true,
    request_advance: true,
    approve_advance: true,
    disburse_advance: true,
    settle_advance: true,
    cancel_advance: true,
    request_budget_increase: true,
    approve_budget_increase: true,
    execute_budget_increase: true,
  },
  operations_manager: {
    edit_budget_lines: false,
    request_advance: true,
    approve_advance: false,
    disburse_advance: false,
    settle_advance: false,
    cancel_advance: false,
    request_budget_increase: true,
    approve_budget_increase: false,
    execute_budget_increase: false,
  },
  finance_manager: {
    edit_budget_lines: true,
    request_advance: true,
    approve_advance: true,
    disburse_advance: true,
    settle_advance: true,
    cancel_advance: true,
    request_budget_increase: true,
    approve_budget_increase: true,
    execute_budget_increase: true,
  },
  viewer: {
    edit_budget_lines: false,
    request_advance: false,
    approve_advance: false,
    disburse_advance: false,
    settle_advance: false,
    cancel_advance: false,
    request_budget_increase: false,
    approve_budget_increase: false,
    execute_budget_increase: false,
  },
};

const PERMISSION_SCOPE_LABELS: Record<PermissionScope, string> = {
  edit_budget_lines: "تعديل بنود الميزانية",
  request_advance: "إنشاء طلب عهدة",
  approve_advance: "اعتماد العهدة",
  disburse_advance: "تأكيد صرف العهدة",
  settle_advance: "تسوية العهدة",
  cancel_advance: "إلغاء العهدة",
  request_budget_increase: "إنشاء طلب رفع ميزانية البند",
  approve_budget_increase: "اعتماد/رفض طلب رفع الميزانية",
  execute_budget_increase: "تنفيذ رفع الميزانية المعتمد",
};

export default function StrategyExecutionBudgetPage() {
  const [projectContext, setProjectContext] = useState<ProjectContext | null>(null);
  const [lines, setLines] = useState<BudgetLine[]>([]);
  const [advances, setAdvances] = useState<BudgetAdvance[]>([]);
  const [budgetIncreases, setBudgetIncreases] = useState<BudgetIncreaseRequest[]>([]);
  const [auditTrail, setAuditTrail] = useState<BudgetAuditEntry[]>([]);
  const [plannedRevenue, setPlannedRevenue] = useState(0);
  const [actualRevenue, setActualRevenue] = useState(0);
  const [budgetAlertThreshold, setBudgetAlertThreshold] = useState(10);
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [alertMessage, setAlertMessage] = useState<string | null>(null);
  const [settleInputs, setSettleInputs] = useState<Record<string, number>>({});
  const [newAdvance, setNewAdvance] = useState<NewAdvanceForm>({
    lineId: "",
    holder: "",
    purpose: "",
    amount: 0,
    dueDate: addDaysIso(todayIso(), 7),
  });
  const [newIncrease, setNewIncrease] = useState<BudgetIncreaseForm>({
    lineId: "",
    amount: 0,
    reason: "",
  });
  const [showIncreaseForm, setShowIncreaseForm] = useState(false);
  const [isIncreaseSectionExpanded, setIsIncreaseSectionExpanded] = useState(false);
  const [isArchivedAdvancesExpanded, setIsArchivedAdvancesExpanded] = useState(false);
  const [isAuditExpanded, setIsAuditExpanded] = useState(false);
  const [auditFilter, setAuditFilter] = useState<AuditFilter>("all");
  const [visibleAuditCount, setVisibleAuditCount] = useState(8);

  useEffect(() => {
    const context = readProjectContext();
    setProjectContext(context);
    setBudgetAlertThreshold(readBudgetAlertThreshold());

    const snapshot = readBudgetSnapshot(context.id);
    if (snapshot) {
      const nextLines = snapshot.lines.length ? snapshot.lines : defaultLines(context.budgetTarget);
      setLines(nextLines);
      setAdvances(snapshot.advances ?? []);
      setBudgetIncreases(snapshot.budgetIncreases ?? []);
      setAuditTrail(snapshot.auditTrail ?? []);
      setPlannedRevenue(snapshot.plannedRevenue);
      setActualRevenue(snapshot.actualRevenue);
      setLastSavedAt(snapshot.updatedAt);
      setNewAdvance((prev) => ({
        ...prev,
        lineId: nextLines[0]?.id ?? "",
      }));
      setNewIncrease((prev) => ({
        ...prev,
        lineId: nextLines[0]?.id ?? "",
      }));
    } else {
      const fallbackLines = defaultLines(context.budgetTarget);
      setLines(fallbackLines);
      setAdvances([]);
      setBudgetIncreases([]);
      setAuditTrail([]);
      setPlannedRevenue(0);
      setActualRevenue(0);
      setLastSavedAt(null);
      setNewAdvance((prev) => ({
        ...prev,
        lineId: fallbackLines[0]?.id ?? "",
      }));
      setNewIncrease((prev) => ({
        ...prev,
        lineId: fallbackLines[0]?.id ?? "",
      }));
    }

    setIsLoaded(true);
  }, []);

  useEffect(() => {
    if (!isLoaded || !projectContext) return;
    const nowText = nowTimeLabel();
    const payload: BudgetSnapshot = {
      lines,
      advances,
      budgetIncreases,
      auditTrail,
      plannedRevenue,
      actualRevenue,
      updatedAt: nowText,
    };
    localStorage.setItem(budgetTrackerKey(projectContext.id), JSON.stringify(payload));
    setLastSavedAt(nowText);
  }, [isLoaded, projectContext, lines, advances, budgetIncreases, auditTrail, plannedRevenue, actualRevenue]);

  const activeReservedByLine = useMemo(() => {
    const map: Record<string, number> = {};
    for (const item of advances) {
      if (!isReservedAdvance(item)) continue;
      map[item.lineId] = (map[item.lineId] ?? 0) + positive(item.approvedAmount);
    }
    return map;
  }, [advances]);

  const summary = useMemo(() => {
    const plannedTotal = lines.reduce((sum, row) => sum + positive(row.planned), 0);
    const actualTotal = lines.reduce((sum, row) => sum + positive(row.actual), 0);
    const reservedTotal = advances.reduce((sum, item) => {
      if (!isReservedAdvance(item)) return sum;
      return sum + positive(item.approvedAmount);
    }, 0);
    const committedTotal = actualTotal + reservedTotal;
    const remainingAfterCommitment = plannedTotal - committedTotal;
    const variancePct = plannedTotal > 0 ? ((committedTotal - plannedTotal) / plannedTotal) * 100 : null;
    const baseline =
      projectContext?.budgetTarget && projectContext.budgetTarget > 0 ? projectContext.budgetTarget : plannedTotal;
    const consumptionPct = baseline > 0 ? (committedTotal / baseline) * 100 : null;
    const plannedProfit = plannedRevenue - plannedTotal;
    const actualProfit = actualRevenue - actualTotal;
    const tone = resolveBudgetTone(variancePct, remainingAfterCommitment, budgetAlertThreshold);
    const openAdvancesCount = advances.filter((item) => isOpenAdvance(item)).length;
    const overdueAdvances = advances.filter((item) => isOverdue(item)).length;
    const settlementBaseCount = advances.filter((item) => item.status !== "ملغاة").length;
    const settlementRate =
      settlementBaseCount > 0
        ? (advances.filter((item) => item.status === "مسواة").length / settlementBaseCount) * 100
        : null;
    const openIncreaseRequests = budgetIncreases.filter(
      (item) => item.status === "طلب جديد" || item.status === "تحت المراجعة" || item.status === "معتمد"
    ).length;

    return {
      plannedTotal,
      actualTotal,
      reservedTotal,
      committedTotal,
      remainingAfterCommitment,
      variancePct,
      consumptionPct,
      plannedProfit,
      actualProfit,
      tone,
      openAdvancesCount,
      overdueAdvances,
      settlementRate,
      openIncreaseRequests,
    };
  }, [lines, advances, budgetIncreases, plannedRevenue, actualRevenue, projectContext, budgetAlertThreshold]);

  const projectName = projectContext?.name ?? "مشروع غير محدد";
  const projectBudget = projectContext?.budgetTarget ?? 0;

  const lineOptions = lines.map((line) => ({
    id: line.id,
    title: line.title || "بند بدون اسم",
    available: lineAvailable(line.id),
  }));

  const selectedAdvanceLine = lineOptions.find((line) => line.id === newAdvance.lineId) ?? null;
  const currentRole = projectContext?.role ?? "project_manager";
  const currentRoleLabel = userRoleLabel(currentRole);
  const permissions = ROLE_PERMISSIONS[currentRole];

  const blockedHolders = useMemo(() => {
    const map = new Set<string>();
    for (const item of advances) {
      if (isClosedAdvance(item)) continue;
      map.add(normalizeKey(item.holder));
    }
    return map;
  }, [advances]);
  const activeAdvances = useMemo(() => advances.filter((item) => isOpenAdvance(item)), [advances]);
  const archivedAdvances = useMemo(() => advances.filter((item) => isClosedAdvance(item)), [advances]);

  const permissionSummary = [
    permissionFlag("إنشاء طلب عهدة", permissions.request_advance),
    permissionFlag("اعتماد", permissions.approve_advance),
    permissionFlag("صرف", permissions.disburse_advance),
    permissionFlag("تسوية", permissions.settle_advance),
    permissionFlag("رفع ميزانية", permissions.request_budget_increase),
  ].join(" · ");

  const selectedLineAvailable = selectedAdvanceLine?.available ?? 0;
  const isSelectedLineExhausted = Boolean(selectedAdvanceLine && selectedLineAvailable <= 0);
  const isAdvanceAmountOverLine = Boolean(selectedAdvanceLine && newAdvance.amount > selectedLineAvailable);
  const isHolderBlocked =
    newAdvance.holder.trim().length > 0 && blockedHolders.has(normalizeKey(newAdvance.holder.trim()));
  const canSubmitAdvance =
    permissions.request_advance &&
    !!newAdvance.lineId &&
    !!newAdvance.dueDate &&
    newAdvance.amount > 0 &&
    !isSelectedLineExhausted &&
    !isAdvanceAmountOverLine &&
    !isHolderBlocked;
  const latestAuditTime = auditTrail[0]?.createdAt ?? "—";
  const filteredAuditTrail = useMemo(
    () => auditTrail.filter((entry) => matchesAuditFilter(entry, auditFilter)),
    [auditTrail, auditFilter]
  );
  const visibleAuditEntries = filteredAuditTrail.slice(0, visibleAuditCount);
  const canLoadMoreAudit = visibleAuditCount < filteredAuditTrail.length;
  const auditFilterButtons: Array<{ key: AuditFilter; label: string }> = [
    { key: "all", label: "الكل" },
    { key: "advances", label: "عهد" },
    { key: "increases", label: "رفع ميزانية" },
    { key: "permissions", label: "صلاحيات" },
  ];

  return (
    <main>
      <h1 className="oms-page-title">الخطة المالية التنفيذية</h1>
      <p className="oms-page-subtitle">
        مراقبة الميزانية الفعلية والعهد المالية ضمن دورة محكومة: طلب → اعتماد → صرف → تسوية.
      </p>

      {alertMessage ? <div className="budget-alert-banner">{alertMessage}</div> : null}

      <section className="oms-panel budget-top-summary">
        <div className="budget-top-grid">
          <div>
            <div className="budget-top-label">المشروع الحالي</div>
            <div className="budget-top-title">{projectName}</div>
            <div className="budget-top-meta">
              الميزانية المرجعية: {projectBudget > 0 ? formatCurrency(projectBudget) : "غير محددة"}
            </div>
            <div className="budget-top-meta">الدور الحالي: {currentRoleLabel}</div>
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
          <div className="oms-kpi-label">المصروف الفعلي</div>
          <div className="oms-kpi-value budget-kpi-value">{formatCurrency(summary.actualTotal)}</div>
        </article>
        <article className="oms-kpi-card">
          <div className="oms-kpi-label">عهد مفتوحة (محجوزة)</div>
          <div className="oms-kpi-value budget-kpi-value">{formatCurrency(summary.reservedTotal)}</div>
        </article>
        <article className="oms-kpi-card">
          <div className="oms-kpi-label">المتبقي بعد الالتزامات</div>
          <div className="oms-kpi-value budget-kpi-value">{formatSignedCurrency(summary.remainingAfterCommitment)}</div>
        </article>
        <article className="oms-kpi-card">
          <div className="oms-kpi-label">الانحراف الكلي</div>
          <div className="oms-kpi-value budget-kpi-value">{formatSignedPercent(summary.variancePct)}</div>
        </article>
        <article className="oms-kpi-card">
          <div className="oms-kpi-label">العهد المتأخرة</div>
          <div className="oms-kpi-value budget-kpi-value">{toArabicNumber(summary.overdueAdvances)}</div>
        </article>
      </section>

      <section className="oms-panel">
        <h2 className="oms-section-title">قياس الربحية</h2>
        <p className="oms-text">الإيرادات مقابل التكاليف لتقدير الربح/الخسارة قبل وبعد الصرف الفعلي.</p>

        <div className="budget-revenue-grid">
          <label className="budget-field">
            <span className="budget-field-label">الإيرادات المخططة</span>
            <input
              className="budget-input"
              type="number"
              min={0}
              value={plannedRevenue}
              disabled={!permissions.edit_budget_lines}
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
              disabled={!permissions.edit_budget_lines}
              onChange={(event) => setActualRevenue(toNumber(event.target.value))}
            />
          </label>
          <div className="budget-profit-box">
            <div className="budget-profit-label">ربح/خسارة مخططة</div>
            <div className="budget-profit-value">{formatSignedCurrency(summary.plannedProfit)}</div>
          </div>
          <div className="budget-profit-box">
            <div className="budget-profit-label">ربح/خسارة فعلية</div>
            <div className="budget-profit-value">{formatSignedCurrency(summary.actualProfit)}</div>
          </div>
        </div>
      </section>

      <section className="oms-panel">
        <div className="budget-lines-head">
          <h2 className="oms-section-title">بنود الميزانية</h2>
          <div className="budget-lines-actions">
            <button
              className="oms-btn oms-btn-ghost"
              type="button"
              onClick={handleAutoDistribute}
              disabled={!permissions.edit_budget_lines}
            >
              توزيع تلقائي
            </button>
            <button
              className="oms-btn oms-btn-ghost"
              type="button"
              onClick={handleAddLine}
              disabled={!permissions.edit_budget_lines}
            >
              إضافة بند
            </button>
          </div>
        </div>

        <div className="budget-lines-list">
          {lines.map((line) => {
            const reserved = activeReservedByLine[line.id] ?? 0;
            const available = lineAvailable(line.id);
            const effectiveSpent = positive(line.actual) + reserved;
            const rowVariance = line.planned > 0 ? ((effectiveSpent - line.planned) / line.planned) * 100 : null;
            return (
              <article key={line.id} className="budget-row">
                <label className="budget-field">
                  <span className="budget-field-label">البند</span>
                  <input
                    className="budget-input"
                    value={line.title}
                    disabled={!permissions.edit_budget_lines}
                    onChange={(event) => updateLine(line.id, { title: event.target.value })}
                  />
                </label>
                <label className="budget-field">
                  <span className="budget-field-label">المسؤول</span>
                  <input
                    className="budget-input"
                    value={line.owner}
                    disabled={!permissions.edit_budget_lines}
                    onChange={(event) => updateLine(line.id, { owner: event.target.value })}
                  />
                </label>
                <label className="budget-field">
                  <span className="budget-field-label">المخطط</span>
                  <input
                    className="budget-input"
                    type="number"
                    min={0}
                    value={line.planned}
                    disabled={!permissions.edit_budget_lines}
                    onChange={(event) => updateLine(line.id, { planned: toNumber(event.target.value) })}
                  />
                </label>
                <label className="budget-field">
                  <span className="budget-field-label">المصروف الفعلي</span>
                  <input
                    className="budget-input"
                    type="number"
                    min={0}
                    value={line.actual}
                    disabled={!permissions.edit_budget_lines}
                    onChange={(event) => updateLine(line.id, { actual: toNumber(event.target.value) })}
                  />
                </label>

                <div className="budget-row-stats">
                  <div className="budget-row-stat">
                    <span>العهد المحجوزة:</span>
                    <strong>{formatCurrency(reserved)}</strong>
                  </div>
                  <div className="budget-row-stat">
                    <span>المتاح:</span>
                    <strong>{formatSignedCurrency(available)}</strong>
                  </div>
                  <div className="budget-row-stat">
                    <span>الانحراف:</span>
                    <strong>{formatSignedPercent(rowVariance)}</strong>
                  </div>
                </div>

                <div className="budget-row-actions">
                  <button
                    className="oms-btn oms-btn-ghost"
                    type="button"
                    onClick={() => removeLine(line.id)}
                    disabled={!permissions.edit_budget_lines}
                  >
                    حذف
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <section className="oms-panel">
        <div className="budget-lines-head">
          <h2 className="oms-section-title">إدارة العهد المالية</h2>
          <div className="budget-advance-meta">
            عهد مفتوحة: {toArabicNumber(summary.openAdvancesCount)} · نسبة التسوية:{" "}
            {formatPercent(summary.settlementRate)} · {permissionSummary}
          </div>
        </div>

        <div className="advance-create">
          <label className="budget-field">
            <span className="budget-field-label">البند</span>
            <select
              className="budget-input"
              value={newAdvance.lineId}
              disabled={!permissions.request_advance}
              onChange={(event) => {
                const lineId = event.target.value;
                setNewAdvance((prev) => ({ ...prev, lineId }));
                setNewIncrease((prev) => ({ ...prev, lineId }));
              }}
            >
              <option value="">اختر البند</option>
              {lineOptions.map((line) => (
                <option key={line.id} value={line.id}>
                  {line.title}
                </option>
              ))}
            </select>
            <span className="budget-field-hint">
              {selectedAdvanceLine
                ? `المتاح لهذا البند: ${formatCurrency(selectedAdvanceLine.available)}`
                : "اختر بندًا لعرض المبلغ المتاح"}
            </span>
            {isSelectedLineExhausted ? (
              <span className="budget-field-alert">تم استنفاذ المبلغ المخطط للبند.</span>
            ) : null}
          </label>
          <label className="budget-field">
            <span className="budget-field-label">صاحب العهدة</span>
            <input
              className="budget-input"
              value={newAdvance.holder}
              disabled={!permissions.request_advance}
              onChange={(event) => setNewAdvance((prev) => ({ ...prev, holder: event.target.value }))}
              placeholder="اسم المسؤول"
            />
          </label>
          <label className="budget-field">
            <span className="budget-field-label">الغرض</span>
            <input
              className="budget-input"
              value={newAdvance.purpose}
              disabled={!permissions.request_advance}
              onChange={(event) => setNewAdvance((prev) => ({ ...prev, purpose: event.target.value }))}
              placeholder="مشتريات مواد/دفعة مورد/خدمات..."
            />
          </label>
          <label className="budget-field">
            <span className="budget-field-label">المبلغ المطلوب</span>
            <input
              className="budget-input"
              type="number"
              min={0}
              value={newAdvance.amount}
              disabled={!permissions.request_advance}
              onChange={(event) => setNewAdvance((prev) => ({ ...prev, amount: toNumber(event.target.value) }))}
            />
          </label>
          <label className="budget-field">
            <span className="budget-field-label">تاريخ التسوية</span>
            <input
              className="budget-input"
              type="date"
              value={newAdvance.dueDate}
              disabled={!permissions.request_advance}
              onChange={(event) => setNewAdvance((prev) => ({ ...prev, dueDate: event.target.value }))}
            />
          </label>
          <div className="advance-create-action">
            <button
              className="oms-btn oms-btn-primary"
              type="button"
              onClick={handleCreateAdvance}
              disabled={!canSubmitAdvance}
            >
              تسجيل طلب عهدة
            </button>
          </div>
        </div>

        {isAdvanceAmountOverLine ? (
          <div className="budget-inline-warning">
            المبلغ المطلوب أعلى من المتاح في البند. المتاح الحالي: {formatCurrency(Math.max(0, selectedLineAvailable))}.
          </div>
        ) : null}

        {isSelectedLineExhausted || isAdvanceAmountOverLine ? (
          <div className="budget-increase-cta">
            <div className="budget-increase-cta-text">
              {isSelectedLineExhausted
                ? "تم استنفاذ المبلغ المخطط للبند. يمكنك رفع طلب زيادة ميزانية لهذا البند."
                : "لا يمكن إنشاء عهدة بهذا المبلغ قبل اعتماد زيادة على ميزانية البند."}
            </div>
            <button
              className="oms-btn oms-btn-ghost"
              type="button"
              onClick={() => setShowIncreaseForm((prev) => !prev)}
              disabled={!permissions.request_budget_increase}
            >
              {showIncreaseForm ? "إخفاء طلب رفع الميزانية" : "طلب رفع ميزانية البند"}
            </button>
          </div>
        ) : null}

        {showIncreaseForm ? (
          <div className="increase-request-form">
            <label className="budget-field">
              <span className="budget-field-label">البند</span>
              <select
                className="budget-input"
                value={newIncrease.lineId}
                disabled={!permissions.request_budget_increase}
                onChange={(event) => setNewIncrease((prev) => ({ ...prev, lineId: event.target.value }))}
              >
                <option value="">اختر البند</option>
                {lineOptions.map((line) => (
                  <option key={line.id} value={line.id}>
                    {line.title}
                  </option>
                ))}
              </select>
            </label>
            <label className="budget-field">
              <span className="budget-field-label">مقدار الزيادة المطلوبة</span>
              <input
                className="budget-input"
                type="number"
                min={0}
                value={newIncrease.amount}
                disabled={!permissions.request_budget_increase}
                onChange={(event) => setNewIncrease((prev) => ({ ...prev, amount: toNumber(event.target.value) }))}
              />
            </label>
            <label className="budget-field">
              <span className="budget-field-label">مبرر الطلب</span>
              <input
                className="budget-input"
                value={newIncrease.reason}
                disabled={!permissions.request_budget_increase}
                onChange={(event) => setNewIncrease((prev) => ({ ...prev, reason: event.target.value }))}
                placeholder="ارتفاع أسعار/بند إضافي/تعديل نطاق..."
              />
            </label>
            <div className="increase-request-actions">
              <button
                className="oms-btn oms-btn-primary"
                type="button"
                onClick={createBudgetIncreaseRequest}
                disabled={
                  !permissions.request_budget_increase ||
                  !newIncrease.lineId ||
                  newIncrease.amount <= 0 ||
                  newIncrease.reason.trim().length < 6
                }
              >
                تسجيل طلب رفع الميزانية
              </button>
            </div>
          </div>
        ) : null}

        <div className="advance-list">
          <div className="advance-list-head">
            <h3 className="advance-list-title">العهد المفتوحة</h3>
            <div className="advance-list-meta">عددها: {toArabicNumber(activeAdvances.length)}</div>
          </div>
          {activeAdvances.length === 0 ? (
            <div className="workflow-empty">لا توجد عهد مفتوحة حاليًا. أضف أول طلب عهدة من النموذج أعلاه.</div>
          ) : (
            activeAdvances.map((item) => {
              const lineTitle = lines.find((line) => line.id === item.lineId)?.title || "بند محذوف";
              const overdue = isOverdue(item);
              return (
                <article key={item.id} className={`advance-row ${overdue ? "is-overdue" : ""}`}>
                  <div className="advance-row-head">
                    <div className="advance-title">{item.holder}</div>
                    <span className={`advance-status ${advanceStatusClass(item.status)}`}>{item.status}</span>
                  </div>
                  <div className="advance-meta">
                    بند: {lineTitle} · مبلغ الطلب: {formatCurrency(item.requestedAmount)} · المعتمد:{" "}
                    {formatCurrency(item.approvedAmount)}
                  </div>
                  <div className="advance-meta">
                    الغرض: {item.purpose || "غير مذكور"} · تاريخ التسوية: {item.dueDate || "غير محدد"}
                    {overdue ? " · متأخرة" : ""}
                  </div>
                  <div className="advance-actions">
                    {item.status === "طلب جديد" ? (
                      <>
                        <button
                          className="oms-btn oms-btn-primary"
                          type="button"
                          onClick={() => approveAdvance(item.id)}
                          disabled={!permissions.approve_advance}
                        >
                          اعتماد العهدة
                        </button>
                        <button
                          className="oms-btn oms-btn-ghost"
                          type="button"
                          onClick={() => cancelAdvance(item.id)}
                          disabled={!permissions.cancel_advance}
                        >
                          إلغاء الطلب
                        </button>
                      </>
                    ) : null}

                    {item.status === "معتمدة" ? (
                      <>
                        <button
                          className="oms-btn oms-btn-primary"
                          type="button"
                          onClick={() => disburseAdvance(item.id)}
                          disabled={!permissions.disburse_advance}
                        >
                          تأكيد الصرف
                        </button>
                        <button
                          className="oms-btn oms-btn-ghost"
                          type="button"
                          onClick={() => cancelAdvance(item.id)}
                          disabled={!permissions.cancel_advance}
                        >
                          إلغاء العهدة
                        </button>
                      </>
                    ) : null}

                    {item.status === "مصروفة" ? (
                      <>
                        <label className="budget-field advance-settle-field">
                          <span className="budget-field-label">المصروف الفعلي عند التسوية</span>
                          <input
                            className="budget-input"
                            type="number"
                            min={0}
                            value={settleInputs[item.id] ?? item.approvedAmount}
                            disabled={!permissions.settle_advance}
                            onChange={(event) =>
                              setSettleInputs((prev) => ({
                                ...prev,
                                [item.id]: toNumber(event.target.value),
                              }))
                            }
                          />
                        </label>
                        <button
                          className="oms-btn oms-btn-primary"
                          type="button"
                          onClick={() => settleAdvance(item.id)}
                          disabled={!permissions.settle_advance}
                        >
                          تسوية العهدة
                        </button>
                      </>
                    ) : null}
                  </div>
                </article>
              );
            })
          )}
        </div>

        <button
          className="budget-subsection-toggle"
          type="button"
          aria-expanded={isArchivedAdvancesExpanded}
          onClick={() => setIsArchivedAdvancesExpanded((prev) => !prev)}
        >
          <div className="audit-toggle-main">
            <h3 className="oms-section-title">العهد المؤرشفة</h3>
            <div className="audit-toggle-meta">
              إجمالي المؤرشف: {toArabicNumber(archivedAdvances.length)} · مسواة:{" "}
              {toArabicNumber(archivedAdvances.filter((item) => item.status === "مسواة").length)} · ملغاة:{" "}
              {toArabicNumber(archivedAdvances.filter((item) => item.status === "ملغاة").length)}
            </div>
          </div>
          <span className={`audit-chevron ${isArchivedAdvancesExpanded ? "is-open" : ""}`}>⌄</span>
        </button>
        {isArchivedAdvancesExpanded ? (
          <div className="advance-list is-archived">
            {archivedAdvances.length === 0 ? (
              <div className="workflow-empty">لا توجد عهد مؤرشفة حتى الآن.</div>
            ) : (
              archivedAdvances.map((item) => {
                const lineTitle = lines.find((line) => line.id === item.lineId)?.title || "بند محذوف";
                return (
                  <article key={item.id} className="advance-row is-archived">
                    <div className="advance-row-head">
                      <div className="advance-title">{item.holder}</div>
                      <span className={`advance-status ${advanceStatusClass(item.status)}`}>{item.status}</span>
                    </div>
                    <div className="advance-meta">
                      بند: {lineTitle} · مبلغ الطلب: {formatCurrency(item.requestedAmount)} · المعتمد:{" "}
                      {formatCurrency(item.approvedAmount)}
                    </div>
                    <div className="advance-meta">
                      الغرض: {item.purpose || "غير مذكور"} · تاريخ التسوية: {item.dueDate || "غير محدد"}
                    </div>
                    {item.status === "مسواة" ? (
                      <div className="advance-settled-note">
                        تمت التسوية بمبلغ {formatCurrency(item.settledAmount)} · المرتجع{" "}
                        {formatCurrency(Math.max(0, item.approvedAmount - item.settledAmount))}
                      </div>
                    ) : (
                      <div className="advance-archived-note">تم إلغاء العهدة وأرشفتها بدون تأثير على المصروف الفعلي.</div>
                    )}
                  </article>
                );
              })
            )}
          </div>
        ) : null}

        <button
          className="budget-subsection-toggle"
          type="button"
          aria-expanded={isIncreaseSectionExpanded}
          onClick={() => setIsIncreaseSectionExpanded((prev) => !prev)}
        >
          <div className="audit-toggle-main">
            <h3 className="oms-section-title">طلبات رفع ميزانية البنود</h3>
            <div className="audit-toggle-meta">
              إجمالي الطلبات: {toArabicNumber(budgetIncreases.length)} · طلبات مفتوحة:{" "}
              {toArabicNumber(summary.openIncreaseRequests)}
            </div>
          </div>
          <span className={`audit-chevron ${isIncreaseSectionExpanded ? "is-open" : ""}`}>⌄</span>
        </button>
        {isIncreaseSectionExpanded ? (
          <div className="increase-list">
            {budgetIncreases.length === 0 ? (
              <div className="workflow-empty">لا توجد طلبات رفع ميزانية حتى الآن.</div>
            ) : (
              budgetIncreases.map((request) => {
                const lineTitle = lines.find((line) => line.id === request.lineId)?.title || "بند محذوف";
                return (
                  <article key={request.id} className="increase-item">
                    <div className="increase-item-head">
                      <div className="increase-item-title">{lineTitle}</div>
                      <span className={`increase-status ${budgetIncreaseStatusClass(request.status)}`}>
                        {request.status}
                      </span>
                    </div>
                    <div className="increase-item-meta">
                      طالب الرفع: {request.requestedBy} · المبلغ المطلوب: {formatCurrency(request.requestedAmount)} ·
                      المعتمد: {formatCurrency(request.approvedAmount)}
                    </div>
                    <div className="increase-item-meta">المبرر: {request.reason}</div>
                    <div className="increase-item-meta">تاريخ الطلب: {request.requestedAt}</div>
                    <div className="increase-actions">
                      {request.status === "طلب جديد" ? (
                        <button
                          className="oms-btn oms-btn-ghost"
                          type="button"
                          onClick={() => startBudgetIncreaseReview(request.id)}
                          disabled={!permissions.approve_budget_increase}
                        >
                          بدء المراجعة
                        </button>
                      ) : null}
                      {request.status === "تحت المراجعة" ? (
                        <>
                          <button
                            className="oms-btn oms-btn-primary"
                            type="button"
                            onClick={() => approveBudgetIncrease(request.id)}
                            disabled={!permissions.approve_budget_increase}
                          >
                            اعتماد طلب الرفع
                          </button>
                          <button
                            className="oms-btn oms-btn-ghost"
                            type="button"
                            onClick={() => rejectBudgetIncrease(request.id)}
                            disabled={!permissions.approve_budget_increase}
                          >
                            رفض الطلب
                          </button>
                        </>
                      ) : null}
                      {request.status === "معتمد" ? (
                        <button
                          className="oms-btn oms-btn-primary"
                          type="button"
                          onClick={() => executeBudgetIncrease(request.id)}
                          disabled={!permissions.execute_budget_increase}
                        >
                          تنفيذ الرفع على البند
                        </button>
                      ) : null}
                    </div>
                  </article>
                );
              })
            )}
          </div>
        ) : null}
        <div className="budget-foot-note">
          {lastSavedAt ? `آخر حفظ تلقائي: ${lastSavedAt}` : "الحفظ التلقائي يعمل عند أي تعديل."}
        </div>
      </section>

      <section className="oms-panel">
        <button
          className="audit-toggle"
          type="button"
          aria-expanded={isAuditExpanded}
          onClick={() => setIsAuditExpanded((prev) => !prev)}
        >
          <div className="audit-toggle-main">
            <h2 className="oms-section-title">سجل التدقيق المالي</h2>
            <div className="audit-toggle-meta">
              عدد الأحداث: {toArabicNumber(auditTrail.length)} · آخر حدث: {latestAuditTime}
            </div>
          </div>
          <span className={`audit-chevron ${isAuditExpanded ? "is-open" : ""}`}>⌄</span>
        </button>

        {isAuditExpanded ? (
          <>
            <p className="oms-text">توثيق زمني لكل إجراءات العهد والصلاحيات على مستوى المشروع الحالي.</p>
            <div className="audit-filter-row">
              {auditFilterButtons.map((filter) => (
                <button
                  key={filter.key}
                  className={`audit-filter-btn ${auditFilter === filter.key ? "is-active" : ""}`}
                  type="button"
                  onClick={() => {
                    setAuditFilter(filter.key);
                    setVisibleAuditCount(8);
                  }}
                >
                  {filter.label}
                </button>
              ))}
            </div>
            <div className="audit-list">
              {filteredAuditTrail.length === 0 ? (
                <div className="workflow-empty">لا توجد أحداث ضمن الفلتر الحالي.</div>
              ) : (
                visibleAuditEntries.map((entry) => (
                  <article key={entry.id} className="audit-item">
                    <div className="audit-item-head">
                      <div className="audit-action">{entry.action}</div>
                      <div className="audit-time">{entry.createdAt}</div>
                    </div>
                    <div className="audit-meta">
                      بواسطة: {entry.actorLabel} · الدور: {userRoleLabel(entry.actorRole)}
                    </div>
                    <div className="audit-details">{entry.details}</div>
                  </article>
                ))
              )}
            </div>
            {canLoadMoreAudit ? (
              <div className="audit-more">
                <button
                  className="oms-btn oms-btn-ghost"
                  type="button"
                  onClick={() => setVisibleAuditCount((prev) => prev + 8)}
                >
                  عرض المزيد
                </button>
              </div>
            ) : null}
          </>
        ) : null}
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
        .budget-alert-banner {
          margin-top: 10px;
          border: 1px solid rgba(232, 182, 102, 0.52);
          border-radius: var(--oms-radius-sm);
          background: linear-gradient(180deg, rgba(53, 39, 14, 0.72), rgba(28, 20, 10, 0.72));
          color: #ffd996;
          padding: 10px;
          font-size: 13px;
          line-height: 1.7;
        }

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
          grid-template-columns: repeat(6, minmax(0, 1fr));
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
          min-width: 0;
        }

        .budget-field-label {
          font-size: 12px;
          font-weight: 800;
          color: var(--oms-text-faint);
        }

        .budget-field-hint {
          color: var(--oms-text-faint);
          font-size: 12px;
          line-height: 1.6;
        }

        .budget-field-alert {
          color: #ffb8a4;
          font-size: 12px;
          font-weight: 700;
          line-height: 1.6;
        }

        .budget-input {
          min-height: 40px;
          border-radius: var(--oms-radius-sm);
          border: 1px solid var(--oms-border-strong);
          background: rgba(8, 14, 26, 0.82);
          color: var(--oms-text);
          padding: 0 10px;
          font-size: 14px;
          width: 100%;
          max-width: 100%;
          min-width: 0;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
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

        .budget-advance-meta {
          color: var(--oms-text-faint);
          font-size: 13px;
        }

        .oms-btn:disabled {
          opacity: 0.45;
          cursor: not-allowed;
          filter: none;
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
          grid-template-columns: minmax(160px, 1fr) minmax(140px, 1fr) 130px 130px minmax(210px, 1fr) auto;
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

        .advance-create {
          margin-top: 10px;
          display: grid;
          grid-template-columns: repeat(5, minmax(0, 1fr));
          gap: 8px;
          align-items: end;
        }

        .advance-create-action {
          display: flex;
          grid-column: 1 / -1;
          justify-content: flex-start;
          min-width: 0;
        }

        .advance-create-action .oms-btn {
          width: auto;
          min-width: 220px;
          white-space: nowrap;
        }

        .budget-inline-warning {
          margin-top: 8px;
          border: 1px solid rgba(247, 106, 121, 0.55);
          border-radius: var(--oms-radius-sm);
          background: linear-gradient(180deg, rgba(56, 20, 30, 0.72), rgba(29, 14, 20, 0.72));
          color: #ffd6d9;
          padding: 10px;
          font-size: 13px;
          line-height: 1.7;
        }

        .budget-increase-cta {
          margin-top: 8px;
          border: 1px solid rgba(232, 182, 102, 0.55);
          border-radius: var(--oms-radius-md);
          background: linear-gradient(180deg, rgba(53, 39, 14, 0.62), rgba(26, 19, 10, 0.62));
          padding: 10px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          flex-wrap: wrap;
        }

        .budget-increase-cta-text {
          color: #ffd996;
          font-size: 13px;
          line-height: 1.7;
        }

        .increase-request-form {
          margin-top: 10px;
          border: 1px solid var(--oms-border);
          border-radius: var(--oms-radius-md);
          background: var(--oms-bg-card);
          padding: 10px;
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 8px;
          align-items: end;
        }

        .increase-request-actions {
          display: flex;
          grid-column: 1 / -1;
          justify-content: flex-start;
        }

        .budget-subsection-toggle {
          width: 100%;
          margin-top: 12px;
          border: 1px solid var(--oms-border-strong);
          border-radius: var(--oms-radius-md);
          background: linear-gradient(180deg, rgba(15, 26, 49, 0.8), rgba(9, 18, 35, 0.84));
          color: var(--oms-text);
          padding: 8px 12px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          text-align: inherit;
        }

        .increase-list {
          margin-top: 10px;
          display: grid;
          gap: 6px;
        }

        .increase-item {
          border: 1px solid var(--oms-border);
          border-radius: var(--oms-radius-md);
          background: var(--oms-bg-card);
          padding: 8px 10px;
          display: grid;
          gap: 4px;
        }

        .increase-item-head {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
          flex-wrap: wrap;
        }

        .increase-item-title {
          font-size: 16px;
          font-weight: 900;
        }

        .increase-item-meta {
          color: var(--oms-text-faint);
          font-size: 12px;
          line-height: 1.55;
        }

        .increase-status {
          min-height: 24px;
          border-radius: 999px;
          padding: 0 9px;
          border: 1px solid var(--oms-border-strong);
          font-size: 12px;
          font-weight: 800;
          display: inline-flex;
          align-items: center;
          white-space: nowrap;
        }

        .increase-status.is-new {
          border-color: rgba(130, 164, 255, 0.58);
          color: #bfd3ff;
          background: rgba(20, 34, 65, 0.72);
        }

        .increase-status.is-review {
          border-color: rgba(232, 182, 102, 0.58);
          color: #ffd996;
          background: rgba(66, 47, 20, 0.72);
        }

        .increase-status.is-approved {
          border-color: rgba(165, 120, 255, 0.58);
          color: #efe2ff;
          background: rgba(61, 27, 112, 0.72);
        }

        .increase-status.is-rejected {
          border-color: rgba(247, 106, 121, 0.58);
          color: #ffbcc4;
          background: rgba(70, 20, 33, 0.72);
        }

        .increase-status.is-executed {
          border-color: rgba(88, 214, 165, 0.62);
          color: #78e3b9;
          background: rgba(14, 56, 45, 0.78);
        }

        .increase-actions {
          margin-top: 2px;
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
        }

        .advance-list {
          margin-top: 10px;
          display: grid;
          gap: 6px;
        }

        .advance-list.is-archived {
          margin-top: 8px;
        }

        .advance-list-head {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
          margin-bottom: 2px;
        }

        .advance-list-title {
          margin: 0;
          font-size: 17px;
          font-weight: 900;
        }

        .advance-list-meta {
          color: var(--oms-text-faint);
          font-size: 12px;
          font-weight: 700;
        }

        .advance-row {
          border: 1px solid var(--oms-border);
          border-radius: var(--oms-radius-md);
          background: var(--oms-bg-card);
          padding: 8px 10px;
          display: grid;
          gap: 4px;
        }

        .advance-row.is-overdue {
          border-color: rgba(247, 106, 121, 0.52);
          background: linear-gradient(180deg, rgba(56, 20, 30, 0.52), rgba(22, 13, 20, 0.62));
        }

        .advance-row.is-archived {
          background: linear-gradient(180deg, rgba(14, 24, 44, 0.86), rgba(10, 18, 34, 0.86));
        }

        .advance-row-head {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
        }

        .advance-title {
          font-size: 16px;
          font-weight: 900;
        }

        .advance-status {
          min-height: 24px;
          border-radius: 999px;
          padding: 0 9px;
          border: 1px solid var(--oms-border-strong);
          font-size: 12px;
          font-weight: 800;
          display: inline-flex;
          align-items: center;
          white-space: nowrap;
        }

        .advance-status.is-requested {
          border-color: rgba(130, 164, 255, 0.58);
          color: #bfd3ff;
          background: rgba(20, 34, 65, 0.72);
        }

        .advance-status.is-approved {
          border-color: rgba(232, 182, 102, 0.58);
          color: #ffd996;
          background: rgba(66, 47, 20, 0.72);
        }

        .advance-status.is-disbursed {
          border-color: rgba(165, 120, 255, 0.58);
          color: #efe2ff;
          background: rgba(61, 27, 112, 0.72);
        }

        .advance-status.is-settled {
          border-color: rgba(88, 214, 165, 0.62);
          color: #78e3b9;
          background: rgba(14, 56, 45, 0.78);
        }

        .advance-status.is-cancelled {
          border-color: rgba(174, 187, 206, 0.48);
          color: #d5deec;
          background: rgba(24, 32, 45, 0.76);
        }

        .advance-meta {
          color: var(--oms-text-faint);
          font-size: 12px;
          line-height: 1.55;
        }

        .advance-actions {
          margin-top: 2px;
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
          align-items: end;
        }

        .advance-settle-field {
          min-width: 220px;
        }

        .advance-settled-note {
          color: var(--oms-text-muted);
          font-size: 13px;
          line-height: 1.7;
        }

        .advance-archived-note {
          color: var(--oms-text-muted);
          font-size: 13px;
          line-height: 1.7;
        }

        .budget-foot-note {
          margin-top: 10px;
          font-size: 12px;
          color: var(--oms-text-faint);
        }

        .audit-list {
          margin-top: 10px;
          display: grid;
          gap: 8px;
        }

        .audit-toggle {
          width: 100%;
          border: 1px solid var(--oms-border-strong);
          border-radius: var(--oms-radius-md);
          background: linear-gradient(180deg, rgba(17, 29, 53, 0.82), rgba(10, 18, 34, 0.82));
          color: var(--oms-text);
          padding: 8px 12px;
          min-height: 54px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          text-align: inherit;
        }

        .audit-toggle-main {
          display: grid;
          gap: 4px;
          text-align: inherit;
        }

        .audit-toggle-main .oms-section-title {
          margin: 0;
        }

        .audit-toggle-meta {
          color: var(--oms-text-faint);
          font-size: 12px;
          font-weight: 700;
          line-height: 1.7;
        }

        .audit-chevron {
          flex: 0 0 26px;
          align-self: center;
          width: 26px;
          height: 26px;
          border-radius: 999px;
          border: 1px solid var(--oms-border-strong);
          background: rgba(11, 20, 38, 0.84);
          display: inline-flex;
          align-items: center;
          justify-content: center;
          font-size: 16px;
          transition: transform 180ms ease;
        }

        .audit-chevron.is-open {
          transform: rotate(180deg);
        }

        .audit-filter-row {
          margin-top: 8px;
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }

        .audit-filter-btn {
          min-height: 32px;
          border-radius: 999px;
          border: 1px solid var(--oms-border-strong);
          background: rgba(10, 18, 34, 0.84);
          color: var(--oms-text-muted);
          padding: 0 12px;
          font-size: 12px;
          font-weight: 800;
          line-height: 1;
          display: inline-flex;
          align-items: center;
          justify-content: center;
        }

        .audit-filter-btn.is-active {
          border-color: rgba(167, 115, 255, 0.72);
          background: linear-gradient(180deg, rgba(128, 69, 242, 0.92), rgba(101, 55, 198, 0.88));
          color: #f7f0ff;
        }

        .audit-more {
          margin-top: 10px;
          display: flex;
          justify-content: center;
        }

        .audit-item {
          border: 1px solid var(--oms-border);
          border-radius: var(--oms-radius-md);
          background: var(--oms-bg-card);
          padding: 10px;
          display: grid;
          gap: 4px;
        }

        .audit-item-head {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
          flex-wrap: wrap;
        }

        .audit-action {
          font-size: 15px;
          font-weight: 900;
        }

        .audit-time,
        .audit-meta {
          color: var(--oms-text-faint);
          font-size: 12px;
        }

        .audit-details {
          color: var(--oms-text-muted);
          font-size: 13px;
          line-height: 1.7;
        }

        .budget-footer-actions {
          margin-top: 10px;
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
        }

        @media (max-width: 1220px) {
          .budget-top-grid {
            grid-template-columns: 1fr;
          }

          .budget-kpi-grid {
            grid-template-columns: repeat(3, minmax(0, 1fr));
          }

          .advance-create {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }

          .increase-request-form {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }

          .budget-row {
            grid-template-columns: repeat(2, minmax(0, 1fr));
            align-items: stretch;
          }
        }

        @media (max-width: 720px) {
          .budget-kpi-grid,
          .budget-revenue-grid,
          .budget-row,
          .advance-create,
          .increase-request-form {
            grid-template-columns: 1fr;
          }

          .budget-lines-actions,
          .advance-actions,
          .budget-footer-actions,
          .increase-actions,
          .audit-filter-row {
            display: grid;
          }

          .budget-lines-actions .oms-btn,
          .advance-actions .oms-btn,
          .budget-footer-actions .oms-btn,
          .advance-create-action .oms-btn,
          .audit-filter-btn {
            width: 100%;
            justify-content: center;
          }
        }
      `}</style>
    </main>
  );

  function appendAudit(
    action: BudgetAuditAction,
    details: string,
    refs: { advanceId?: string; lineId?: string } = {}
  ) {
    const entry: BudgetAuditEntry = {
      id: randomId(),
      action,
      details,
      actorRole: currentRole,
      actorLabel: currentRoleLabel,
      createdAt: nowDateTimeLabel(),
      ...refs,
    };
    setAuditTrail((prev) => [entry, ...prev].slice(0, 200));
  }

  function ensurePermission(scope: PermissionScope) {
    if (permissions[scope]) return true;
    const message = `غير مسموح: ${PERMISSION_SCOPE_LABELS[scope]} غير متاحة لدور ${currentRoleLabel}.`;
    setAlertMessage(message);
    appendAudit("رفض إجراء بسبب الصلاحيات", message);
    return false;
  }

  function updateLine(lineId: string, patch: Partial<BudgetLine>) {
    if (!permissions.edit_budget_lines) return;
    setLines((prev) => prev.map((row) => (row.id === lineId ? { ...row, ...patch } : row)));
  }

  function removeLine(lineId: string) {
    if (!ensurePermission("edit_budget_lines")) return;
    if (lines.length <= 1) {
      setAlertMessage("لا يمكن حذف آخر بند في الميزانية.");
      return;
    }
    const lineTitle = lines.find((row) => row.id === lineId)?.title || "بند غير معروف";
    const hasOpenAdvance = advances.some((row) => row.lineId === lineId && isOpenAdvance(row));
    if (hasOpenAdvance) {
      setAlertMessage("لا يمكن حذف بند لديه عهد مفتوحة. قم بتسوية العهد أو إلغائها أولاً.");
      return;
    }
    const hasOpenIncreaseRequest = budgetIncreases.some(
      (row) =>
        row.lineId === lineId &&
        (row.status === "طلب جديد" || row.status === "تحت المراجعة" || row.status === "معتمد")
    );
    if (hasOpenIncreaseRequest) {
      setAlertMessage("لا يمكن حذف بند لديه طلبات رفع ميزانية مفتوحة أو معتمدة غير منفذة.");
      return;
    }
    setLines((prev) => prev.filter((row) => row.id !== lineId));
    appendAudit("حذف بند ميزانية", `تم حذف بند الميزانية: ${lineTitle}.`, { lineId });
  }

  function handleAddLine() {
    if (!ensurePermission("edit_budget_lines")) return;
    const newLineId = randomId();
    setLines((prev) => [
      ...prev,
      {
        id: newLineId,
        title: "بند إضافي",
        owner: "غير محدد",
        planned: 0,
        actual: 0,
      },
    ]);
    appendAudit("إضافة بند ميزانية", "تمت إضافة بند ميزانية جديد.", { lineId: newLineId });
  }

  function handleAutoDistribute() {
    if (!ensurePermission("edit_budget_lines")) return;
    const next = defaultLines(projectBudget);
    setLines(next);
    appendAudit("توزيع تلقائي لبنود الميزانية", "تمت إعادة توزيع بنود الميزانية تلقائيًا.");
  }

  function lineAvailable(lineId: string) {
    const line = lines.find((row) => row.id === lineId);
    if (!line) return 0;
    const reserved = activeReservedByLine[lineId] ?? 0;
    return positive(line.planned) - positive(line.actual) - reserved;
  }

  function createBudgetIncreaseRequest() {
    if (!ensurePermission("request_budget_increase")) return;
    const lineId = newIncrease.lineId;
    if (!lineId) {
      setAlertMessage("اختر البند قبل تسجيل طلب رفع الميزانية.");
      return;
    }
    if (newIncrease.amount <= 0) {
      setAlertMessage("قيمة رفع الميزانية يجب أن تكون أكبر من صفر.");
      return;
    }
    if (newIncrease.reason.trim().length < 6) {
      setAlertMessage("اكتب مبررًا واضحًا لطلب رفع الميزانية.");
      return;
    }

    const lineTitle = lines.find((row) => row.id === lineId)?.title || "بند غير معروف";
    const request: BudgetIncreaseRequest = {
      id: randomId(),
      lineId,
      requestedBy: currentRoleLabel,
      requestedAmount: newIncrease.amount,
      approvedAmount: 0,
      reason: newIncrease.reason.trim(),
      status: "طلب جديد",
      requestedAt: nowDateTimeLabel(),
      reviewedAt: "",
      reviewedBy: "",
      notes: "",
      updatedAt: nowDateTimeLabel(),
    };

    setBudgetIncreases((prev) => [request, ...prev]);
    appendAudit(
      "إنشاء طلب رفع ميزانية بند",
      `تم إنشاء طلب رفع ميزانية للبند ${lineTitle} بقيمة ${formatCurrency(request.requestedAmount)}.`,
      { lineId, advanceId: request.id }
    );
    setShowIncreaseForm(false);
    setNewIncrease((prev) => ({ ...prev, amount: 0, reason: "" }));
    setAlertMessage("تم تسجيل طلب رفع ميزانية البند وبانتظار المراجعة.");
  }

  function startBudgetIncreaseReview(requestId: string) {
    if (!ensurePermission("approve_budget_increase")) return;
    const request = budgetIncreases.find((item) => item.id === requestId);
    if (!request || request.status !== "طلب جديد") return;
    const now = nowDateTimeLabel();
    setBudgetIncreases((prev) =>
      prev.map((item) =>
        item.id === requestId
          ? {
              ...item,
              status: "تحت المراجعة",
              reviewedAt: now,
              reviewedBy: currentRoleLabel,
              updatedAt: now,
            }
          : item
      )
    );
    appendAudit("بدء مراجعة طلب رفع ميزانية", `تم فتح مراجعة طلب رفع الميزانية رقم ${requestId}.`, {
      lineId: request.lineId,
      advanceId: request.id,
    });
    setAlertMessage("تم تحويل طلب رفع الميزانية إلى تحت المراجعة.");
  }

  function approveBudgetIncrease(requestId: string) {
    if (!ensurePermission("approve_budget_increase")) return;
    const request = budgetIncreases.find((item) => item.id === requestId);
    if (!request || request.status !== "تحت المراجعة") return;
    const now = nowDateTimeLabel();
    setBudgetIncreases((prev) =>
      prev.map((item) =>
        item.id === requestId
          ? {
              ...item,
              status: "معتمد",
              approvedAmount: item.requestedAmount,
              reviewedAt: now,
              reviewedBy: currentRoleLabel,
              updatedAt: now,
            }
          : item
      )
    );
    appendAudit(
      "اعتماد طلب رفع ميزانية",
      `تم اعتماد رفع ميزانية بقيمة ${formatCurrency(request.requestedAmount)}.`,
      { lineId: request.lineId, advanceId: request.id }
    );
    setAlertMessage("تم اعتماد طلب رفع الميزانية. نفّذ الرفع لتحديث البند.");
  }

  function rejectBudgetIncrease(requestId: string) {
    if (!ensurePermission("approve_budget_increase")) return;
    const request = budgetIncreases.find((item) => item.id === requestId);
    if (!request || request.status !== "تحت المراجعة") return;
    const now = nowDateTimeLabel();
    setBudgetIncreases((prev) =>
      prev.map((item) =>
        item.id === requestId
          ? {
              ...item,
              status: "مرفوض",
              reviewedAt: now,
              reviewedBy: currentRoleLabel,
              notes: "تم الرفض أثناء المراجعة.",
              updatedAt: now,
            }
          : item
      )
    );
    appendAudit("رفض طلب رفع ميزانية", `تم رفض طلب رفع ميزانية رقم ${requestId}.`, {
      lineId: request.lineId,
      advanceId: request.id,
    });
    setAlertMessage("تم رفض طلب رفع الميزانية.");
  }

  function executeBudgetIncrease(requestId: string) {
    if (!ensurePermission("execute_budget_increase")) return;
    const request = budgetIncreases.find((item) => item.id === requestId);
    if (!request || request.status !== "معتمد" || request.approvedAmount <= 0) return;

    setLines((prev) =>
      prev.map((line) =>
        line.id === request.lineId
          ? {
              ...line,
              planned: positive(line.planned) + positive(request.approvedAmount),
            }
          : line
      )
    );

    const now = nowDateTimeLabel();
    setBudgetIncreases((prev) =>
      prev.map((item) =>
        item.id === requestId
          ? {
              ...item,
              status: "منفذ",
              updatedAt: now,
              notes: "تم التنفيذ وإضافة الرفع على الميزانية المخططة للبند.",
            }
          : item
      )
    );
    appendAudit(
      "تنفيذ رفع ميزانية بند",
      `تم تنفيذ رفع ميزانية بقيمة ${formatCurrency(request.approvedAmount)} على بند المشروع.`,
      { lineId: request.lineId, advanceId: request.id }
    );
    setAlertMessage("تم تنفيذ رفع الميزانية وتحديث المبلغ المخطط للبند.");
  }

  function handleCreateAdvance() {
    if (!ensurePermission("request_advance")) return;
    const holderName = newAdvance.holder.trim();
    const purposeText = newAdvance.purpose.trim();

    if (!newAdvance.lineId) {
      setAlertMessage("اختر بند الميزانية قبل إنشاء طلب عهدة.");
      return;
    }
    if (holderName.length < 2) {
      setAlertMessage("أدخل اسم مسؤول العهدة بشكل واضح.");
      return;
    }
    if (newAdvance.amount <= 0) {
      setAlertMessage("قيمة طلب العهدة يجب أن تكون أكبر من صفر.");
      return;
    }
    if (!newAdvance.dueDate) {
      setAlertMessage("حدد تاريخ تسوية العهدة.");
      return;
    }

    if (blockedHolders.has(normalizeKey(holderName))) {
      setAlertMessage("لا يمكن إنشاء عهدة جديدة لنفس المسؤول قبل تسوية العهدة المفتوحة.");
      return;
    }

    const lineBudgetAvailable = lineAvailable(newAdvance.lineId);
    if (lineBudgetAvailable <= 0) {
      const message = "تم استنفاذ المبلغ المخطط للبند. ارفع طلب زيادة ميزانية أولًا.";
      setAlertMessage(message);
      appendAudit("رفض طلب عهدة بسبب عدم كفاية البند", message, { lineId: newAdvance.lineId });
      setShowIncreaseForm(true);
      setNewIncrease((prev) => ({
        ...prev,
        lineId: newAdvance.lineId,
        amount: prev.amount > 0 ? prev.amount : Math.max(1000, newAdvance.amount),
      }));
      return;
    }
    if (newAdvance.amount > lineBudgetAvailable) {
      const message = `المبلغ المطلوب يتجاوز المتاح في البند. المتاح الحالي: ${formatCurrency(Math.max(
        0,
        lineBudgetAvailable
      ))}.`;
      setAlertMessage(message);
      appendAudit("رفض طلب عهدة بسبب عدم كفاية البند", message, { lineId: newAdvance.lineId });
      setShowIncreaseForm(true);
      setNewIncrease((prev) => ({
        ...prev,
        lineId: newAdvance.lineId,
        amount: prev.amount > 0 ? prev.amount : Math.max(1000, newAdvance.amount - lineBudgetAvailable),
      }));
      return;
    }

    const now = nowTimeLabel();
    const record: BudgetAdvance = {
      id: randomId(),
      lineId: newAdvance.lineId,
      holder: holderName,
      purpose: purposeText,
      requestedAmount: newAdvance.amount,
      approvedAmount: 0,
      settledAmount: 0,
      status: "طلب جديد",
      requestedAt: now,
      dueDate: newAdvance.dueDate,
      updatedAt: now,
    };

    setAdvances((prev) => [record, ...prev]);
    appendAudit(
      "إنشاء طلب عهدة",
      `تم إنشاء طلب عهدة لصاحب العهدة ${holderName} بقيمة ${formatCurrency(record.requestedAmount)}.`,
      { advanceId: record.id, lineId: record.lineId }
    );
    setAlertMessage("تم تسجيل طلب العهدة. يلزم الاعتماد قبل الصرف.");
    setNewAdvance((prev) => ({
      ...prev,
      holder: "",
      purpose: "",
      amount: 0,
      dueDate: addDaysIso(todayIso(), 7),
    }));
  }

  function approveAdvance(advanceId: string) {
    if (!ensurePermission("approve_advance")) return;
    const item = advances.find((row) => row.id === advanceId);
    if (!item || item.status !== "طلب جديد") return;

    const available = lineAvailableExcluding(advanceId, item.lineId);
    if (item.requestedAmount > available) {
      setAlertMessage(`لا يمكن الاعتماد: المتاح في البند ${formatCurrency(Math.max(0, available))} فقط.`);
      return;
    }

    const now = nowTimeLabel();
    setAdvances((prev) =>
      prev.map((row) =>
        row.id === advanceId
          ? {
              ...row,
              status: "معتمدة",
              approvedAmount: row.requestedAmount,
              updatedAt: now,
            }
          : row
      )
    );
    appendAudit(
      "اعتماد عهدة",
      `تم اعتماد عهدة ${item.holder} بقيمة ${formatCurrency(item.requestedAmount)}.`,
      { advanceId: item.id, lineId: item.lineId }
    );
    setAlertMessage("تم اعتماد العهدة وحجز قيمتها من البند.");
  }

  function disburseAdvance(advanceId: string) {
    if (!ensurePermission("disburse_advance")) return;
    const item = advances.find((row) => row.id === advanceId);
    if (!item || item.status !== "معتمدة") return;
    const now = nowTimeLabel();
    setAdvances((prev) =>
      prev.map((row) =>
        row.id === advanceId && row.status === "معتمدة"
          ? {
              ...row,
              status: "مصروفة",
              updatedAt: now,
            }
          : row
      )
    );
    appendAudit(
      "صرف عهدة",
      `تم تأكيد صرف عهدة ${item.holder} بقيمة ${formatCurrency(item.approvedAmount)}.`,
      { advanceId: item.id, lineId: item.lineId }
    );
    setAlertMessage("تم تسجيل صرف العهدة. يلزم التسوية لإقفالها.");
  }

  function settleAdvance(advanceId: string) {
    if (!ensurePermission("settle_advance")) return;
    const target = advances.find((row) => row.id === advanceId);
    if (!target || target.status !== "مصروفة") return;

    const settledValue = positive(settleInputs[advanceId] ?? target.approvedAmount);
    if (settledValue <= 0) {
      setAlertMessage("أدخل مبلغ التسوية الفعلي قبل إقفال العهدة.");
      return;
    }

    setLines((prev) =>
      prev.map((line) =>
        line.id === target.lineId
          ? {
              ...line,
              actual: positive(line.actual) + settledValue,
            }
          : line
      )
    );

    const now = nowTimeLabel();
    setAdvances((prev) =>
      prev.map((row) =>
        row.id === advanceId
          ? {
              ...row,
              status: "مسواة",
              settledAmount: settledValue,
              updatedAt: now,
            }
          : row
      )
    );

    setSettleInputs((prev) => {
      const next = { ...prev };
      delete next[advanceId];
      return next;
    });

    appendAudit(
      "تسوية عهدة",
      `تمت تسوية عهدة ${target.holder} بمبلغ ${formatCurrency(settledValue)}.`,
      { advanceId: target.id, lineId: target.lineId }
    );
    setAlertMessage("تمت تسوية العهدة وتحويلها إلى مصروف فعلي في البند.");
  }

  function cancelAdvance(advanceId: string) {
    if (!ensurePermission("cancel_advance")) return;
    const current = advances.find((row) => row.id === advanceId);
    if (!current) return;
    if (current.status === "مسواة" || current.status === "ملغاة") return;
    const now = nowTimeLabel();
    setAdvances((prev) =>
      prev.map((row) =>
        row.id === advanceId
          ? {
              ...row,
              status: "ملغاة",
              updatedAt: now,
            }
          : row
      )
    );
    setSettleInputs((prev) => {
      const next = { ...prev };
      delete next[advanceId];
      return next;
    });
    appendAudit(
      "إلغاء عهدة",
      `تم إلغاء عهدة ${current.holder} (حالتها قبل الإلغاء: ${current.status}).`,
      { advanceId: current.id, lineId: current.lineId }
    );
    setAlertMessage("تم إلغاء العهدة وأرشفتها.");
  }

  function lineAvailableExcluding(advanceId: string, lineId: string) {
    const line = lines.find((row) => row.id === lineId);
    if (!line) return 0;
    const reserved = advances.reduce((sum, row) => {
      if (row.id === advanceId) return sum;
      if (!isReservedAdvance(row)) return sum;
      if (row.lineId !== lineId) return sum;
      return sum + positive(row.approvedAmount);
    }, 0);
    return positive(line.planned) - positive(line.actual) - reserved;
  }
}

function readProjectContext(): ProjectContext {
  if (typeof window === "undefined") {
    return { id: "global", name: "مشروع غير محدد", budgetTarget: 0, role: "project_manager" };
  }

  try {
    const raw = localStorage.getItem(PROJECTS_REGISTRY_KEY);
    if (!raw) return { id: "global", name: "مشروع غير محدد", budgetTarget: 0, role: "project_manager" };

    const parsed = JSON.parse(raw) as {
      activeProjectId?: string;
      projects?: Array<{ id: string; name: string }>;
    };

    const projects = Array.isArray(parsed.projects) ? parsed.projects : [];
    const active = projects.find((item) => item.id === parsed.activeProjectId) ?? projects[0];
    if (!active) return { id: "global", name: "مشروع غير محدد", budgetTarget: 0, role: "project_manager" };

    const snapshotRaw = localStorage.getItem(`${PROJECT_DATA_KEY_PREFIX}${active.id}`);
    const snapshot = snapshotRaw ? (JSON.parse(snapshotRaw) as { budget?: string | number; userRole?: unknown }) : {};
    const budgetTarget = parseAmount(snapshot.budget);

    return {
      id: active.id,
      name: active.name?.trim() || "مشروع بدون اسم",
      budgetTarget,
      role: normalizeUserRole(snapshot.userRole),
    };
  } catch {
    return { id: "global", name: "مشروع غير محدد", budgetTarget: 0, role: "project_manager" };
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

    const normalizedAdvances = Array.isArray(parsed.advances)
      ? parsed.advances.map((item) => ({
          id: typeof item.id === "string" ? item.id : randomId(),
          lineId: typeof item.lineId === "string" ? item.lineId : "",
          holder: typeof item.holder === "string" ? item.holder : "غير محدد",
          purpose: typeof item.purpose === "string" ? item.purpose : "",
          requestedAmount: asNumber(item.requestedAmount),
          approvedAmount: asNumber(item.approvedAmount),
          settledAmount: asNumber(item.settledAmount),
          status: normalizeAdvanceStatus(item.status),
          requestedAt: typeof item.requestedAt === "string" ? item.requestedAt : "",
          dueDate: typeof item.dueDate === "string" ? item.dueDate : "",
          updatedAt: typeof item.updatedAt === "string" ? item.updatedAt : "",
        }))
      : [];

    const normalizedBudgetIncreases = Array.isArray(parsed.budgetIncreases)
      ? parsed.budgetIncreases.map((item) => ({
          id: typeof item.id === "string" ? item.id : randomId(),
          lineId: typeof item.lineId === "string" ? item.lineId : "",
          requestedBy: typeof item.requestedBy === "string" ? item.requestedBy : userRoleLabel("project_manager"),
          requestedAmount: asNumber(item.requestedAmount),
          approvedAmount: asNumber(item.approvedAmount),
          reason: typeof item.reason === "string" ? item.reason : "",
          status: normalizeIncreaseStatus(item.status),
          requestedAt: typeof item.requestedAt === "string" ? item.requestedAt : nowDateTimeLabel(),
          reviewedAt: typeof item.reviewedAt === "string" ? item.reviewedAt : "",
          reviewedBy: typeof item.reviewedBy === "string" ? item.reviewedBy : "",
          notes: typeof item.notes === "string" ? item.notes : "",
          updatedAt: typeof item.updatedAt === "string" ? item.updatedAt : nowDateTimeLabel(),
        }))
      : [];

    const normalizedAuditTrail = Array.isArray(parsed.auditTrail)
      ? parsed.auditTrail.map((entry) => ({
          id: typeof entry.id === "string" ? entry.id : randomId(),
          action: normalizeAuditAction(entry.action),
          details: typeof entry.details === "string" ? entry.details : "تم تنفيذ إجراء.",
          actorRole: normalizeUserRole(entry.actorRole),
          actorLabel: typeof entry.actorLabel === "string" ? entry.actorLabel : userRoleLabel("project_manager"),
          createdAt: typeof entry.createdAt === "string" ? entry.createdAt : nowDateTimeLabel(),
          advanceId: typeof entry.advanceId === "string" ? entry.advanceId : undefined,
          lineId: typeof entry.lineId === "string" ? entry.lineId : undefined,
        }))
      : [];

    return {
      lines: normalizedLines,
      advances: normalizedAdvances,
      budgetIncreases: normalizedBudgetIncreases,
      auditTrail: normalizedAuditTrail,
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

function asNumber(value: unknown) {
  if (typeof value !== "number" || Number.isNaN(value)) return 0;
  return Math.max(0, value);
}

function normalizeAdvanceStatus(value: unknown): AdvanceStatus {
  if (value === "معتمدة" || value === "مصروفة" || value === "مسواة" || value === "ملغاة") return value;
  return "طلب جديد";
}

function normalizeIncreaseStatus(value: unknown): BudgetIncreaseStatus {
  if (value === "تحت المراجعة" || value === "معتمد" || value === "مرفوض" || value === "منفذ") return value;
  return "طلب جديد";
}

function normalizeAuditAction(value: unknown): BudgetAuditAction {
  if (
    value === "إنشاء طلب عهدة" ||
    value === "رفض طلب عهدة بسبب عدم كفاية البند" ||
    value === "اعتماد عهدة" ||
    value === "صرف عهدة" ||
    value === "تسوية عهدة" ||
    value === "إلغاء عهدة" ||
    value === "إنشاء طلب رفع ميزانية بند" ||
    value === "بدء مراجعة طلب رفع ميزانية" ||
    value === "اعتماد طلب رفع ميزانية" ||
    value === "رفض طلب رفع ميزانية" ||
    value === "تنفيذ رفع ميزانية بند" ||
    value === "إضافة بند ميزانية" ||
    value === "حذف بند ميزانية" ||
    value === "توزيع تلقائي لبنود الميزانية" ||
    value === "رفض إجراء بسبب الصلاحيات"
  ) {
    return value;
  }
  return "إنشاء طلب عهدة";
}

function normalizeUserRole(value: unknown): UserRole {
  if (value === "operations_manager" || value === "finance_manager" || value === "viewer") return value;
  return "project_manager";
}

function userRoleLabel(role: UserRole) {
  if (role === "operations_manager") return "مدير التشغيل";
  if (role === "finance_manager") return "المدير المالي";
  if (role === "viewer") return "مشاهد";
  return "مدير المشروع";
}

function permissionFlag(label: string, allowed: boolean) {
  return `${label}: ${allowed ? "مسموح" : "غير مسموح"}`;
}

function isReservedAdvance(item: BudgetAdvance) {
  return item.status === "معتمدة" || item.status === "مصروفة";
}

function isClosedAdvance(item: BudgetAdvance) {
  return item.status === "مسواة" || item.status === "ملغاة";
}

function isOpenAdvance(item: BudgetAdvance) {
  return !isClosedAdvance(item);
}

function isOverdue(item: BudgetAdvance) {
  if (isClosedAdvance(item)) return false;
  if (!item.dueDate) return false;
  return item.dueDate < todayIso();
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

function advanceStatusClass(status: AdvanceStatus) {
  if (status === "معتمدة") return "is-approved";
  if (status === "مصروفة") return "is-disbursed";
  if (status === "مسواة") return "is-settled";
  if (status === "ملغاة") return "is-cancelled";
  return "is-requested";
}

function budgetIncreaseStatusClass(status: BudgetIncreaseStatus) {
  if (status === "تحت المراجعة") return "is-review";
  if (status === "معتمد") return "is-approved";
  if (status === "مرفوض") return "is-rejected";
  if (status === "منفذ") return "is-executed";
  return "is-new";
}

function matchesAuditFilter(entry: BudgetAuditEntry, filter: AuditFilter) {
  if (filter === "all") return true;
  if (filter === "permissions") return entry.action === "رفض إجراء بسبب الصلاحيات";
  if (filter === "advances") {
    return (
      entry.action === "إنشاء طلب عهدة" ||
      entry.action === "رفض طلب عهدة بسبب عدم كفاية البند" ||
      entry.action === "اعتماد عهدة" ||
      entry.action === "صرف عهدة" ||
      entry.action === "تسوية عهدة" ||
      entry.action === "إلغاء عهدة"
    );
  }
  if (filter === "increases") {
    return (
      entry.action === "إنشاء طلب رفع ميزانية بند" ||
      entry.action === "بدء مراجعة طلب رفع ميزانية" ||
      entry.action === "اعتماد طلب رفع ميزانية" ||
      entry.action === "رفض طلب رفع ميزانية" ||
      entry.action === "تنفيذ رفع ميزانية بند"
    );
  }
  return true;
}

function normalizeKey(value: string) {
  return value.trim().toLowerCase();
}

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function addDaysIso(baseIso: string, days: number) {
  const d = new Date(baseIso);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function nowTimeLabel() {
  return new Date().toLocaleTimeString("ar-SA", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function nowDateTimeLabel() {
  return `${new Date().toLocaleDateString("en-CA")} ${new Date().toLocaleTimeString("ar-SA", {
    hour: "2-digit",
    minute: "2-digit",
  })}`;
}

function randomId() {
  return `id_${Math.random().toString(36).slice(2, 10)}`;
}

function toArabicNumber(value: number) {
  return new Intl.NumberFormat("ar-SA").format(Math.max(0, Math.round(value)));
}
