"use client";

import { useWizardStore } from "../store";
import { useAutoSave, useAutoSaveEffect } from "../auto-save";

import { WizardStepper } from "./wizard-stepper";
import { StepInfo } from "./step-info";
import { StepLessons } from "./step-lessons";
import { StepModules } from "./step-modules";
import { StepPublish } from "./step-publish";

type StepContentProps = {
  courseId: string;
};

export function StepContent({ courseId }: StepContentProps) {
  const currentStep = useWizardStore((s) => s.currentStep);
  const nextStep = useWizardStore((s) => s.nextStep);
  const prevStep = useWizardStore((s) => s.prevStep);
  const save = useAutoSave(courseId);

  useAutoSaveEffect(courseId);

  const handleSave = () => {
    void save();
  };

  return (
    <div>
      <WizardStepper courseId={courseId} />
      <div>
        {currentStep === "info" && (
          <StepInfo courseId={courseId} onNext={nextStep} onSave={handleSave} />
        )}
        {currentStep === "lessons" && (
          <StepLessons onNext={nextStep} onPrev={prevStep} />
        )}
        {currentStep === "modules" && (
          <StepModules
            onNext={nextStep}
            onPrev={prevStep}
            onSave={handleSave}
          />
        )}
        {currentStep === "publish" && (
          <StepPublish courseId={courseId} onPrev={prevStep} />
        )}
      </div>
    </div>
  );
}
