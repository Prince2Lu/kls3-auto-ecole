type StepperStep = {
  number: number;
  title: string;
  description: string;
};

type StepperProps = {
  steps: StepperStep[];
};

export function Stepper({ steps }: StepperProps) {
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
            <p className="mt-0.5 text-sm text-neutral">{step.description}</p>
          </div>
        </li>
      ))}
    </ol>
  );
}
