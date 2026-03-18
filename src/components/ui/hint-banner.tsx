"use client";

import { X, Lightbulb, TrendingUp, AlertTriangle } from "lucide-react";
import { motion } from "framer-motion";
import type { Hint } from "@/lib/hints";

const variantConfig = {
  info: {
    icon: Lightbulb,
    bg: "bg-accent/5",
    border: "border-accent/20",
    text: "text-accent-light",
    iconColor: "text-accent",
  },
  success: {
    icon: TrendingUp,
    bg: "bg-success/5",
    border: "border-success/20",
    text: "text-success",
    iconColor: "text-success",
  },
  warning: {
    icon: AlertTriangle,
    bg: "bg-warning/5",
    border: "border-warning/20",
    text: "text-warning",
    iconColor: "text-warning",
  },
};

interface HintBannerProps {
  hint: Hint;
  onDismiss: (id: string) => void;
}

export function HintBanner({ hint, onDismiss }: HintBannerProps) {
  const config = variantConfig[hint.variant];
  const Icon = config.icon;

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      exit={{ opacity: 0, height: 0 }}
      className={`rounded-lg border ${config.border} ${config.bg} px-4 py-2.5 flex items-center gap-3`}
    >
      <Icon className={`w-4 h-4 ${config.iconColor} flex-shrink-0`} />
      <p className={`text-sm ${config.text} flex-1`}>{hint.message}</p>
      <button
        onClick={() => onDismiss(hint.id)}
        className="p-1 rounded-md text-muted hover:text-foreground transition-colors cursor-pointer flex-shrink-0"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </motion.div>
  );
}

interface HintListProps {
  hints: Hint[];
  onDismiss: (id: string) => void;
}

export function HintList({ hints, onDismiss }: HintListProps) {
  if (hints.length === 0) return null;

  return (
    <div className="space-y-2">
      {hints.map((hint) => (
        <HintBanner key={hint.id} hint={hint} onDismiss={onDismiss} />
      ))}
    </div>
  );
}
