import { cn } from "@/lib/utils/cn";
import type { InputHTMLAttributes } from "react";

export function Checkbox({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      type="checkbox"
      className={cn(
        "h-4 w-4 rounded border-[var(--color-border)] text-[var(--color-primary)]",
        "focus:ring-2 focus:ring-[var(--color-ring)] focus:ring-offset-0",
        className,
      )}
      {...props}
    />
  );
}
