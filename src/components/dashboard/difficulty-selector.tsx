"use client";

import { cn } from "@/lib/utils";
import type { InterviewDifficulty } from "@/types";

interface DifficultySelectorProps {
  value: InterviewDifficulty;
  onChange: (value: InterviewDifficulty) => void;
}

const options: { value: InterviewDifficulty; label: string; description: string }[] = [
  {
    value: "friendly",
    label: "Friendly",
    description: "Encouraging, hints when you struggle",
  },
  {
    value: "realistic",
    label: "Realistic",
    description: "Fair but expects specifics",
  },
  {
    value: "tough",
    label: "Tough",
    description: "High-bar, challenges everything",
  },
];

export function DifficultySelector({ value, onChange }: DifficultySelectorProps) {
  return (
    <div className="inline-flex flex-col items-center gap-2">
      <span className="text-xs text-muted">Difficulty</span>
      <div className="inline-flex rounded-lg border border-border bg-surface p-1 gap-1">
        {options.map((option) => (
          <button
            key={option.value}
            onClick={() => onChange(option.value)}
            className={cn(
              "px-4 py-2 rounded-md text-sm font-medium transition-colors cursor-pointer",
              value === option.value
                ? option.value === "friendly"
                  ? "bg-success/10 text-success"
                  : option.value === "realistic"
                  ? "bg-accent/10 text-accent-light"
                  : "bg-danger/10 text-danger"
                : "text-muted hover:text-foreground hover:bg-surface-light"
            )}
          >
            <div>{option.label}</div>
            <div className={cn(
              "text-[10px] font-normal mt-0.5",
              value === option.value ? "opacity-80" : "opacity-50"
            )}>
              {option.description}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
