"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { CheckCircle2, MinusCircle, XCircle } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { ReportData, DangerZoneVerdict, QuestionFeedback, InterviewPhase } from "@/types";

interface SessionComparisonProps {
  sessionIdA: string;
  sessionIdB: string;
}

const decisionConfig: Record<string, { label: string; variant: "success" | "accent" | "warning" | "danger" | "default" }> = {
  strong_hire: { label: "Strong Hire", variant: "success" },
  hire: { label: "Hire", variant: "success" },
  lean_hire: { label: "Lean Hire", variant: "accent" },
  lean_no_hire: { label: "Lean No Hire", variant: "warning" },
  no_hire: { label: "No Hire", variant: "danger" },
};

const verdictIcon: Record<string, { icon: typeof CheckCircle2; variant: "success" | "warning" | "danger" }> = {
  passed: { icon: CheckCircle2, variant: "success" },
  partially_passed: { icon: MinusCircle, variant: "warning" },
  failed: { icon: XCircle, variant: "danger" },
};

function VerdictBadge({ result }: { result: DangerZoneVerdict["result"] }) {
  const config = verdictIcon[result];
  if (!config) return <Badge variant="default">{result}</Badge>;
  const Icon = config.icon;
  return (
    <Badge variant={config.variant}>
      <Icon className="w-3 h-3 mr-1" />
      {result.replace("_", " ")}
    </Badge>
  );
}

function groupByPhase(feedback: QuestionFeedback[]): Record<string, QuestionFeedback[]> {
  const grouped: Record<string, QuestionFeedback[]> = {};
  for (const qf of feedback) {
    if (!grouped[qf.phase]) grouped[qf.phase] = [];
    grouped[qf.phase].push(qf);
  }
  return grouped;
}

const phaseLabels: Record<InterviewPhase, string> = {
  warmup: "Warmup",
  technical_deep_dive: "Technical Deep Dive",
  danger_zones: "Danger Zones",
  system_design: "System Design",
  closing: "Closing",
};

export function SessionComparison({ sessionIdA, sessionIdB }: SessionComparisonProps) {
  const [reportA, setReportA] = useState<ReportData | null>(null);
  const [reportB, setReportB] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function fetchReports() {
      try {
        const [resA, resB] = await Promise.all([
          fetch(`/api/report/${sessionIdA}`),
          fetch(`/api/report/${sessionIdB}`),
        ]);
        if (!resA.ok) throw new Error("Failed to load report A");
        if (!resB.ok) throw new Error("Failed to load report B");
        const [dataA, dataB] = await Promise.all([resA.json(), resB.json()]);
        if (!cancelled) {
          setReportA(dataA.report.report_data as ReportData);
          setReportB(dataB.report.report_data as ReportData);
          setLoading(false);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Unknown error");
          setLoading(false);
        }
      }
    }

    fetchReports();
    return () => { cancelled = true; };
  }, [sessionIdA, sessionIdB]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !reportA || !reportB) {
    return (
      <div className="text-center py-8">
        <p className="text-danger text-sm">{error || "Could not load reports"}</p>
      </div>
    );
  }

  // Collect all danger zones across both sessions
  const allZones = new Map<string, { a?: DangerZoneVerdict; b?: DangerZoneVerdict }>();
  for (const dz of reportA.danger_zone_performance) {
    allZones.set(dz.zone, { a: dz });
  }
  for (const dz of reportB.danger_zone_performance) {
    const existing = allZones.get(dz.zone) || {};
    allZones.set(dz.zone, { ...existing, b: dz });
  }

  // Strengths comparison
  const strengthsA = new Set(reportA.strengths_demonstrated);
  const strengthsB = new Set(reportB.strengths_demonstrated);
  const bothStrengths = [...strengthsA].filter((s) => strengthsB.has(s));
  const onlyA = [...strengthsA].filter((s) => !strengthsB.has(s));
  const onlyB = [...strengthsB].filter((s) => !strengthsA.has(s));

  // Question scores by phase
  const phasesA = groupByPhase(reportA.question_feedback);
  const phasesB = groupByPhase(reportB.question_feedback);
  const allPhases = [...new Set([...Object.keys(phasesA), ...Object.keys(phasesB)])] as InterviewPhase[];

  const dcA = decisionConfig[reportA.decision];
  const dcB = decisionConfig[reportB.decision];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      {/* Decision & Score */}
      <Card>
        <CardHeader>
          <CardTitle>Decision Comparison</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-6">
            <div className="text-center space-y-2">
              <p className="text-xs text-muted uppercase tracking-wide">Session A</p>
              {dcA && <Badge variant={dcA.variant}>{dcA.label}</Badge>}
              <p className="text-sm text-muted">
                Score: {reportA.hire_probability}%
              </p>
            </div>
            <div className="text-center space-y-2">
              <p className="text-xs text-muted uppercase tracking-wide">Session B</p>
              {dcB && <Badge variant={dcB.variant}>{dcB.label}</Badge>}
              <p className="text-sm text-muted">
                Score: {reportB.hire_probability}%
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Danger Zone Verdicts */}
      {allZones.size > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Danger Zone Verdicts</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="grid grid-cols-[1fr_auto_auto] gap-4 text-xs text-muted uppercase tracking-wide pb-1 border-b border-border">
                <span>Zone</span>
                <span className="w-32 text-center">Session A</span>
                <span className="w-32 text-center">Session B</span>
              </div>
              {[...allZones.entries()].map(([zone, { a, b }]) => (
                <div key={zone} className="grid grid-cols-[1fr_auto_auto] gap-4 items-center">
                  <span className="text-sm font-medium" dir="auto">{zone}</span>
                  <div className="w-32 flex justify-center">
                    {a ? <VerdictBadge result={a.result} /> : <span className="text-xs text-muted">--</span>}
                  </div>
                  <div className="w-32 flex justify-center">
                    {b ? <VerdictBadge result={b.result} /> : <span className="text-xs text-muted">--</span>}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Strengths */}
      <Card>
        <CardHeader>
          <CardTitle>Strengths Comparison</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {bothStrengths.length > 0 && (
              <div>
                <p className="text-xs text-muted uppercase tracking-wide mb-2">Both Sessions</p>
                <div className="flex flex-wrap gap-2">
                  {bothStrengths.map((s) => (
                    <Badge key={s} variant="success">{s}</Badge>
                  ))}
                </div>
              </div>
            )}
            {onlyA.length > 0 && (
              <div>
                <p className="text-xs text-muted uppercase tracking-wide mb-2">Session A Only</p>
                <div className="flex flex-wrap gap-2">
                  {onlyA.map((s) => (
                    <Badge key={s} variant="accent">{s}</Badge>
                  ))}
                </div>
              </div>
            )}
            {onlyB.length > 0 && (
              <div>
                <p className="text-xs text-muted uppercase tracking-wide mb-2">Session B Only</p>
                <div className="flex flex-wrap gap-2">
                  {onlyB.map((s) => (
                    <Badge key={s} variant="warning">{s}</Badge>
                  ))}
                </div>
              </div>
            )}
            {bothStrengths.length === 0 && onlyA.length === 0 && onlyB.length === 0 && (
              <p className="text-sm text-muted">No strengths recorded.</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Question Scores by Phase */}
      {allPhases.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Question Scores by Phase</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {allPhases.map((phase) => {
                const questionsA = phasesA[phase] || [];
                const questionsB = phasesB[phase] || [];
                const avgA = questionsA.length > 0
                  ? (questionsA.reduce((sum, q) => sum + q.score, 0) / questionsA.length).toFixed(1)
                  : null;
                const avgB = questionsB.length > 0
                  ? (questionsB.reduce((sum, q) => sum + q.score, 0) / questionsB.length).toFixed(1)
                  : null;

                return (
                  <div key={phase} className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">{phaseLabels[phase] || phase}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="flex items-center gap-2 text-sm text-muted">
                        <span>A:</span>
                        {avgA !== null ? (
                          <span className={Number(avgA) >= 7 ? "text-success" : Number(avgA) >= 5 ? "text-warning" : "text-danger"}>
                            {avgA}/10
                          </span>
                        ) : (
                          <span>--</span>
                        )}
                        <span className="text-xs">({questionsA.length} Q)</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted">
                        <span>B:</span>
                        {avgB !== null ? (
                          <span className={Number(avgB) >= 7 ? "text-success" : Number(avgB) >= 5 ? "text-warning" : "text-danger"}>
                            {avgB}/10
                          </span>
                        ) : (
                          <span>--</span>
                        )}
                        <span className="text-xs">({questionsB.length} Q)</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </motion.div>
  );
}
