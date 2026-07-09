import type { ReactNode } from "react";

export type BadgeVariant =
  | "success"
  | "warning"
  | "danger"
  | "neutral"
  | "brand";

const VARIANT_CLASSES: Record<BadgeVariant, string> = {
  success: "bg-success-subtle text-success ring-success/20",
  warning: "bg-warning-subtle text-warning ring-warning/20",
  danger: "bg-danger-subtle text-danger ring-danger/20",
  neutral: "bg-neutral-subtle text-neutral ring-neutral/20",
  brand: "bg-brand text-white ring-brand/30",
};

type BadgeProps = {
  variant: BadgeVariant;
  children: ReactNode;
  className?: string;
};

export function Badge({ variant, children, className = "" }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium ring-1 ${VARIANT_CLASSES[variant]} ${className}`}
    >
      {children}
    </span>
  );
}
