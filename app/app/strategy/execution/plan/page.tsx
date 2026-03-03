"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type TaskStatus = "لم تبدأ" | "جارية" | "مكتملة" | "متأخرة";
type TaskPhase = "التخطيط" | "التجهيز" | "التنفيذ" | "الإغلاق";
type DependencyType = "FS";

type PlanTask = {
  id: string;
  title: string;
  owner: string;
  phase: TaskPhase;
  status: TaskStatus;
  progress: number;
  startDate: string;
  dueDate: string;
  dependencyTaskId: string;
  dependencyType: DependencyType;
  critical: boolean;
  updatedAt: string;
};

type TaskView = PlanTask & {
  effectiveStatus: TaskStatus;
  blockedByDependency: boolean;
  dependencyTitle: string;
};

type DailyUpdate = {
  id: string;
  taskId: string;
  taskTitle: string;
  author: string;
  note: string;
  statusSnapshot: TaskStatus;
  createdAt: string;
};

type PlanRiskState = "مفتوح" | "تحت المعالجة";
type PlanRiskSeverity = "متوسط" | "عالي";

type PlanRisk = {
  id: string;
  taskId: string;
  taskTitle: string;
  severity: PlanRiskSeverity;
  state: PlanRiskState;
  reason: string;
  source: "schedule";
  createdAt: string;
  updatedAt: string;
};

type PlanSnapshot = {
  tasks: PlanTask[];
  updates: DailyUpdate[];
  risks: PlanRisk[];
  updatedAt: string;
};

type ProjectContext = {
  id: string;
  name: string;
};

type NewTaskForm = {
  title: string;
  owner: string;
  phase: TaskPhase;
  dueDate: string;
  dependencyTaskId: string;
  critical: boolean;
};

type NewUpdateForm = {
  taskId: string;
  author: string;
  note: string;
};

const PROJECTS_REGISTRY_KEY = "oms_dashboard_projects_registry_v1";
const PLAN_TRACKER_PREFIX = "oms_exec_plan_tracker_v1_";
const PLAN_RISK_BRIDGE_PREFIX = "oms_exec_risk_bridge_v1_";

const PHASE_OPTIONS: TaskPhase[] = ["التخطيط", "التجهيز", "التنفيذ", "الإغلاق"];
const STATUS_OPTIONS: TaskStatus[] = ["لم تبدأ", "جارية", "مكتملة", "متأخرة"];

export default function StrategyExecutionPlanPage() {
  const [projectContext, setProjectContext] = useState<ProjectContext>({ id: "global", name: "مشروع غير محدد" });
  const [tasks, setTasks] = useState<PlanTask[]>([]);
  const [updates, setUpdates] = useState<DailyUpdate[]>([]);
  const [risks, setRisks] = useState<PlanRisk[]>([]);
  const [phaseFilter, setPhaseFilter] = useState<TaskPhase | "الكل">("الكل");
  const [statusFilter, setStatusFilter] = useState<TaskStatus | "الكل">("الكل");
  const [isLoaded, setIsLoaded] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);
  const [alertMessage, setAlertMessage] = useState<string | null>(null);
  const [newTask, setNewTask] = useState<NewTaskForm>({
    title: "",
    owner: "",
    phase: "التخطيط",
    dueDate: addDaysIso(todayIso(), 7),
    dependencyTaskId: "",
    critical: false,
  });
  const [newUpdate, setNewUpdate] = useState<NewUpdateForm>({
    taskId: "",
    author: "",
    note: "",
  });

  useEffect(() => {
    const context = readProjectContext();
    setProjectContext(context);
    const snapshot = readPlanSnapshot(context.id);
    if (snapshot) {
      setTasks(snapshot.tasks.length > 0 ? snapshot.tasks : buildDefaultTasks());
      setUpdates(snapshot.updates ?? []);
      setRisks(snapshot.risks ?? []);
      setLastSavedAt(snapshot.updatedAt || null);
    } else {
      setTasks(buildDefaultTasks());
      setUpdates([]);
      setRisks([]);
      setLastSavedAt(null);
    }
    setIsLoaded(true);
  }, []);

  const taskViews = useMemo(() => buildTaskViews(tasks), [tasks]);

  useEffect(() => {
    if (!isLoaded || !projectContext.id) return;
    setRisks((prev) => {
      const next = syncScheduleRisks(taskViews, prev);
      if (risksEqual(prev, next)) return prev;
      return next;
    });
  }, [isLoaded, projectContext.id, taskViews]);

  useEffect(() => {
    if (!isLoaded) return;
    const now = nowDateTimeLabel();
    const snapshot: PlanSnapshot = {
      tasks,
      updates,
      risks,
      updatedAt: now,
    };
    localStorage.setItem(planTrackerKey(projectContext.id), JSON.stringify(snapshot));
    localStorage.setItem(
      planRiskBridgeKey(projectContext.id),
      JSON.stringify({
        risks,
        updatedAt: now,
      })
    );
    setLastSavedAt(now);
  }, [isLoaded, projectContext.id, tasks, updates, risks]);

  const filteredTaskViews = useMemo(() => {
    return taskViews
      .filter((item) => (phaseFilter === "الكل" ? true : item.phase === phaseFilter))
      .filter((item) => (statusFilter === "الكل" ? true : item.effectiveStatus === statusFilter))
      .sort((a, b) => {
        if (a.phase !== b.phase) return PHASE_OPTIONS.indexOf(a.phase) - PHASE_OPTIONS.indexOf(b.phase);
        return a.dueDate.localeCompare(b.dueDate);
      });
  }, [taskViews, phaseFilter, statusFilter]);

  const summary = useMemo(() => {
    const notStarted = taskViews.filter((item) => item.effectiveStatus === "لم تبدأ").length;
    const inProgress = taskViews.filter((item) => item.effectiveStatus === "جارية").length;
    const completed = taskViews.filter((item) => item.effectiveStatus === "مكتملة").length;
    const delayed = taskViews.filter((item) => item.effectiveStatus === "متأخرة").length;
    const dependencyBlocked = taskViews.filter((item) => item.blockedByDependency).length;
    const completionRatio = taskViews.length > 0 ? (completed / taskViews.length) * 100 : 0;
    const openRisks = risks.filter((item) => item.state === "مفتوح").length;
    const criticalDelayed = taskViews.filter(
      (item) => item.effectiveStatus === "متأخرة" && item.critical
    ).length;
    return {
      total: taskViews.length,
      notStarted,
      inProgress,
      completed,
      delayed,
      dependencyBlocked,
      completionRatio,
      openRisks,
      criticalDelayed,
    };
  }, [taskViews, risks]);

  const todayUpdates = useMemo(() => {
    const today = todayIso();
    return updates.filter((item) => item.createdAt.startsWith(today)).length;
  }, [updates]);

  const firstTaskId = taskViews[0]?.id ?? "";

  function updateTask(taskId: string, patch: Partial<PlanTask>) {
    setTasks((prev) =>
      prev.map((task) =>
        task.id === taskId
          ? {
              ...task,
              ...patch,
              progress: normalizeProgress(typeof patch.progress === "number" ? patch.progress : task.progress),
              updatedAt: nowDateTimeLabel(),
            }
          : task
      )
    );
  }

  function applyStatus(taskId: string, requested: TaskStatus) {
    const current = taskViews.find((item) => item.id === taskId);
    if (!current) return;
    if ((requested === "جارية" || requested === "مكتملة") && current.blockedByDependency) {
      setAlertMessage("لا يمكن بدء المهمة قبل اكتمال مهمتها السابقة (تبعية نهاية إلى بداية).");
      return;
    }

    if (requested === "مكتملة") {
      updateTask(taskId, { status: "مكتملة", progress: 100 });
      return;
    }

    if (requested === "لم تبدأ") {
      updateTask(taskId, { status: "لم تبدأ", progress: 0 });
      return;
    }

    if (requested === "جارية") {
      const nextProgress = Math.max(current.progress, 5);
      updateTask(taskId, { status: "جارية", progress: nextProgress });
      return;
    }

    updateTask(taskId, { status: "متأخرة" });
  }

  function applyProgress(taskId: string, value: number) {
    const current = taskViews.find((item) => item.id === taskId);
    if (!current) return;
    const nextProgress = normalizeProgress(value);
    if (nextProgress >= 100) {
      updateTask(taskId, { progress: 100, status: "مكتملة" });
      return;
    }
    if (nextProgress === 0) {
      updateTask(taskId, { progress: 0, status: "لم تبدأ" });
      return;
    }
    if (current.blockedByDependency) {
      setAlertMessage("لا يمكن رفع التقدم قبل اكتمال المهمة السابقة.");
      return;
    }
    updateTask(taskId, { progress: nextProgress, status: "جارية" });
  }

  function addTask() {
    const title = newTask.title.trim();
    const owner = newTask.owner.trim();
    if (title.length < 3) {
      setAlertMessage("اكتب اسمًا واضحًا للمهمة (3 أحرف على الأقل).");
      return;
    }
    if (owner.length < 2) {
      setAlertMessage("حدد مسؤول المهمة.");
      return;
    }

    const dependencyTaskId =
      newTask.dependencyTaskId && newTask.dependencyTaskId !== "none" ? newTask.dependencyTaskId : "";
    const record: PlanTask = {
      id: randomId(),
      title,
      owner,
      phase: newTask.phase,
      status: "لم تبدأ",
      progress: 0,
      startDate: todayIso(),
      dueDate: newTask.dueDate || addDaysIso(todayIso(), 7),
      dependencyTaskId,
      dependencyType: "FS",
      critical: newTask.critical,
      updatedAt: nowDateTimeLabel(),
    };
    setTasks((prev) => [...prev, record]);
    setNewTask((prev) => ({
      ...prev,
      title: "",
      owner: "",
      dueDate: addDaysIso(todayIso(), 7),
      dependencyTaskId: "",
      critical: false,
    }));
    setAlertMessage("تمت إضافة مهمة تنفيذية جديدة إلى الخطة.");
  }

  function removeTask(taskId: string) {
    const hasDependants = tasks.some((item) => item.dependencyTaskId === taskId);
    if (hasDependants) {
      setAlertMessage("لا يمكن حذف المهمة لأنها مرتبطة كمهمة سابقة لمهام أخرى.");
      return;
    }
    setTasks((prev) => prev.filter((item) => item.id !== taskId));
    setUpdates((prev) => prev.filter((item) => item.taskId !== taskId));
    setRisks((prev) => prev.filter((item) => item.taskId !== taskId));
  }

  function submitDailyUpdate() {
    const taskId = newUpdate.taskId || firstTaskId;
    const task = taskViews.find((item) => item.id === taskId);
    if (!task) {
      setAlertMessage("اختر مهمة صحيحة لتسجيل التحديث.");
      return;
    }
    const author = newUpdate.author.trim();
    const note = newUpdate.note.trim();
    if (author.length < 2) {
      setAlertMessage("اكتب اسم صاحب التحديث.");
      return;
    }
    if (note.length < 8) {
      setAlertMessage("اكتب تحديثًا أوضح (8 أحرف على الأقل).");
      return;
    }
    const record: DailyUpdate = {
      id: randomId(),
      taskId: task.id,
      taskTitle: task.title,
      author,
      note,
      statusSnapshot: task.effectiveStatus,
      createdAt: nowDateTimeLabel(),
    };
    setUpdates((prev) => [record, ...prev].slice(0, 120));
    updateTask(task.id, {});
    setNewUpdate((prev) => ({ ...prev, note: "" }));
    setAlertMessage("تم حفظ التحديث اليومي في سجل التنفيذ.");
  }

  function toggleRiskState(riskId: string) {
    setRisks((prev) =>
      prev.map((risk) => {
        if (risk.id !== riskId) return risk;
        const delayedNow = taskViews.some((item) => item.id === risk.taskId && item.effectiveStatus === "متأخرة");
        if (delayedNow) return risk;
        return {
          ...risk,
          state: risk.state === "مفتوح" ? "تحت المعالجة" : "مفتوح",
          updatedAt: nowDateTimeLabel(),
        };
      })
    );
  }

  return (
    <main>
      <h1 className="oms-page-title">مركز الخطة الزمنية التنفيذي</h1>
      <p className="oms-page-subtitle">
        متابعة المهام اليومية من التخطيط حتى الإغلاق مع تبعيات واضحة وتنبيه مبكر للتأخير قبل تحوله لأزمة تشغيلية.
      </p>

      {alertMessage ? <div className="plan-alert-banner">{alertMessage}</div> : null}

      <section className="oms-panel">
        <div className="plan-head-grid">
          <div>
            <div className="plan-head-label">المشروع الحالي</div>
            <div className="plan-head-title">{projectContext.name}</div>
            <div className="plan-head-meta">عدد المهام: {toArabicNumber(summary.total)}</div>
            <div className="plan-head-meta">تحديثات اليوم: {toArabicNumber(todayUpdates)}</div>
          </div>
          <div className="plan-health-box">
            <div className="plan-head-label">جاهزية المسار الزمني</div>
            <div className="plan-health-value">{formatPercent(summary.completionRatio)}</div>
            <div className="plan-head-meta">
              تأخير حرج: {toArabicNumber(summary.criticalDelayed)} · مخاطر مفتوحة: {toArabicNumber(summary.openRisks)}
            </div>
          </div>
        </div>
      </section>

      <section className="plan-kpi-grid">
        <article className="oms-kpi-card">
          <div className="oms-kpi-label">لم تبدأ</div>
          <div className="oms-kpi-value">{toArabicNumber(summary.notStarted)}</div>
        </article>
        <article className="oms-kpi-card">
          <div className="oms-kpi-label">جارية</div>
          <div className="oms-kpi-value">{toArabicNumber(summary.inProgress)}</div>
        </article>
        <article className="oms-kpi-card">
          <div className="oms-kpi-label">مكتملة</div>
          <div className="oms-kpi-value">{toArabicNumber(summary.completed)}</div>
        </article>
        <article className="oms-kpi-card">
          <div className="oms-kpi-label">متأخرة</div>
          <div className="oms-kpi-value">{toArabicNumber(summary.delayed)}</div>
        </article>
        <article className="oms-kpi-card">
          <div className="oms-kpi-label">تعارض تبعيات</div>
          <div className="oms-kpi-value">{toArabicNumber(summary.dependencyBlocked)}</div>
        </article>
      </section>

      <section className="oms-panel">
        <div className="plan-toolbar">
          <h2 className="oms-section-title">لوحة مهام التنفيذ</h2>
          <div className="plan-toolbar-filters">
            <label className="plan-inline-field">
              <span>المرحلة</span>
              <select
                className="budget-input"
                value={phaseFilter}
                onChange={(event) => setPhaseFilter(event.target.value as TaskPhase | "الكل")}
              >
                <option value="الكل">الكل</option>
                {PHASE_OPTIONS.map((phase) => (
                  <option key={phase} value={phase}>
                    {phase}
                  </option>
                ))}
              </select>
            </label>
            <label className="plan-inline-field">
              <span>الحالة</span>
              <select
                className="budget-input"
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value as TaskStatus | "الكل")}
              >
                <option value="الكل">الكل</option>
                {STATUS_OPTIONS.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>

        <div className="plan-new-task">
          <label className="budget-field">
            <span className="budget-field-label">اسم المهمة</span>
            <input
              className="budget-input"
              value={newTask.title}
              onChange={(event) => setNewTask((prev) => ({ ...prev, title: event.target.value }))}
              placeholder="مثال: اعتماد مخطط الكهرباء النهائي"
            />
          </label>
          <label className="budget-field">
            <span className="budget-field-label">المسؤول</span>
            <input
              className="budget-input"
              value={newTask.owner}
              onChange={(event) => setNewTask((prev) => ({ ...prev, owner: event.target.value }))}
              placeholder="اسم المسؤول"
            />
          </label>
          <label className="budget-field">
            <span className="budget-field-label">المرحلة</span>
            <select
              className="budget-input"
              value={newTask.phase}
              onChange={(event) => setNewTask((prev) => ({ ...prev, phase: event.target.value as TaskPhase }))}
            >
              {PHASE_OPTIONS.map((phase) => (
                <option key={phase} value={phase}>
                  {phase}
                </option>
              ))}
            </select>
          </label>
          <label className="budget-field">
            <span className="budget-field-label">الاستحقاق</span>
            <input
              className="budget-input"
              type="date"
              value={newTask.dueDate}
              onChange={(event) => setNewTask((prev) => ({ ...prev, dueDate: event.target.value }))}
            />
          </label>
          <label className="budget-field">
            <span className="budget-field-label">المهمة السابقة (تبعية)</span>
            <select
              className="budget-input"
              value={newTask.dependencyTaskId || "none"}
              onChange={(event) =>
                setNewTask((prev) => ({
                  ...prev,
                  dependencyTaskId: event.target.value === "none" ? "" : event.target.value,
                }))
              }
            >
              <option value="none">بدون تبعية</option>
              {taskViews.map((task) => (
                <option key={task.id} value={task.id}>
                  {task.title}
                </option>
              ))}
            </select>
            <span className="budget-field-hint">نوع التبعية داخليًا: FS (نهاية إلى بداية).</span>
          </label>
          <label className="plan-critical-check">
            <input
              type="checkbox"
              checked={newTask.critical}
              onChange={(event) => setNewTask((prev) => ({ ...prev, critical: event.target.checked }))}
            />
            <span>مهمة حرجة</span>
          </label>
          <div className="plan-new-task-action">
            <button className="oms-btn oms-btn-primary" type="button" onClick={addTask}>
              إضافة مهمة
            </button>
          </div>
        </div>

        <div className="plan-task-list">
          {filteredTaskViews.length === 0 ? (
            <div className="workflow-empty">لا توجد مهام مطابقة للفلتر الحالي.</div>
          ) : (
            filteredTaskViews.map((task) => (
              <article key={task.id} className={`plan-task-card status-${statusClass(task.effectiveStatus)}`}>
                <div className="plan-task-head">
                  <div>
                    <div className="plan-task-title">{task.title}</div>
                    <div className="plan-task-meta">
                      {task.phase} · المسؤول: {task.owner || "غير محدد"} · آخر تحديث: {task.updatedAt || "—"}
                    </div>
                  </div>
                  <div className="plan-status-badges">
                    <span className={`plan-status-badge status-${statusClass(task.effectiveStatus)}`}>
                      {task.effectiveStatus}
                    </span>
                    {task.critical ? <span className="plan-critical-badge">حرجة</span> : null}
                  </div>
                </div>

                <div className="plan-task-grid">
                  <label className="budget-field">
                    <span className="budget-field-label">الحالة</span>
                    <select
                      className="budget-input"
                      value={task.status}
                      onChange={(event) => applyStatus(task.id, event.target.value as TaskStatus)}
                    >
                      {STATUS_OPTIONS.map((status) => (
                        <option key={status} value={status}>
                          {status}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="budget-field">
                    <span className="budget-field-label">نسبة الإنجاز</span>
                    <div className="plan-progress-wrap">
                      <input
                        className="plan-progress-slider"
                        type="range"
                        min={0}
                        max={100}
                        step={5}
                        value={task.progress}
                        onChange={(event) => applyProgress(task.id, Number(event.target.value))}
                      />
                      <strong>{formatPercent(task.progress)}</strong>
                    </div>
                  </label>
                  <label className="budget-field">
                    <span className="budget-field-label">بداية المهمة</span>
                    <input
                      className="budget-input"
                      type="date"
                      value={task.startDate}
                      onChange={(event) => updateTask(task.id, { startDate: event.target.value })}
                    />
                  </label>
                  <label className="budget-field">
                    <span className="budget-field-label">الاستحقاق</span>
                    <input
                      className="budget-input"
                      type="date"
                      value={task.dueDate}
                      onChange={(event) => updateTask(task.id, { dueDate: event.target.value })}
                    />
                  </label>
                  <label className="budget-field">
                    <span className="budget-field-label">المهمة السابقة</span>
                    <select
                      className="budget-input"
                      value={task.dependencyTaskId || "none"}
                      onChange={(event) =>
                        updateTask(task.id, {
                          dependencyTaskId: event.target.value === "none" ? "" : event.target.value,
                        })
                      }
                    >
                      <option value="none">بدون تبعية</option>
                      {taskViews
                        .filter((candidate) => candidate.id !== task.id)
                        .map((candidate) => (
                          <option key={candidate.id} value={candidate.id}>
                            {candidate.title}
                          </option>
                        ))}
                    </select>
                  </label>
                  <label className="budget-field">
                    <span className="budget-field-label">نوع التبعية</span>
                    <div className="plan-dependency-type">
                      {task.dependencyTaskId ? "FS · نهاية إلى بداية" : "غير مرتبط"}
                    </div>
                  </label>
                </div>

                {task.blockedByDependency ? (
                  <div className="budget-inline-warning">
                    هذه المهمة مرتبطة بـ "{task.dependencyTitle}". لا تبدأ قبل اكتمال المهمة السابقة.
                  </div>
                ) : null}

                <div className="plan-task-actions">
                  <button className="oms-btn oms-btn-ghost" type="button" onClick={() => removeTask(task.id)}>
                    حذف المهمة
                  </button>
                </div>
              </article>
            ))
          )}
        </div>
      </section>

      <section className="oms-grid-2">
        <article className="oms-panel" style={{ marginTop: 0 }}>
          <h2 className="oms-section-title">التحديثات اليومية</h2>
          <p className="oms-text">يرفع المسؤولون تحديثات التنفيذ اليومية لتجديد حالة المهام بشكل مستمر.</p>

          <div className="plan-update-form">
            <label className="budget-field">
              <span className="budget-field-label">المهمة</span>
              <select
                className="budget-input"
                value={newUpdate.taskId || firstTaskId}
                onChange={(event) => setNewUpdate((prev) => ({ ...prev, taskId: event.target.value }))}
              >
                {taskViews.map((task) => (
                  <option key={task.id} value={task.id}>
                    {task.title}
                  </option>
                ))}
              </select>
            </label>
            <label className="budget-field">
              <span className="budget-field-label">صاحب التحديث</span>
              <input
                className="budget-input"
                value={newUpdate.author}
                onChange={(event) => setNewUpdate((prev) => ({ ...prev, author: event.target.value }))}
                placeholder="اسم المسؤول"
              />
            </label>
            <label className="budget-field plan-update-note-field">
              <span className="budget-field-label">التحديث</span>
              <textarea
                className="budget-input plan-update-note"
                value={newUpdate.note}
                onChange={(event) => setNewUpdate((prev) => ({ ...prev, note: event.target.value }))}
                placeholder="مثال: تم توريد 70% من مواد الديكور مع تأخير يوم واحد في الشحن."
              />
            </label>
            <button className="oms-btn oms-btn-primary" type="button" onClick={submitDailyUpdate}>
              حفظ التحديث اليومي
            </button>
          </div>

          <div className="plan-updates-list">
            {updates.length === 0 ? (
              <div className="workflow-empty">لا توجد تحديثات يومية بعد.</div>
            ) : (
              updates.slice(0, 8).map((item) => (
                <article key={item.id} className="plan-update-item">
                  <div className="plan-update-head">
                    <strong>{item.taskTitle}</strong>
                    <span>{item.createdAt}</span>
                  </div>
                  <div className="plan-update-meta">
                    بواسطة: {item.author} · الحالة عند التحديث: {item.statusSnapshot}
                  </div>
                  <div className="plan-update-note-text">{item.note}</div>
                </article>
              ))
            )}
          </div>
        </article>

        <article className="oms-panel" style={{ marginTop: 0 }}>
          <h2 className="oms-section-title">مخاطر مرتبطة بالجدول</h2>
          <p className="oms-text">يتم فتح مخاطر تلقائيًا عند تأخر المهام الحرجة أو خروجها عن الاستحقاق.</p>
          <div className="plan-risk-list">
            {risks.length === 0 ? (
              <div className="workflow-empty">لا توجد مخاطر زمنية مفتوحة حاليًا.</div>
            ) : (
              risks.slice(0, 8).map((risk) => {
                const delayedNow = taskViews.some(
                  (task) => task.id === risk.taskId && task.effectiveStatus === "متأخرة"
                );
                return (
                  <article key={risk.id} className="plan-risk-item">
                    <div className="plan-risk-head">
                      <strong>{risk.taskTitle}</strong>
                      <span className={`plan-risk-badge severity-${risk.severity === "عالي" ? "high" : "medium"}`}>
                        {risk.severity}
                      </span>
                    </div>
                    <div className="plan-risk-meta">
                      الحالة: {risk.state} · آخر تحديث: {risk.updatedAt}
                    </div>
                    <div className="plan-risk-reason">{risk.reason}</div>
                    <div className="plan-risk-actions">
                      <button
                        className="oms-btn oms-btn-ghost"
                        type="button"
                        onClick={() => toggleRiskState(risk.id)}
                        disabled={delayedNow}
                      >
                        {delayedNow ? "بانتظار معالجة التأخير" : "تحديث حالة الخطر"}
                      </button>
                    </div>
                  </article>
                );
              })
            )}
          </div>
        </article>
      </section>

      <section className="oms-panel">
        <h2 className="oms-section-title">إجراء تنفيذي</h2>
        <div className="plan-footer-actions">
          <Link href="/app/strategy/execution/risks" className="oms-btn oms-btn-primary">
            فتح سجل المخاطر
          </Link>
          <Link href="/app/workflows" className="oms-btn oms-btn-ghost">
            فتح سير العمل التنفيذي
          </Link>
          <Link href="/app/strategy/review" className="oms-btn oms-btn-ghost">
            الانتقال للمراجعة النهائية
          </Link>
        </div>
        <div className="budget-foot-note">{lastSavedAt ? `آخر حفظ تلقائي: ${lastSavedAt}` : "الحفظ التلقائي مفعل."}</div>
      </section>

      <style>{`
        .plan-alert-banner {
          margin-top: 10px;
          border: 1px solid rgba(232, 182, 102, 0.52);
          border-radius: var(--oms-radius-sm);
          background: linear-gradient(180deg, rgba(53, 39, 14, 0.72), rgba(28, 20, 10, 0.72));
          color: #ffd996;
          padding: 10px;
          font-size: 13px;
          line-height: 1.7;
        }

        .plan-head-grid {
          display: grid;
          grid-template-columns: minmax(0, 1fr) 260px;
          gap: 10px;
        }

        .plan-head-label {
          font-size: 12px;
          color: var(--oms-text-faint);
        }

        .plan-head-title {
          margin-top: 4px;
          font-size: 22px;
          font-weight: 900;
          line-height: 1.4;
        }

        .plan-head-meta {
          margin-top: 4px;
          color: var(--oms-text-muted);
          font-size: 13px;
        }

        .plan-health-box {
          border: 1px solid var(--oms-border-strong);
          border-radius: var(--oms-radius-md);
          background: linear-gradient(180deg, rgba(16, 30, 56, 0.9), rgba(10, 20, 38, 0.84));
          padding: 10px;
          display: grid;
          align-content: space-between;
          gap: 6px;
        }

        .plan-health-value {
          font-size: 38px;
          font-weight: 900;
          line-height: 1;
        }

        .plan-kpi-grid {
          margin-top: 12px;
          display: grid;
          grid-template-columns: repeat(5, minmax(0, 1fr));
          gap: 8px;
        }

        .plan-toolbar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          flex-wrap: wrap;
        }

        .plan-toolbar-filters {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
        }

        .plan-inline-field {
          min-width: 130px;
          display: grid;
          gap: 4px;
          font-size: 12px;
          color: var(--oms-text-faint);
        }

        .plan-new-task {
          margin-top: 10px;
          display: grid;
          gap: 8px;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          border: 1px solid var(--oms-border);
          border-radius: var(--oms-radius-md);
          background: var(--oms-bg-card);
          padding: 10px;
        }

        .plan-critical-check {
          min-height: 42px;
          border: 1px solid var(--oms-border-strong);
          border-radius: var(--oms-radius-sm);
          background: rgba(9, 16, 29, 0.86);
          padding: 0 10px;
          display: inline-flex;
          align-items: center;
          gap: 8px;
          color: var(--oms-text-muted);
          font-size: 13px;
          font-weight: 700;
        }

        .plan-new-task-action {
          display: flex;
          justify-content: flex-end;
          align-items: end;
        }

        .plan-task-list {
          margin-top: 10px;
          display: grid;
          gap: 8px;
        }

        .plan-task-card {
          border: 1px solid var(--oms-border);
          border-radius: var(--oms-radius-md);
          background: var(--oms-bg-card);
          padding: 10px;
          display: grid;
          gap: 8px;
        }

        .plan-task-card.status-delayed {
          border-color: rgba(247, 106, 121, 0.56);
          background: linear-gradient(180deg, rgba(52, 18, 30, 0.7), rgba(23, 12, 20, 0.72));
        }

        .plan-task-head {
          display: flex;
          align-items: start;
          justify-content: space-between;
          gap: 10px;
        }

        .plan-task-title {
          font-size: 19px;
          font-weight: 900;
          line-height: 1.4;
        }

        .plan-task-meta {
          margin-top: 2px;
          color: var(--oms-text-faint);
          font-size: 12px;
        }

        .plan-status-badges {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
          justify-content: end;
        }

        .plan-status-badge {
          min-height: 24px;
          border-radius: 999px;
          border: 1px solid var(--oms-border-strong);
          background: rgba(10, 16, 29, 0.8);
          padding: 0 9px;
          font-size: 12px;
          font-weight: 800;
          display: inline-flex;
          align-items: center;
          white-space: nowrap;
        }

        .plan-status-badge.status-not-started {
          border-color: rgba(138, 160, 255, 0.44);
          color: #ccdaff;
        }

        .plan-status-badge.status-in-progress {
          border-color: rgba(186, 148, 255, 0.64);
          color: #f2e9ff;
          background: rgba(78, 40, 151, 0.6);
        }

        .plan-status-badge.status-completed {
          border-color: rgba(88, 214, 165, 0.64);
          color: #78e3b9;
          background: rgba(14, 56, 45, 0.78);
        }

        .plan-status-badge.status-delayed {
          border-color: rgba(247, 106, 121, 0.58);
          color: #ffbcc4;
          background: rgba(70, 20, 33, 0.74);
        }

        .plan-critical-badge {
          min-height: 24px;
          border-radius: 999px;
          border: 1px solid rgba(247, 106, 121, 0.58);
          background: rgba(70, 20, 33, 0.74);
          color: #ffbcc4;
          padding: 0 9px;
          font-size: 12px;
          font-weight: 900;
          display: inline-flex;
          align-items: center;
          white-space: nowrap;
        }

        .plan-task-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 8px;
        }

        .plan-progress-wrap {
          min-height: 42px;
          border: 1px solid var(--oms-border-strong);
          border-radius: var(--oms-radius-sm);
          background: rgba(9, 16, 29, 0.86);
          padding: 0 10px;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .plan-progress-slider {
          flex: 1;
          accent-color: #9a52ff;
        }

        .plan-dependency-type {
          min-height: 42px;
          border: 1px solid var(--oms-border-strong);
          border-radius: var(--oms-radius-sm);
          background: rgba(9, 16, 29, 0.86);
          padding: 0 10px;
          display: inline-flex;
          align-items: center;
          color: var(--oms-text-muted);
          font-size: 13px;
          font-weight: 700;
        }

        .plan-task-actions {
          display: flex;
          justify-content: flex-end;
        }

        .plan-update-form {
          margin-top: 10px;
          display: grid;
          gap: 8px;
        }

        .plan-update-note-field {
          grid-column: 1 / -1;
        }

        .plan-update-note {
          min-height: 88px;
          resize: vertical;
          padding-top: 10px;
          padding-bottom: 10px;
        }

        .plan-updates-list,
        .plan-risk-list {
          margin-top: 10px;
          display: grid;
          gap: 8px;
        }

        .plan-update-item,
        .plan-risk-item {
          border: 1px solid var(--oms-border);
          border-radius: var(--oms-radius-md);
          background: var(--oms-bg-card);
          padding: 10px;
          display: grid;
          gap: 4px;
        }

        .plan-update-head,
        .plan-risk-head {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
        }

        .plan-update-head span {
          color: var(--oms-text-faint);
          font-size: 12px;
        }

        .plan-update-meta,
        .plan-risk-meta {
          color: var(--oms-text-faint);
          font-size: 12px;
          line-height: 1.6;
        }

        .plan-update-note-text,
        .plan-risk-reason {
          color: var(--oms-text-muted);
          line-height: 1.7;
          font-size: 13px;
        }

        .plan-risk-badge {
          min-height: 24px;
          border-radius: 999px;
          padding: 0 9px;
          font-size: 12px;
          font-weight: 800;
          display: inline-flex;
          align-items: center;
          white-space: nowrap;
        }

        .plan-risk-badge.severity-medium {
          border: 1px solid rgba(232, 182, 102, 0.6);
          color: #ffd996;
          background: rgba(66, 47, 20, 0.72);
        }

        .plan-risk-badge.severity-high {
          border: 1px solid rgba(247, 106, 121, 0.58);
          color: #ffbcc4;
          background: rgba(70, 20, 33, 0.74);
        }

        .plan-risk-actions {
          margin-top: 2px;
        }

        .plan-footer-actions {
          margin-top: 10px;
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
        }

        @media (max-width: 1180px) {
          .plan-head-grid {
            grid-template-columns: 1fr;
          }

          .plan-kpi-grid {
            grid-template-columns: repeat(3, minmax(0, 1fr));
          }

          .plan-new-task,
          .plan-task-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
        }

        @media (max-width: 760px) {
          .plan-kpi-grid,
          .plan-new-task,
          .plan-task-grid {
            grid-template-columns: 1fr;
          }

          .plan-toolbar,
          .plan-task-head,
          .plan-update-head,
          .plan-risk-head {
            display: grid;
          }

          .plan-new-task-action .oms-btn,
          .plan-task-actions .oms-btn,
          .plan-risk-actions .oms-btn,
          .plan-footer-actions .oms-btn {
            width: 100%;
            justify-content: center;
          }
        }
      `}</style>
    </main>
  );
}

function buildTaskViews(tasks: PlanTask[]): TaskView[] {
  const map = new Map<string, PlanTask>(tasks.map((task) => [task.id, task]));
  return tasks.map((task) => {
    const dependencyTask = task.dependencyTaskId ? map.get(task.dependencyTaskId) : undefined;
    const dependencyStatus = dependencyTask ? resolveTaskStatus(dependencyTask) : null;
    const blockedByDependency =
      Boolean(task.dependencyTaskId) &&
      dependencyTask != null &&
      dependencyStatus !== "مكتملة" &&
      resolveTaskStatus(task) !== "لم تبدأ";
    return {
      ...task,
      effectiveStatus: resolveTaskStatus(task),
      blockedByDependency,
      dependencyTitle: dependencyTask?.title || "غير معروف",
    };
  });
}

function resolveTaskStatus(task: PlanTask): TaskStatus {
  if (task.status === "مكتملة") return "مكتملة";
  if (task.progress >= 100) return "مكتملة";
  if (task.status === "متأخرة") return "متأخرة";
  if (task.dueDate && task.dueDate < todayIso()) return "متأخرة";
  if (task.status === "جارية" || task.progress > 0) return "جارية";
  return "لم تبدأ";
}

function syncScheduleRisks(taskViews: TaskView[], previous: PlanRisk[]): PlanRisk[] {
  const now = nowDateTimeLabel();
  const delayedMap = new Map(taskViews.filter((task) => task.effectiveStatus === "متأخرة").map((task) => [task.id, task]));

  const existingByTask = new Map(
    previous.filter((risk) => risk.source === "schedule").map((risk) => [risk.taskId, risk])
  );
  const next: PlanRisk[] = [];

  for (const risk of previous) {
    const linkedTask = delayedMap.get(risk.taskId);
    if (risk.source !== "schedule") {
      next.push(risk);
      continue;
    }
    if (linkedTask) {
      next.push({
        ...risk,
        taskTitle: linkedTask.title,
        severity: linkedTask.critical ? "عالي" : "متوسط",
        state: "مفتوح",
        reason: buildRiskReason(linkedTask),
        updatedAt: now,
      });
      delayedMap.delete(risk.taskId);
      continue;
    }
    if (risk.state === "مفتوح") {
      next.push({
        ...risk,
        state: "تحت المعالجة",
        updatedAt: now,
      });
    } else {
      next.push(risk);
    }
  }

  for (const task of delayedMap.values()) {
    const existing = existingByTask.get(task.id);
    next.push({
      id: existing?.id ?? randomId(),
      taskId: task.id,
      taskTitle: task.title,
      severity: task.critical ? "عالي" : "متوسط",
      state: "مفتوح",
      reason: buildRiskReason(task),
      source: "schedule",
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    });
  }

  return next.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

function buildRiskReason(task: TaskView) {
  const lateDays = task.dueDate ? Math.max(1, daysBetween(task.dueDate, todayIso())) : 1;
  if (task.critical) {
    return `المهمة الحرجة "${task.title}" متأخرة بحوالي ${toArabicNumber(lateDays)} يوم وتحتاج تصعيد فوري.`;
  }
  return `المهمة "${task.title}" تجاوزت الاستحقاق بحوالي ${toArabicNumber(
    lateDays
  )} يوم وتحتاج خطة معالجة زمنية.`;
}

function risksEqual(a: PlanRisk[], b: PlanRisk[]) {
  if (a.length !== b.length) return false;
  return a.every((item, idx) => {
    const other = b[idx];
    return (
      item.id === other.id &&
      item.taskId === other.taskId &&
      item.taskTitle === other.taskTitle &&
      item.severity === other.severity &&
      item.state === other.state &&
      item.reason === other.reason &&
      item.updatedAt === other.updatedAt
    );
  });
}

function readProjectContext(): ProjectContext {
  if (typeof window === "undefined") return { id: "global", name: "مشروع غير محدد" };
  try {
    const raw = localStorage.getItem(PROJECTS_REGISTRY_KEY);
    if (!raw) return { id: "global", name: "مشروع غير محدد" };
    const parsed = JSON.parse(raw) as {
      activeProjectId?: string;
      projects?: Array<{ id: string; name: string }>;
    };
    const projects = Array.isArray(parsed.projects) ? parsed.projects : [];
    const active = projects.find((item) => item.id === parsed.activeProjectId) ?? projects[0];
    if (!active) return { id: "global", name: "مشروع غير محدد" };
    return {
      id: active.id,
      name: active.name?.trim() || "مشروع بدون اسم",
    };
  } catch {
    return { id: "global", name: "مشروع غير محدد" };
  }
}

function readPlanSnapshot(projectId: string): PlanSnapshot | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(planTrackerKey(projectId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<PlanSnapshot>;
    const tasks: PlanTask[] = Array.isArray(parsed.tasks)
      ? parsed.tasks.map((task) => ({
          id: typeof task.id === "string" ? task.id : randomId(),
          title: typeof task.title === "string" ? task.title : "مهمة بدون اسم",
          owner: typeof task.owner === "string" ? task.owner : "غير محدد",
          phase: normalizePhase(task.phase),
          status: normalizeStatus(task.status),
          progress: normalizeProgress(asNumber(task.progress)),
          startDate: typeof task.startDate === "string" ? task.startDate : todayIso(),
          dueDate: typeof task.dueDate === "string" ? task.dueDate : addDaysIso(todayIso(), 7),
          dependencyTaskId: typeof task.dependencyTaskId === "string" ? task.dependencyTaskId : "",
          dependencyType: "FS" as const,
          critical: Boolean(task.critical),
          updatedAt: typeof task.updatedAt === "string" ? task.updatedAt : nowDateTimeLabel(),
        }))
      : [];

    const updates = Array.isArray(parsed.updates)
      ? parsed.updates.map((item) => ({
          id: typeof item.id === "string" ? item.id : randomId(),
          taskId: typeof item.taskId === "string" ? item.taskId : "",
          taskTitle: typeof item.taskTitle === "string" ? item.taskTitle : "مهمة غير محددة",
          author: typeof item.author === "string" ? item.author : "غير محدد",
          note: typeof item.note === "string" ? item.note : "",
          statusSnapshot: normalizeStatus(item.statusSnapshot),
          createdAt: typeof item.createdAt === "string" ? item.createdAt : nowDateTimeLabel(),
        }))
      : [];

    const risks: PlanRisk[] = Array.isArray(parsed.risks)
      ? parsed.risks.map((risk) => ({
          id: typeof risk.id === "string" ? risk.id : randomId(),
          taskId: typeof risk.taskId === "string" ? risk.taskId : "",
          taskTitle: typeof risk.taskTitle === "string" ? risk.taskTitle : "مهمة غير محددة",
          severity: (risk.severity === "عالي" ? "عالي" : "متوسط") as PlanRiskSeverity,
          state: (risk.state === "تحت المعالجة" ? "تحت المعالجة" : "مفتوح") as PlanRiskState,
          reason: typeof risk.reason === "string" ? risk.reason : "خطر زمني مفتوح.",
          source: "schedule" as const,
          createdAt: typeof risk.createdAt === "string" ? risk.createdAt : nowDateTimeLabel(),
          updatedAt: typeof risk.updatedAt === "string" ? risk.updatedAt : nowDateTimeLabel(),
        }))
      : [];

    return {
      tasks,
      updates,
      risks,
      updatedAt: typeof parsed.updatedAt === "string" ? parsed.updatedAt : "",
    };
  } catch {
    return null;
  }
}

function buildDefaultTasks(): PlanTask[] {
  const base = todayIso();
  const baseTasks: PlanTask[] = [
    {
      id: randomId(),
      title: "اعتماد خطة التشغيل الأساسية",
      owner: "مدير المشروع",
      phase: "التخطيط",
      status: "جارية",
      progress: 20,
      startDate: base,
      dueDate: addDaysIso(base, 2),
      dependencyTaskId: "",
      dependencyType: "FS" as const,
      critical: true,
      updatedAt: nowDateTimeLabel(),
    },
    {
      id: randomId(),
      title: "تثبيت الموردين وتأكيد العقود",
      owner: "قائد المشتريات",
      phase: "التجهيز",
      status: "لم تبدأ",
      progress: 0,
      startDate: addDaysIso(base, 1),
      dueDate: addDaysIso(base, 5),
      dependencyTaskId: "",
      dependencyType: "FS" as const,
      critical: true,
      updatedAt: nowDateTimeLabel(),
    },
    {
      id: randomId(),
      title: "جاهزية الموقع والديكور والإضاءة",
      owner: "مدير التشغيل",
      phase: "التجهيز",
      status: "لم تبدأ",
      progress: 0,
      startDate: addDaysIso(base, 3),
      dueDate: addDaysIso(base, 8),
      dependencyTaskId: "",
      dependencyType: "FS" as const,
      critical: true,
      updatedAt: nowDateTimeLabel(),
    },
    {
      id: randomId(),
      title: "تنفيذ خطة التسويق الميداني",
      owner: "قائد التسويق",
      phase: "التنفيذ",
      status: "لم تبدأ",
      progress: 0,
      startDate: addDaysIso(base, 5),
      dueDate: addDaysIso(base, 10),
      dependencyTaskId: "",
      dependencyType: "FS" as const,
      critical: false,
      updatedAt: nowDateTimeLabel(),
    },
    {
      id: randomId(),
      title: "تشغيل يوم الفعالية ومراقبة الجودة",
      owner: "مدير التشغيل",
      phase: "التنفيذ",
      status: "لم تبدأ",
      progress: 0,
      startDate: addDaysIso(base, 10),
      dueDate: addDaysIso(base, 11),
      dependencyTaskId: "",
      dependencyType: "FS" as const,
      critical: true,
      updatedAt: nowDateTimeLabel(),
    },
    {
      id: randomId(),
      title: "إقفال الالتزامات وإعداد التقرير الختامي",
      owner: "مدير المشروع",
      phase: "الإغلاق",
      status: "لم تبدأ",
      progress: 0,
      startDate: addDaysIso(base, 11),
      dueDate: addDaysIso(base, 14),
      dependencyTaskId: "",
      dependencyType: "FS" as const,
      critical: false,
      updatedAt: nowDateTimeLabel(),
    },
  ];

  return baseTasks.map((task, idx, list) => ({
    ...task,
    dependencyTaskId: idx > 0 ? list[idx - 1].id : "",
  }));
}

function planTrackerKey(projectId: string) {
  return `${PLAN_TRACKER_PREFIX}${projectId}`;
}

function planRiskBridgeKey(projectId: string) {
  return `${PLAN_RISK_BRIDGE_PREFIX}${projectId}`;
}

function normalizeStatus(value: unknown): TaskStatus {
  if (value === "جارية" || value === "مكتملة" || value === "متأخرة") return value;
  return "لم تبدأ";
}

function normalizePhase(value: unknown): TaskPhase {
  if (value === "التجهيز" || value === "التنفيذ" || value === "الإغلاق") return value;
  return "التخطيط";
}

function normalizeProgress(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, Math.round(value)));
}

function asNumber(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  return 0;
}

function statusClass(status: TaskStatus) {
  if (status === "جارية") return "in-progress";
  if (status === "مكتملة") return "completed";
  if (status === "متأخرة") return "delayed";
  return "not-started";
}

function formatPercent(value: number) {
  return `${Math.max(0, Math.min(100, value)).toFixed(0)}%`;
}

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function addDaysIso(baseIso: string, days: number) {
  const d = new Date(baseIso);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function nowDateTimeLabel() {
  return `${new Date().toLocaleDateString("en-CA")} ${new Date().toLocaleTimeString("ar-SA", {
    hour: "2-digit",
    minute: "2-digit",
  })}`;
}

function daysBetween(fromIso: string, toIso: string) {
  const from = new Date(fromIso);
  const to = new Date(toIso);
  const delta = to.getTime() - from.getTime();
  return Math.floor(delta / (1000 * 60 * 60 * 24));
}

function randomId() {
  return `id_${Math.random().toString(36).slice(2, 10)}`;
}

function toArabicNumber(value: number) {
  return new Intl.NumberFormat("ar-SA").format(Math.max(0, Math.round(value)));
}
