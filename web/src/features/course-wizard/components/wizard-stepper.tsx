"use client";

import { useWizardStore } from "../store";
import type { WizardStep } from "../types";
import { STEP_ORDER, STEP_LABELS } from "../types";
import styles from "./wizard-stepper.module.css";

type WizardStepperProps = {
  courseId: string;
};

export function WizardStepper({ courseId }: WizardStepperProps) {
  const currentStep = useWizardStore((s) => s.currentStep);
  const setStep = useWizardStore((s) => s.setStep);
  const lessons = useWizardStore((s) => s.lessons);
  const modules = useWizardStore((s) => s.modules);
  const saving = useWizardStore((s) => s.saving);
  const lastSaved = useWizardStore((s) => s.lastSaved);
  const error = useWizardStore((s) => s.error);

  function isComplete(step: WizardStep): boolean {
    if (step === "info") return !!courseId && courseId !== "new";
    if (step === "lessons") return lessons.length > 0;
    if (step === "modules") return modules.some((m) => m.title.trim());
    return false;
  }

  const completedSteps = STEP_ORDER.filter(isComplete).length;
  const totalSteps = STEP_ORDER.length;
  const progressPercent = Math.round((completedSteps / totalSteps) * 100);

  return (
    <div className={styles.stepperWrapper}>
      <nav className={styles.tabs}>
        {STEP_ORDER.map((step) => {
          const idx = STEP_ORDER.indexOf(step);
          const completed = isComplete(step);
          const isCurrent = step === currentStep;

          return (
            <button
              key={step}
              type="button"
              className={`${styles.tab} ${isCurrent ? styles.tabActive : ""} ${completed ? styles.tabDone : ""}`}
              onClick={() => setStep(step)}
            >
              <span className={styles.tabIcon}>
                {completed ? "✓" : idx + 1}
              </span>
              <span className={styles.tabLabel}>{STEP_LABELS[step]}</span>
            </button>
          );
        })}
      </nav>

      <div className={styles.progressRow}>
        <div className={styles.progressBar}>
          <div
            className={styles.progressFill}
            style={{ width: `${progressPercent}%` }}
          />
        </div>
        <span className={styles.progressText}>
          {completedSteps}/{totalSteps} шагов
        </span>
      </div>

      <div className={styles.statusRow}>
        {error && <span className={styles.statusError}>Ошибка: {error}</span>}
        {saving && <span className={styles.statusSaving}>Сохранение...</span>}
        {!saving && !error && lastSaved && (
          <span className={styles.statusOk}>
            Сохранено в {lastSaved.toLocaleTimeString("ru-RU")}
          </span>
        )}
      </div>
    </div>
  );
}
