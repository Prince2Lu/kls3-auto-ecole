import { Check } from "lucide-react";

type StepperStep = {
  number: number;
  title: string;
  description?: string;
};

type StepperProps = {
  steps: StepperStep[];
  currentStep?: number;
  orientation?: "vertical" | "horizontal";
};

function getStatus(stepNumber: number, currentStep?: number) {
  if (currentStep === undefined) return "current" as const;
  if (stepNumber < currentStep) return "completed" as const;
  if (stepNumber === currentStep) return "current" as const;
  return "upcoming" as const;
}

export function Stepper({
  steps,
  currentStep,
  orientation = "vertical",
}: StepperProps) {
  if (orientation === "horizontal") {
    return (
      <ol className="flex flex-wrap items-center gap-2 text-sm">
        {steps.map((step, index) => {
          const status = getStatus(step.number, currentStep);

          return (
            <li key={step.number} className="flex items-center gap-2">
              <span
                className={
                  status === "upcoming"
                    ? "flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full border border-border text-[11px] text-neutral"
                    : "flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full bg-brand text-[11px] font-semibold text-white"
                }
                aria-hidden
              >
                {status === "completed" ? <Check className="h-3 w-3" /> : step.number}
              </span>
              <span
                className={
                  status === "upcoming"
                    ? "font-medium text-neutral"
                    : "font-medium text-ink"
                }
              >
                {step.title}
              </span>
              {index < steps.length - 1 && (
                <span className="h-px w-6 bg-border" aria-hidden />
              )}
            </li>
          );
        })}
      </ol>
    );
  }

  return (
    <ol className="space-y-6">
      {steps.map((step) => (
        <li key={step.number} className="flex gap-4">
          <span
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand text-sm font-semibold text-white"
            aria-hidden
          >
            {step.number}
          </span>
          <div>
            <p className="font-display text-sm font-semibold text-ink">
              {step.title}
            </p>
            {step.description && (
              <p className="mt-0.5 text-sm text-neutral">{step.description}</p>
            )}
          </div>
        </li>
      ))}
    </ol>
  );
}
