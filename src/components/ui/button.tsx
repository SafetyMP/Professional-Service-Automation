import { cn } from "@/lib/utils/cn";
import type { ButtonHTMLAttributes } from "react";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "destructive";
  size?: "sm" | "md";
};

export function Button({
  className,
  variant = "primary",
  size = "md",
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center rounded-md font-medium transition-colors disabled:opacity-50",
        size === "sm" ? "px-3 py-1.5 text-sm" : "px-4 py-2 text-sm",
        variant === "primary" && "bg-[var(--color-primary)] text-[var(--color-primary-foreground)] hover:opacity-90",
        variant === "secondary" && "border border-[var(--color-border)] bg-[var(--color-card)] hover:bg-[var(--color-muted)]",
        variant === "ghost" && "hover:bg-[var(--color-muted)]",
        variant === "destructive" && "bg-[var(--color-destructive)] text-white hover:opacity-90",
        className,
      )}
      {...props}
    />
  );
}
