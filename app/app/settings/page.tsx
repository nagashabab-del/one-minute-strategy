"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { readReports } from "../reports/report-store";

type ApprovalPolicy = "single" | "dual" | "committee";
type LayoutDensity = "comfortable" | "compact";

type ExecSettings = {
  approvalPolicy: ApprovalPolicy;
  requireFinanceSignoff: boolean;
  requireRiskSignoff: boolean;
  allowManagerOverride: boolean;
  budgetAlertThreshold: number;
  delayAlertDays: number;
  notifyInApp: boolean;
  notifyDailySummary: boolean;
  notifyEscalation: boolean;
  layoutDensity: LayoutDensity;
};

const SETTINGS_STORAGE_KEY = "oms_exec_settings_v1";

const DEFAULT_SETTINGS: ExecSettings = {
  approvalPolicy: "dual",
  requireFinanceSignoff: true,
  requireRiskSignoff: true,
  allowManagerOverride: false,
  budgetAlertThreshold: 10,
  delayAlertDays: 2,
  notifyInApp: true,
  notifyDailySummary: true,
  notifyEscalation: true,
  layoutDensity: "comfortable",
};

export default function SettingsPage() {
  const [settings, setSettings] = useState<ExecSettings>(DEFAULT_SETTINGS);
  const [isLoaded, setIsLoaded] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);

  const reports = useMemo(() => readReports(), []);
  const approvedCount = reports.filter((item) => item.status === "معتمد").length;
  const reviewCount = reports.filter((item) => item.status === "مكتمل").length;

  useEffect(() => {
    try {
      const raw = localStorage.getItem(SETTINGS_STORAGE_KEY);
      if (!raw) {
        setIsLoaded(true);
        return;
      }
      const parsed = JSON.parse(raw) as Partial<ExecSettings>;
      setSettings(normalizeSettings(parsed));
    } catch {
      setSettings(DEFAULT_SETTINGS);
    } finally {
      setIsLoaded(true);
    }
  }, []);

  useEffect(() => {
    if (!isLoaded) return;
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
    setLastSavedAt(
      new Date().toLocaleTimeString("ar-SA", {
        hour: "2-digit",
        minute: "2-digit",
      })
    );
  }, [isLoaded, settings]);

  const governanceSummary = useMemo(() => buildGovernanceSummary(settings), [settings]);
  const escalationSensitivity = useMemo(() => {
    if (settings.budgetAlertThreshold <= 5 || settings.delayAlertDays <= 1) return "عالية";
    if (settings.budgetAlertThreshold <= 10 || settings.delayAlertDays <= 2) return "متوسطة";
    return "منخفضة";
  }, [settings.budgetAlertThreshold, settings.delayAlertDays]);

  return (
    <main>
      <h1 className="oms-page-title">الإعدادات التنفيذية</h1>
      <p className="oms-page-subtitle">
        ضبط حوكمة الاعتماد ومسار التنبيهات التنفيذية بدون تغيير منطق التحليل الأساسي.
      </p>

      <section className="oms-panel settings-summary">
        <div className="settings-summary-grid">
          <article className="oms-kpi-card">
            <div className="oms-kpi-label">سياسة الاعتماد الحالية</div>
            <div className="settings-kpi-title">{approvalLabel(settings.approvalPolicy)}</div>
            <div className="settings-kpi-meta">{governanceSummary}</div>
          </article>
          <article className="oms-kpi-card">
            <div className="oms-kpi-label">حساسية التصعيد</div>
            <div className="settings-kpi-title">{escalationSensitivity}</div>
            <div className="settings-kpi-meta">
              تصعيد عند انحراف {settings.budgetAlertThreshold}% أو تأخير {settings.delayAlertDays} يوم
            </div>
          </article>
          <article className="oms-kpi-card">
            <div className="oms-kpi-label">وضع الإشعارات</div>
            <div className="settings-kpi-title">{settings.notifyInApp ? "مفعل" : "متوقف"}</div>
            <div className="settings-kpi-meta">
              {settings.notifyDailySummary ? "ملخص يومي نشط" : "بدون ملخص يومي"} ·{" "}
              {settings.notifyEscalation ? "تصعيد فوري نشط" : "تصعيد فوري متوقف"}
            </div>
          </article>
        </div>

        <div className="settings-save-note">
          {lastSavedAt ? `آخر حفظ تلقائي: ${lastSavedAt}` : "سيتم الحفظ تلقائيًا عند أي تعديل."}
        </div>
      </section>

      <section className="settings-grid">
        <article className="oms-panel">
          <h2 className="oms-section-title">حوكمة الاعتماد</h2>
          <p className="oms-text">
            حدد مستوى الحوكمة المطلوب قبل الانتقال من التقرير إلى التنفيذ التشغيلي.
          </p>

          <div className="settings-options">
            <PolicyOption
              label="اعتماد أحادي"
              description="مدير المشروع يعتمد مباشرة بعد اكتمال التقرير."
              active={settings.approvalPolicy === "single"}
              onSelect={() => setSettings((prev) => ({ ...prev, approvalPolicy: "single" }))}
            />
            <PolicyOption
              label="اعتماد ثنائي"
              description="يتطلب مراجعة المدير + جهة اختصاص واحدة قبل التنفيذ."
              active={settings.approvalPolicy === "dual"}
              onSelect={() => setSettings((prev) => ({ ...prev, approvalPolicy: "dual" }))}
            />
            <PolicyOption
              label="لجنة تنفيذية"
              description="اعتماد لجنة متعددة الأدوار للتقارير الحساسة أو المشاريع الكبرى."
              active={settings.approvalPolicy === "committee"}
              onSelect={() => setSettings((prev) => ({ ...prev, approvalPolicy: "committee" }))}
            />
          </div>

          <div className="settings-switches">
            <ToggleRow
              label="توقيع مالي إلزامي"
              hint="يتطلب موافقة مالية قبل فتح التنفيذ."
              checked={settings.requireFinanceSignoff}
              onToggle={(value) => setSettings((prev) => ({ ...prev, requireFinanceSignoff: value }))}
            />
            <ToggleRow
              label="توقيع مخاطر إلزامي"
              hint="يفرض مراجعة المخاطر قبل اعتماد التشغيل."
              checked={settings.requireRiskSignoff}
              onToggle={(value) => setSettings((prev) => ({ ...prev, requireRiskSignoff: value }))}
            />
            <ToggleRow
              label="سماح تجاوز مدير المشروع"
              hint="يسمح بتجاوز استثنائي للحالات العاجلة."
              checked={settings.allowManagerOverride}
              onToggle={(value) => setSettings((prev) => ({ ...prev, allowManagerOverride: value }))}
            />
          </div>
        </article>

        <article className="oms-panel">
          <h2 className="oms-section-title">تنبيهات التنفيذ</h2>
          <p className="oms-text">ضبط حدود التصعيد عند الانحراف المالي أو التأخير الزمني.</p>

          <div className="settings-field-grid">
            <label className="settings-field">
              <span className="settings-field-label">حد تنبيه انحراف الميزانية (%)</span>
              <input
                className="settings-input"
                type="number"
                min={1}
                max={100}
                value={settings.budgetAlertThreshold}
                onChange={(event) =>
                  setSettings((prev) => ({
                    ...prev,
                    budgetAlertThreshold: clampNumber(event.target.value, 1, 100, 10),
                  }))
                }
              />
            </label>

            <label className="settings-field">
              <span className="settings-field-label">حد تنبيه التأخير (أيام)</span>
              <input
                className="settings-input"
                type="number"
                min={1}
                max={30}
                value={settings.delayAlertDays}
                onChange={(event) =>
                  setSettings((prev) => ({
                    ...prev,
                    delayAlertDays: clampNumber(event.target.value, 1, 30, 2),
                  }))
                }
              />
            </label>

            <label className="settings-field">
              <span className="settings-field-label">كثافة العرض</span>
              <select
                className="settings-input"
                value={settings.layoutDensity}
                onChange={(event) =>
                  setSettings((prev) => ({
                    ...prev,
                    layoutDensity: event.target.value === "compact" ? "compact" : "comfortable",
                  }))
                }
              >
                <option value="comfortable">مريح</option>
                <option value="compact">مضغوط</option>
              </select>
            </label>
          </div>

          <div className="settings-switches">
            <ToggleRow
              label="إشعارات داخل النظام"
              hint="إظهار التنبيهات العائمة أثناء العمل."
              checked={settings.notifyInApp}
              onToggle={(value) => setSettings((prev) => ({ ...prev, notifyInApp: value }))}
            />
            <ToggleRow
              label="ملخص يومي للمشاريع"
              hint="إعداد تقارير يومية مختصرة للحالة التنفيذية."
              checked={settings.notifyDailySummary}
              onToggle={(value) => setSettings((prev) => ({ ...prev, notifyDailySummary: value }))}
            />
            <ToggleRow
              label="تصعيد فوري للحالات الحرجة"
              hint="تنبيه مباشر عند تجاوز الحدود المحددة."
              checked={settings.notifyEscalation}
              onToggle={(value) => setSettings((prev) => ({ ...prev, notifyEscalation: value }))}
            />
          </div>
        </article>
      </section>

      <section className="oms-panel">
        <h2 className="oms-section-title">حالة المسار الحالي</h2>
        <div className="settings-status-grid">
          <div className="settings-status-card">
            <div className="settings-status-label">تقارير بانتظار الاعتماد</div>
            <div className="settings-status-value">{reviewCount}</div>
          </div>
          <div className="settings-status-card">
            <div className="settings-status-label">تقارير معتمدة</div>
            <div className="settings-status-value">{approvedCount}</div>
          </div>
          <div className="settings-status-card">
            <div className="settings-status-label">القاعدة المطبقة</div>
            <div className="settings-status-value small">{approvalLabel(settings.approvalPolicy)}</div>
          </div>
        </div>
      </section>

      <section className="oms-panel">
        <h2 className="oms-section-title">إدارة الإعدادات</h2>
        <div className="settings-actions">
          <button className="oms-btn oms-btn-ghost" type="button" onClick={() => setSettings(DEFAULT_SETTINGS)}>
            استعادة الإعدادات الافتراضية
          </button>
          <Link href="/app/workflows" className="oms-btn oms-btn-ghost">
            متابعة سير العمل
          </Link>
          <Link href="/app/reports" className="oms-btn oms-btn-ghost">
            مراجعة التقارير
          </Link>
          <Link href="/app/strategy" className="oms-btn oms-btn-primary">
            فتح الاستراتيجية
          </Link>
        </div>
      </section>

      <style>{`
        .settings-summary {
          background: linear-gradient(155deg, rgba(24,36,64,0.92), rgba(15,24,43,0.86));
        }

        .settings-summary-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 10px;
        }

        .settings-kpi-title {
          margin-top: 8px;
          font-size: 24px;
          font-weight: 900;
        }

        .settings-kpi-meta {
          margin-top: 6px;
          color: var(--oms-text-faint);
          line-height: 1.7;
          font-size: 13px;
        }

        .settings-save-note {
          margin-top: 10px;
          font-size: 12px;
          color: var(--oms-text-faint);
        }

        .settings-grid {
          margin-top: 12px;
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 10px;
        }

        .settings-options {
          margin-top: 10px;
          display: grid;
          gap: 8px;
        }

        .settings-policy {
          border: 1px solid var(--oms-border);
          border-radius: var(--oms-radius-md);
          background: var(--oms-bg-card);
          padding: 10px;
          cursor: pointer;
          transition: border-color 0.16s ease, filter 0.16s ease;
        }

        .settings-policy:hover {
          filter: brightness(1.05);
        }

        .settings-policy.is-active {
          border-color: rgba(165,120,255,0.56);
          background: linear-gradient(180deg, rgba(88, 39, 187, 0.22), rgba(12, 18, 34, 0.86));
        }

        .settings-policy-title {
          font-weight: 900;
        }

        .settings-policy-desc {
          margin-top: 4px;
          color: var(--oms-text-muted);
          line-height: 1.7;
          font-size: 14px;
        }

        .settings-switches {
          margin-top: 10px;
          display: grid;
          gap: 8px;
        }

        .settings-toggle-row {
          border: 1px solid var(--oms-border);
          border-radius: var(--oms-radius-md);
          background: var(--oms-bg-card);
          padding: 10px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
        }

        .settings-toggle-label {
          font-weight: 800;
        }

        .settings-toggle-hint {
          margin-top: 3px;
          color: var(--oms-text-faint);
          font-size: 13px;
          line-height: 1.7;
        }

        .settings-switch-btn {
          min-width: 78px;
          min-height: 32px;
          border-radius: 999px;
          border: 1px solid var(--oms-border-strong);
          background: rgba(9, 14, 26, 0.84);
          color: var(--oms-text-faint);
          font-size: 12px;
          font-weight: 800;
          cursor: pointer;
        }

        .settings-switch-btn.is-on {
          border-color: rgba(160, 114, 255, 0.52);
          background: var(--oms-bg-primary);
          color: #fff;
        }

        .settings-field-grid {
          margin-top: 10px;
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 8px;
        }

        .settings-field {
          display: grid;
          gap: 6px;
        }

        .settings-field-label {
          font-size: 12px;
          font-weight: 800;
          color: var(--oms-text-faint);
        }

        .settings-input {
          min-height: 40px;
          border-radius: var(--oms-radius-sm);
          border: 1px solid var(--oms-border-strong);
          background: rgba(8, 14, 26, 0.84);
          color: var(--oms-text);
          padding: 0 10px;
          font-size: 14px;
        }

        .settings-status-grid {
          margin-top: 10px;
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 8px;
        }

        .settings-status-card {
          border: 1px solid var(--oms-border);
          border-radius: var(--oms-radius-md);
          background: var(--oms-bg-card);
          padding: 10px;
        }

        .settings-status-label {
          color: var(--oms-text-faint);
          font-size: 12px;
          font-weight: 800;
        }

        .settings-status-value {
          margin-top: 8px;
          font-size: 30px;
          font-weight: 900;
        }

        .settings-status-value.small {
          font-size: 19px;
          line-height: 1.5;
        }

        .settings-actions {
          margin-top: 10px;
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
        }

        @media (max-width: 1080px) {
          .settings-summary-grid,
          .settings-grid,
          .settings-field-grid,
          .settings-status-grid {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 720px) {
          .settings-kpi-title {
            font-size: 21px;
          }

          .settings-actions {
            display: grid;
          }

          .settings-actions .oms-btn {
            width: 100%;
            justify-content: center;
          }
        }
      `}</style>
    </main>
  );
}

function PolicyOption({
  label,
  description,
  active,
  onSelect,
}: {
  label: string;
  description: string;
  active: boolean;
  onSelect: () => void;
}) {
  return (
    <button type="button" className={`settings-policy ${active ? "is-active" : ""}`} onClick={onSelect}>
      <div className="settings-policy-title">{label}</div>
      <div className="settings-policy-desc">{description}</div>
    </button>
  );
}

function ToggleRow({
  label,
  hint,
  checked,
  onToggle,
}: {
  label: string;
  hint: string;
  checked: boolean;
  onToggle: (value: boolean) => void;
}) {
  return (
    <div className="settings-toggle-row">
      <div>
        <div className="settings-toggle-label">{label}</div>
        <div className="settings-toggle-hint">{hint}</div>
      </div>
      <button
        className={`settings-switch-btn ${checked ? "is-on" : ""}`}
        type="button"
        onClick={() => onToggle(!checked)}
      >
        {checked ? "مفعل" : "متوقف"}
      </button>
    </div>
  );
}

function normalizeSettings(input: Partial<ExecSettings>): ExecSettings {
  return {
    approvalPolicy:
      input.approvalPolicy === "single" || input.approvalPolicy === "committee"
        ? input.approvalPolicy
        : DEFAULT_SETTINGS.approvalPolicy,
    requireFinanceSignoff: asBoolean(input.requireFinanceSignoff, DEFAULT_SETTINGS.requireFinanceSignoff),
    requireRiskSignoff: asBoolean(input.requireRiskSignoff, DEFAULT_SETTINGS.requireRiskSignoff),
    allowManagerOverride: asBoolean(input.allowManagerOverride, DEFAULT_SETTINGS.allowManagerOverride),
    budgetAlertThreshold: asNumber(input.budgetAlertThreshold, DEFAULT_SETTINGS.budgetAlertThreshold),
    delayAlertDays: asNumber(input.delayAlertDays, DEFAULT_SETTINGS.delayAlertDays),
    notifyInApp: asBoolean(input.notifyInApp, DEFAULT_SETTINGS.notifyInApp),
    notifyDailySummary: asBoolean(input.notifyDailySummary, DEFAULT_SETTINGS.notifyDailySummary),
    notifyEscalation: asBoolean(input.notifyEscalation, DEFAULT_SETTINGS.notifyEscalation),
    layoutDensity: input.layoutDensity === "compact" ? "compact" : "comfortable",
  };
}

function asBoolean(value: unknown, fallback: boolean) {
  if (typeof value !== "boolean") return fallback;
  return value;
}

function asNumber(value: unknown, fallback: number) {
  if (typeof value !== "number" || Number.isNaN(value)) return fallback;
  return value;
}

function clampNumber(rawValue: string, min: number, max: number, fallback: number) {
  const parsed = Number(rawValue);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(min, Math.min(max, Math.round(parsed)));
}

function approvalLabel(policy: ApprovalPolicy) {
  if (policy === "single") return "اعتماد أحادي";
  if (policy === "committee") return "لجنة تنفيذية";
  return "اعتماد ثنائي";
}

function buildGovernanceSummary(settings: ExecSettings) {
  const tags: string[] = [];
  if (settings.requireFinanceSignoff) tags.push("مالي");
  if (settings.requireRiskSignoff) tags.push("مخاطر");
  if (settings.allowManagerOverride) tags.push("تجاوز المدير");
  if (tags.length === 0) return "بدون اشتراطات إضافية";
  return `اشتراطات: ${tags.join(" + ")}`;
}
