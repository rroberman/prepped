"use client";

import { useEffect, useState, useMemo } from "react";
import { HintList } from "@/components/ui/hint-banner";
import { useHints } from "@/hooks/use-hints";
import { getLandingHints } from "@/lib/hints";

export function LandingHints() {
  const [sessionCount, setSessionCount] = useState(0);

  useEffect(() => {
    fetch("/api/sessions/list")
      .then((res) => res.json())
      .then((result) => {
        setSessionCount(result.sessions?.length || 0);
      })
      .catch(() => {});
  }, []);

  const allHints = useMemo(
    () => getLandingHints({ sessionCount, difficulties: [] }),
    [sessionCount]
  );

  const { hints, dismiss } = useHints(allHints);

  if (hints.length === 0) return null;

  return (
    <div className="max-w-lg w-full mb-8">
      <HintList hints={hints} onDismiss={dismiss} />
    </div>
  );
}
