import { cn } from "@/lib/utils/cn";
import type { LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

const accentStyles = {
  default: "bg-[var(--color-muted)] text-[var(--color-muted-foreground)]",
  primary: "bg-[var(--color-primary-muted)] text-[var(--color-primary)]",
  success: "bg-[var(--color-success-muted)] text-[var(--color-success)]",
  warning: "bg-[var(--color-warning-muted)] text-[var(--color-warning)]",
  info: "bg-[var(--color-info-muted)] text-[var(--color-info)]",
} as const;

export function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  accent = "default",
  className,
}: {
  label: string;
  value: React.ReactNode;
  hint?: string;
  icon?: LucideIcon;
  accent?: keyof typeof accentStyles;
  className?: string;
}) {
  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1 space-y-2">
            <p className="text-sm font-medium text-[var(--color-muted-foreground)]">{label}</p>
            <p className="tabular-nums text-2xl font-semibold tracking-tight">{value}</p>
            {hint && (
              <p className="text-xs text-[var(--color-muted-foreground)]">{hint}</p>
            )}
          </div>
          {Icon && (
            <div
              className={cn(
                "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg",
                accentStyles[accent],
              )}
            >
              <Icon className="h-5 w-5" />
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
