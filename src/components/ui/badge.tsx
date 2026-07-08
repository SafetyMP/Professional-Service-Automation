import { cn } from "@/lib/utils/cn";
import type { HTMLAttributes } from "react";

const variants = {
  default: "bg-[var(--color-muted)] text-[var(--color-muted-foreground)]",
  success: "bg-[var(--color-success-muted)] text-[var(--color-success)]",
  warning: "bg-[var(--color-warning-muted)] text-[var(--color-warning)]",
  destructive: "bg-red-100 text-red-700",
  info: "bg-[var(--color-info-muted)] text-[var(--color-info)]",
  outline: "border border-[var(--color-border)] bg-transparent text-[var(--color-muted-foreground)]",
} as const;

export function Badge({
  className,
  variant = "default",
  ...props
}: HTMLAttributes<HTMLSpanElement> & { variant?: keyof typeof variants }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        variants[variant],
        className,
      )}
      {...props}
    />
  );
}
