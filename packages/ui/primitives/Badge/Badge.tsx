import type { BadgeProps } from "./Badge.types";

export function Badge({ label }: BadgeProps) {
  return (
    <span className="font-mono text-xs px-2 py-1 rounded-sm bg-surface border border-border text-muted">
      {label}
    </span>
  );
}