"use client";

import { AlertTriangle } from "lucide-react";

export function DemoBanner() {
  if (process.env.NEXT_PUBLIC_DEMO_MODE !== "true") return null;

  return (
    <div className="bg-amber-500/10 border-b border-amber-500/20 px-4 py-2">
      <div className="max-w-5xl mx-auto flex items-center justify-center gap-2 text-xs text-amber-400">
        <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
        <span>
          This is a demo with sample data.{" "}
          <a
            href="https://github.com/rroberman/prepped"
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:text-amber-300 transition-colors"
          >
            Get the real thing
          </a>{" "}
          — run locally with your own API key.
        </span>
      </div>
    </div>
  );
}
