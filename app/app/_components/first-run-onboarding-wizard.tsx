"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

type FirstRunOnboardingWizardProps = {
  quickStartHref: string;
  onSkip: () => void;
  onComplete: () => void;
};

type WizardStep = {
  title: string;
  subtitle: string;
  bullets: string[];
};

const WIZARD_STEPS: WizardStep[] = [
  {
    title: "مرحبًا بك في One Minute Strategy",
    subtitle: "ابدأ من موجز واضح ثم حوّل الفكرة إلى قرار تنفيذي خلال دقائق.",
    bullets: [
      "تجميع سياق المشروع والمتطلبات الأساسية في نقطة واحدة.",
      "تنقّل مرحلي من الموجز إلى القرار ثم خطة التنفيذ.",
      "احتفاظ تلقائي بالحالة لتكملة الجلسة لاحقًا.",
    ],
  },
  {
    title: "سير عمل واضح حتى الاعتماد",
    subtitle: "لكل مرحلة هدف محدد ومخرجات قابلة للمراجعة والاعتماد.",
    bullets: [
      "مستشارون متعددو الأدوار لتغطية الجوانب المالية والتشغيلية والمخاطر.",
      "فصل بين مرحلة التحليل والتنفيذ لتقليل التشتت.",
      "انتقال منظم بين المراحل مع قفل القراءة عند نقص البيانات الحرجة.",
    ],
  },
  {
    title: "تقارير جاهزة للتصدير والمشاركة",
    subtitle: "بعد التحليل تحصل على تقرير تنفيذي مع خيارات تصدير مباشرة.",
    bullets: [
      "مراجعة التقارير من القائمة أو الصفحة التفصيلية.",
      "تصدير بصيغ TXT وDOCX وPDF بالإضافة إلى الحزمة الكاملة.",
      "إعادة المحاولة الذكية عند فشل أي جزء من الحزمة.",
    ],
  },
];

export default function FirstRunOnboardingWizard({
  quickStartHref,
  onSkip,
  onComplete,
}: FirstRunOnboardingWizardProps) {
  const router = useRouter();
  const [activeStep, setActiveStep] = useState(0);
  const isLastStep = activeStep === WIZARD_STEPS.length - 1;
  const step = useMemo(() => WIZARD_STEPS[activeStep], [activeStep]);

  const completeAndClose = (startNow: boolean) => {
    onComplete();
    if (startNow) {
      router.push(quickStartHref);
    }
  };

  return (
    <div className="onboarding-overlay" role="dialog" aria-modal="true" aria-label="First run onboarding">
      <section className="onboarding-panel">
        <div className="onboarding-head">
          <div className="onboarding-progress">
            الخطوة {activeStep + 1} من {WIZARD_STEPS.length}
          </div>
          <button type="button" className="oms-btn oms-btn-ghost onboarding-skip" onClick={onSkip}>
            تخطي
          </button>
        </div>

        <h2 className="onboarding-title">{step.title}</h2>
        <p className="onboarding-subtitle">{step.subtitle}</p>

        <div className="onboarding-bullets">
          {step.bullets.map((line, index) => (
            <div key={index} className="onboarding-bullet">
              <span className="onboarding-bullet-dot">•</span>
              <span>{line}</span>
            </div>
          ))}
        </div>

        <div className="onboarding-dots" aria-hidden>
          {WIZARD_STEPS.map((item, index) => (
            <span
              key={item.title}
              className={`onboarding-dot ${index === activeStep ? "is-active" : ""}`}
            />
          ))}
        </div>

        <div className="onboarding-actions">
          {activeStep > 0 ? (
            <button
              type="button"
              className="oms-btn oms-btn-ghost"
              onClick={() => setActiveStep((current) => current - 1)}
            >
              السابق
            </button>
          ) : (
            <span />
          )}

          {!isLastStep ? (
            <button
              type="button"
              className="oms-btn oms-btn-primary"
              onClick={() => setActiveStep((current) => current + 1)}
            >
              التالي
            </button>
          ) : (
            <div className="onboarding-final-actions">
              <button type="button" className="oms-btn oms-btn-ghost" onClick={() => completeAndClose(false)}>
                إنهاء
              </button>
              <button type="button" className="oms-btn oms-btn-primary" onClick={() => completeAndClose(true)}>
                إنهاء والبدء الآن
              </button>
            </div>
          )}
        </div>
      </section>

      <style>{`
        .onboarding-overlay {
          position: fixed;
          inset: 0;
          z-index: 1200;
          background: rgba(4, 8, 16, 0.75);
          backdrop-filter: blur(4px);
          padding: 16px;
          display: grid;
          place-items: center;
        }

        .onboarding-panel {
          width: min(760px, 100%);
          border-radius: 16px;
          border: 1px solid var(--oms-border-strong);
          background: linear-gradient(160deg, rgba(20, 30, 52, 0.96), rgba(10, 16, 30, 0.96));
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
          padding: 18px;
          display: grid;
          gap: 12px;
        }

        .onboarding-head {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
          flex-wrap: wrap;
        }

        .onboarding-progress {
          min-height: 28px;
          border-radius: 999px;
          border: 1px solid rgba(138, 160, 255, 0.42);
          background: rgba(11, 18, 32, 0.74);
          padding: 0 10px;
          display: inline-flex;
          align-items: center;
          font-size: 12px;
          font-weight: 800;
          color: var(--oms-text-faint);
        }

        .onboarding-skip {
          min-height: 32px;
          font-size: 12px;
        }

        .onboarding-title {
          margin: 0;
          font-size: 26px;
          line-height: 1.35;
          font-weight: 900;
          color: var(--oms-text);
        }

        .onboarding-subtitle {
          margin: 0;
          color: var(--oms-text-muted);
          line-height: 1.8;
        }

        .onboarding-bullets {
          border-radius: 12px;
          border: 1px solid var(--oms-border);
          background: rgba(10, 16, 28, 0.56);
          padding: 12px;
          display: grid;
          gap: 8px;
        }

        .onboarding-bullet {
          display: flex;
          align-items: flex-start;
          gap: 8px;
          color: var(--oms-text-muted);
          line-height: 1.7;
        }

        .onboarding-bullet-dot {
          color: #9db8ff;
          font-weight: 900;
        }

        .onboarding-dots {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
        }

        .onboarding-dot {
          width: 8px;
          height: 8px;
          border-radius: 999px;
          background: rgba(138, 160, 255, 0.3);
        }

        .onboarding-dot.is-active {
          width: 18px;
          background: #9db8ff;
        }

        .onboarding-actions {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          flex-wrap: wrap;
        }

        .onboarding-final-actions {
          display: flex;
          align-items: center;
          gap: 8px;
          flex-wrap: wrap;
        }

        @media (max-width: 720px) {
          .onboarding-panel {
            padding: 14px;
          }

          .onboarding-title {
            font-size: 22px;
          }

          .onboarding-actions,
          .onboarding-final-actions {
            width: 100%;
            display: grid;
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
}
