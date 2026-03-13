"use client";

import { cn } from "@/lib/utils";
import type { InterviewPhase } from "@/types";

const phases: { key: InterviewPhase; label: string }[] = [
  { key: "warmup", label: "Warmup" },
  { key: "technical_deep_dive", label: "Technical" },
  { key: "danger_zones", label: "Danger Zones" },
  { key: "system_design", label: "System Design" },
  { key: "closing", label: "Closing" },
];

interface PhaseIndicatorProps {
  currentPhase: InterviewPhase;
}

export function PhaseIndicator({ currentPhase }: PhaseIndicatorProps) {
  const currentIdx = phases.findIndex((p) => p.key === currentPhase);

  return (
    <div className="flex items-center gap-1">
      {phases.map((phase, i) => (
        <div key={phase.key} className="flex items-center">
          <div
            className={cn(
              "px-2.5 py-1 rounded-full text-xs font-medium transition-colors",
              i < currentIdx && "bg-success/10 text-success",
              i === currentIdx && "bg-accent/10 text-accent",
              i > currentIdx && "bg-surface-light text-muted",
              phase.key === "danger_zones" && i === currentIdx && "bg-danger/10 text-danger"
            )}
          >
            {phase.label}
          </div>
          {i < phases.length - 1 && (
            <div className={cn(
              "w-4 h-px mx-0.5",
              i < currentIdx ? "bg-success/30" : "bg-border"
            )} />
          )}
        </div>
      ))}
    </div>
  );
}
