"use client";

import { useState, useCallback, useMemo } from "react";
import type { Hint } from "@/lib/hints";

const STORAGE_KEY = "prepped:dismissed-hints";

function getDismissedIds(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? new Set(JSON.parse(stored)) : new Set();
  } catch {
    return new Set();
  }
}

function saveDismissedIds(ids: Set<string>) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...ids]));
  } catch {
    // localStorage unavailable
  }
}

export function useHints(allHints: Hint[]) {
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(getDismissedIds);

  const hints = useMemo(
    () => allHints.filter((h) => !dismissedIds.has(h.id)),
    [allHints, dismissedIds]
  );

  const dismiss = useCallback((id: string) => {
    setDismissedIds((prev) => {
      const next = new Set(prev);
      next.add(id);
      saveDismissedIds(next);
      return next;
    });
  }, []);

  return { hints, dismiss };
}
