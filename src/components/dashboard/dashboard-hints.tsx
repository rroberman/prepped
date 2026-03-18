"use client";

import { useEffect, useState, useMemo } from "react";
import { HintList } from "@/components/ui/hint-banner";
import { useHints } from "@/hooks/use-hints";
import { getDashboardHints } from "@/lib/hints";

interface DashboardHintsProps {
  companyName: string | null;
  companyDomain: string | null;
}

export function DashboardHints({ companyName, companyDomain }: DashboardHintsProps) {
  const [extraData, setExtraData] = useState<{
    sameCompanyCount: number;
    lastReportGaps: string[];
  }>({ sameCompanyCount: 0, lastReportGaps: [] });

  useEffect(() => {
    if (!companyDomain) return;
    fetch("/api/sessions/list")
      .then((res) => res.json())
      .then((result) => {
        const sessions = result.sessions || [];
        const sameCompany = sessions.filter(
          (s: { company_domain: string | null }) => s.company_domain === companyDomain
        );
        setExtraData((prev) => ({ ...prev, sameCompanyCount: sameCompany.length }));
      })
      .catch(() => {});
  }, [companyDomain]);

  const allHints = useMemo(
    () => getDashboardHints({
      sessionCount: 1,
      sameCompanyCount: extraData.sameCompanyCount,
      companyName,
      lastReportGaps: extraData.lastReportGaps,
      hasUsedVoice: false, // We can't easily know this, so always show the hint once
    }),
    [extraData, companyName]
  );

  const { hints, dismiss } = useHints(allHints);

  if (hints.length === 0) return null;

  return (
    <div className="mb-6">
      <HintList hints={hints} onDismiss={dismiss} />
    </div>
  );
}
