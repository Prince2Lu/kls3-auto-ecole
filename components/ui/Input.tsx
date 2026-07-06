import { forwardRef } from "react";
import type { InputHTMLAttributes, SelectHTMLAttributes } from "react";

type FieldWrapperProps = {
  label: string;
  id: string;
  error?: string;
  children: React.ReactNode;
};

function FieldWrapper({ label, id, error, children }: FieldWrapperProps) {
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-ink">
        {label}
      </label>
      {children}
      {error ? (
        <p className="mt-1.5 text-sm text-danger" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

const fieldClasses = (hasError: boolean) =>
  `w-full rounded-md border px-3 py-2 text-sm text-ink placeholder:text-neutral/60 focus:outline-none focus:ring-2 ${
    hasError
      ? "border-danger ring-1 ring-danger/30 focus:border-danger focus:ring-danger/20"
      : "border-border focus:border-brand focus:ring-brand/20"
  }`;

type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  error?: string;
};

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, error, id, className = "", ...props },
  ref
) {
  const fieldId = id ?? props.name ?? label;
  return (
    <FieldWrapper label={label} id={fieldId} error={error}>
      <input
        ref={ref}
        id={fieldId}
        className={`${fieldClasses(Boolean(error))} ${className}`}
        aria-invalid={error ? true : undefined}
        {...props}
      />
    </FieldWrapper>
  );
});

type SelectProps = SelectHTMLAttributes<HTMLSelectElement> & {
  label: string;
  error?: string;
};

export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { label, error, id, className = "", children, ...props },
  ref
) {
  const fieldId = id ?? props.name ?? label;
  return (
    <FieldWrapper label={label} id={fieldId} error={error}>
      <select
        ref={ref}
        id={fieldId}
        className={`${fieldClasses(Boolean(error))} ${className}`}
        aria-invalid={error ? true : undefined}
        {...props}
      >
        {children}
      </select>
    </FieldWrapper>
  );
});
