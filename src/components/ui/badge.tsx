import { cn } from "@/lib/cn";
import type { HTMLAttributes } from "react";

type Tone = "neutral" | "brand" | "pulse" | "info" | "success";

const TONE: Record<Tone, string> = {
  neutral: "bg-[var(--surface-sunken)] text-[var(--text-secondary)]",
  brand: "bg-[var(--color-voltage-100)] text-[var(--color-voltage-800)]",
  pulse: "bg-[var(--color-pulse-100)] text-[var(--color-pulse-700)]",
  info: "bg-[var(--color-info-100)] text-[var(--color-info-600)]",
  success: "bg-[var(--color-success-100)] text-[var(--color-success-600)]",
};

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: Tone;
}

export function Badge({ tone = "neutral", className, ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 font-mono text-[0.6875rem] font-medium uppercase tracking-wide",
        TONE[tone],
        className,
      )}
      {...props}
    />
  );
}
