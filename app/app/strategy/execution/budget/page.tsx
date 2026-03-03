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

type AdvanceStatus = "طلب جديد" | "معتمدة" | "مصروفة" | "مسواة";

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

type BudgetSnapshot = {
  lines: BudgetLine[];
  advances: BudgetAdvance[];
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

type UserRole = "project_manager" | "operations_manager" | "finance_manager" | "viewer";
type PermissionScope =
  | "edit_budget_lines"
  | "request_advance"
  | "approve_advance"
  | "disburse_advance"
  | "settle_advance"
  | "cancel_advance";
type BudgetAuditAction =
  | "إنشاء طلب عهدة"
  | "اعتماد عهدة"
  | "صرف عهدة"
  | "تسوية عهدة"
  | "إلغاء عهدة"
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
  },
  operations_manager: {
    edit_budget_lines: false,
    request_advance: true,
    approve_advance: false,
    disburse_advance: false,
    settle_advance: false,
    cancel_advance: false,
  },
  finance_manager: {
    edit_budget_lines: true,
    request_advance: true,
    approve_advance: true,
    disburse_advance: true,
    settle_advance: true,
    cancel_advance: true,
  },
  viewer: {
    edit_budget_lines: false,
    request_advance: false,
    approve_advance: false,
    disburse_advance: false,
    settle_advance: false,
    cancel_advance: false,
  },
};

const PERMISSION_SCOPE_LABELS: Record<PermissionScope, string> = {
  edit_budget_lines: "تعديل بنود الميزانية",
  request_advance: "إنشاء طلب عهدة",
  approve_advance: "اعتماد العهدة",
  disburse_advance: "تأكيد صرف العهدة",
  settle_advance: "تسوية العهدة",
  cancel_advance: "إلغاء العهدة",
};

export default function StrategyExecutionBudgetPage() {
  const [projectContext, setProjectContext] = useState<ProjectContext | null>(null);
  const [lines, setLines] = useState<BudgetLine[]>([]);
  const [advances, setAdvances] = useState<BudgetAdvance[]>([]);
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

  useEffect(() => {
    const context = readProjectContext();
    setProjectContext(context);
    setBudgetAlertThreshold(readBudgetAlertThreshold());

    const snapshot = readBudgetSnapshot(context.id);
    if (snapshot) {
      const nextLines = snapshot.lines.length ? snapshot.lines : defaultLines(context.budgetTarget);
      setLines(nextLines);
      setAdvances(snapshot.advances ?? []);
      setAuditTrail(snapshot.auditTrail ?? []);
      setPlannedRevenue(snapshot.plannedRevenue);
      setActualRevenue(snapshot.actualRevenue);
      setLastSavedAt(snapshot.updatedAt);
      setNewAdvance((prev) => ({
        ...prev,
        lineId: nextLines[0]?.id ?? "",
      }));
    } else {
      const fallbackLines = defaultLines(context.budgetTarget);
      setLines(fallbackLines);
      setAdvances([]);
      setAuditTrail([]);
      setPlannedRevenue(0);
      setActualRevenue(0);
      setLastSavedAt(null);
      setNewAdvance((prev) => ({
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
      auditTrail,
      plannedRevenue,
      actualRevenue,
      updatedAt: nowText,
    };
    localStorage.setItem(budgetTrackerKey(projectContext.id), JSON.stringify(payload));
    setLastSavedAt(nowText);
  }, [isLoaded, projectContext, lines, advances, auditTrail, plannedRevenue, actualRevenue]);

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
    const openAdvancesCount = advances.filter((item) => item.status !== "مسواة").length;
    const overdueAdvances = advances.filter((item) => isOverdue(item)).length;
    const settlementRate =
      advances.length > 0
        ? (advances.filter((item) => item.status === "مسواة").length / advances.length) * 100
        : null;

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
    };
  }, [lines, advances, plannedRevenue, actualRevenue, projectContext, budgetAlertThreshold]);

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
      if (item.status === "مسواة") continue;
      map.add(normalizeKey(item.holder));
    }
    return map;
  }, [advances]);

  const permissionSummary = [
    permissionFlag("إنشاء طلب عهدة", permissions.request_advance),
    permissionFlag("اعتماد", permissions.approve_advance),
    permissionFlag("صرف", permissions.disburse_advance),
    permissionFlag("تسوية", permissions.settle_advance),
  ].join(" · ");

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
              onChange={(event) => setNewAdvance((prev) => ({ ...prev, lineId: event.target.value }))}
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
              disabled={!permissions.request_advance}
            >
              تسجيل طلب عهدة
            </button>
          </div>
        </div>

        <div className="advance-list">
          {advances.length === 0 ? (
            <div className="workflow-empty">لا توجد عهد حاليًا. أضف أول طلب عهدة من النموذج أعلاه.</div>
          ) : (
            advances.map((item) => {
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

                    {item.status === "مسواة" ? (
                      <div className="advance-settled-note">
                        تمت التسوية بمبلغ {formatCurrency(item.settledAmount)} · المرتجع{" "}
                        {formatCurrency(Math.max(0, item.approvedAmount - item.settledAmount))}
                      </div>
                    ) : null}
                  </div>
                </article>
              );
            })
          )}
        </div>
        <div className="budget-foot-note">
          {lastSavedAt ? `آخر حفظ تلقائي: ${lastSavedAt}` : "الحفظ التلقائي يعمل عند أي تعديل."}
        </div>
      </section>

      <section className="oms-panel">
        <h2 className="oms-section-title">سجل التدقيق المالي</h2>
        <p className="oms-text">توثيق زمني لكل إجراءات العهد والصلاحيات على مستوى المشروع الحالي.</p>
        <div className="audit-list">
          {auditTrail.length === 0 ? (
            <div className="workflow-empty">لا توجد أحداث تدقيق بعد. سيظهر أي إجراء جديد هنا تلقائيًا.</div>
          ) : (
            auditTrail.slice(0, 15).map((entry) => (
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

        .advance-list {
          margin-top: 10px;
          display: grid;
          gap: 8px;
        }

        .advance-row {
          border: 1px solid var(--oms-border);
          border-radius: var(--oms-radius-md);
          background: var(--oms-bg-card);
          padding: 10px;
          display: grid;
          gap: 6px;
        }

        .advance-row.is-overdue {
          border-color: rgba(247, 106, 121, 0.52);
          background: linear-gradient(180deg, rgba(56, 20, 30, 0.52), rgba(22, 13, 20, 0.62));
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

        .advance-meta {
          color: var(--oms-text-faint);
          font-size: 13px;
          line-height: 1.7;
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

          .budget-row {
            grid-template-columns: repeat(2, minmax(0, 1fr));
            align-items: stretch;
          }
        }

        @media (max-width: 720px) {
          .budget-kpi-grid,
          .budget-revenue-grid,
          .budget-row,
          .advance-create {
            grid-template-columns: 1fr;
          }

          .budget-lines-actions,
          .advance-actions,
          .budget-footer-actions {
            display: grid;
          }

          .budget-lines-actions .oms-btn,
          .advance-actions .oms-btn,
          .budget-footer-actions .oms-btn,
          .advance-create-action .oms-btn {
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
    const hasOpenAdvance = advances.some((row) => row.lineId === lineId && row.status !== "مسواة");
    if (hasOpenAdvance) {
      setAlertMessage("لا يمكن حذف بند لديه عهد مفتوحة. قم بتسوية العهد أو إلغائها أولاً.");
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
    if (newAdvance.amount > lineBudgetAvailable) {
      setAlertMessage(
        `المبلغ المطلوب يتجاوز المتاح في البند. المتاح الحالي: ${formatCurrency(Math.max(0, lineBudgetAvailable))}.`
      );
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
    setAdvances((prev) => prev.filter((row) => row.id !== advanceId));
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
    setAlertMessage("تم إلغاء العهدة.");
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
  if (value === "معتمدة" || value === "مصروفة" || value === "مسواة") return value;
  return "طلب جديد";
}

function normalizeAuditAction(value: unknown): BudgetAuditAction {
  if (
    value === "إنشاء طلب عهدة" ||
    value === "اعتماد عهدة" ||
    value === "صرف عهدة" ||
    value === "تسوية عهدة" ||
    value === "إلغاء عهدة" ||
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

function isOverdue(item: BudgetAdvance) {
  if (item.status === "مسواة") return false;
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
  return "is-requested";
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
