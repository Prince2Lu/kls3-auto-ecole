import { forwardRef } from "react";
import type { ButtonHTMLAttributes } from "react";

export type ButtonVariant = "primary" | "secondary" | "ghost";
export type ButtonSize = "sm" | "md";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
};

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary: "bg-brand text-white hover:opacity-90 disabled:opacity-50",
  secondary:
    "border border-border bg-white text-ink hover:bg-surface-muted disabled:opacity-50",
  ghost: "text-ink hover:bg-surface-muted disabled:opacity-50",
};

const SIZE_CLASSES: Record<ButtonSize, string> = {
  sm: "px-3 py-1.5 text-sm",
  md: "px-5 py-2 text-sm font-semibold",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  function Button(
    { variant = "primary", size = "md", className = "", type = "button", ...props },
    ref
  ) {
    return (
      <button
        ref={ref}
        type={type}
        className={`inline-flex items-center justify-center rounded-md font-body transition-opacity ${VARIANT_CLASSES[variant]} ${SIZE_CLASSES[size]} ${className}`}
        {...props}
      />
    );
  }
);
