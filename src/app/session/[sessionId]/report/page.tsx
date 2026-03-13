"use client";

import { useParams } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Home,
  Download,
  ShieldAlert,
  TrendingUp,
  AlertTriangle,
  MessageSquare,
  CheckCircle2,
  XCircle,
  MinusCircle,
} from "lucide-react";
import Link from "next/link";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { QuestionCard } from "@/components/report/question-card";
import { cn } from "@/lib/utils";
import type { ReportData } from "@/types";

const decisionConfig = {
  strong_hire: { label: "STRONG HIRE", color: "text-success", bg: "bg-success/10", border: "border-success/30" },
  hire: { label: "HIRE", color: "text-success", bg: "bg-success/10", border: "border-success/20" },
  lean_hire: { label: "LEAN HIRE", color: "text-accent-light", bg: "bg-accent/10", border: "border-accent/20" },
  lean_no_hire: { label: "LEAN NO HIRE", color: "text-warning", bg: "bg-warning/10", border: "border-warning/20" },
  no_hire: { label: "NO HIRE", color: "text-danger", bg: "bg-danger/10", border: "border-danger/30" },
};

const verdictIcon = {
  passed: <CheckCircle2 className="w-4 h-4 text-success" />,
  partially_passed: <MinusCircle className="w-4 h-4 text-warning" />,
  failed: <XCircle className="w-4 h-4 text-danger" />,
};

const MODEL_PRICING: Record<string, { input: number; output: number }> = {
  "gpt-4o": { input: 2.5, output: 10 },
  "gpt-4o-mini": { input: 0.15, output: 0.6 },
  "claude-sonnet-4-20250514": { input: 3, output: 15 },
  "claude-haiku-4-5-20251001": { input: 0.8, output: 4 },
};
const TTS_PRICE_PER_MILLION_CHARS = 15;

function estimateCost(
  model: string,
  usage: { prompt_tokens: number; completion_tokens: number; tts_characters?: number }
): string | null {
  const pricing = MODEL_PRICING[model];
  if (!pricing) return null;
  const llmCost =
    (usage.prompt_tokens / 1_000_000) * pricing.input +
    (usage.completion_tokens / 1_000_000) * pricing.output;
  const ttsCost = usage.tts_characters
    ? (usage.tts_characters / 1_000_000) * TTS_PRICE_PER_MILLION_CHARS
    : 0;
  const total = llmCost + ttsCost;
  return total < 0.01 ? total.toFixed(4) : total.toFixed(2);
}

export default function ReportPage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const [report, setReport] = useState<ReportData | null>(null);
  const [tokenUsage, setTokenUsage] = useState<{ prompt_tokens: number; completion_tokens: number; total_tokens: number; tts_characters?: number } | null>(null);
  const [modelInfo, setModelInfo] = useState<{ provider: string; model: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isPrintMode, setIsPrintMode] = useState(false);

  const handleSavePDF = useCallback(() => {
    setIsPrintMode(true);
    setTimeout(() => {
      window.print();
      setIsPrintMode(false);
    }, 100);
  }, []);

  useEffect(() => {
    Promise.all([
      fetch(`/api/report/${sessionId}`).then((res) => {
        if (!res.ok) throw new Error("Failed to load report");
        return res.json();
      }),
      fetch("/api/config").then((res) => res.ok ? res.json() : null),
    ])
      .then(([data, config]) => {
        setReport(data.report.report_data);
        setTokenUsage(data.tokenUsage || null);
        setModelInfo(config);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, [sessionId]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted text-sm">Generating hiring committee decision...</p>
        </div>
      </div>
    );
  }

  if (error || !report) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-danger mb-4">{error || "Report not found"}</p>
          <Link href={`/session/${sessionId}`}>
            <Button variant="secondary">Back to Session</Button>
          </Link>
        </div>
      </div>
    );
  }

  const dc = decisionConfig[report.decision] || decisionConfig.lean_no_hire;

  return (
    <div className="min-h-screen">
      <header className="border-b border-border no-print">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href={`/session/${sessionId}`} className="text-muted hover:text-foreground transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <span className="font-semibold tracking-tight">Hiring Committee Decision</span>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="primary" size="sm" onClick={handleSavePDF}>
              <Download className="w-4 h-4 mr-1.5" />
              Save PDF
            </Button>
            <Link href="/">
              <Button variant="secondary" size="sm">
                <Home className="w-4 h-4 mr-1.5" />
                New Session
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8 space-y-8" dir="auto">
        {/* Decision Banner */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <Card className={cn("border-2", dc.border)}>
            <div className="flex flex-col md:flex-row items-center gap-6">
              <div className={cn("px-6 py-4 rounded-xl text-center", dc.bg)}>
                <p className="text-xs text-muted mb-1 uppercase tracking-wider">Decision</p>
                <p className={cn("text-3xl font-bold", dc.color)}>{dc.label}</p>
                <p className="text-lg text-muted mt-1">{report.hire_probability}% hire probability</p>
              </div>
              <div className="flex-1 text-center md:text-left" dir="auto">
                <p className="text-foreground/90 leading-relaxed">{report.summary}</p>
              </div>
            </div>
          </Card>
        </motion.div>

        {/* Danger Zone Performance + Technical Gaps */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {report.danger_zone_performance.length > 0 && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
              <Card className="h-full">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <ShieldAlert className="w-5 h-5 text-danger" />
                    Danger Zone Results
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {report.danger_zone_performance.map((dz, i) => (
                      <div key={i} className="flex items-start gap-3">
                        {verdictIcon[dz.result]}
                        <div>
                          <p className="text-sm font-medium">{dz.zone}</p>
                          <p className="text-xs text-muted" dir="auto">{dz.detail}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
            <Card className="h-full">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-warning" />
                  Technical Gaps
                </CardTitle>
              </CardHeader>
              <CardContent>
                {report.technical_gaps.length === 0 ? (
                  <p className="text-sm text-muted">No significant technical gaps identified.</p>
                ) : (
                  <div className="space-y-3">
                    {report.technical_gaps.map((gap, i) => (
                      <div key={i} className="flex items-start gap-3">
                        <Badge variant={gap.severity === "major" ? "danger" : gap.severity === "moderate" ? "warning" : "default"}>
                          {gap.severity}
                        </Badge>
                        <div>
                          <p className="text-sm font-medium">{gap.area}</p>
                          <p className="text-xs text-muted" dir="auto">{gap.detail}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Strengths + Communication Flags */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-success">
                  <TrendingUp className="w-5 h-5" />
                  Strengths Demonstrated
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {report.strengths_demonstrated.map((s, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm" dir="auto">
                      <span className="w-1.5 h-1.5 rounded-full bg-success mt-1.5 flex-shrink-0" />
                      {s}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </motion.div>

          {report.communication_flags.length > 0 && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-warning">
                    <MessageSquare className="w-5 h-5" />
                    Communication Flags
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {report.communication_flags.map((f, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm" dir="auto">
                        <span className="w-1.5 h-1.5 rounded-full bg-warning mt-1.5 flex-shrink-0" />
                        {f}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </div>

        {/* Final Verdict */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <Card className="border-border-light">
            <CardHeader>
              <CardTitle>Hiring Committee Verdict</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-foreground/90 leading-relaxed" dir="auto">{report.final_verdict}</p>
            </CardContent>
          </Card>
        </motion.div>

        {/* Per-question feedback */}
        <div>
          <h2 className="text-lg font-semibold mb-4">Question-by-Question Breakdown</h2>
          <div className="space-y-4">
            {report.question_feedback.map((feedback, i) => (
              <QuestionCard key={i} feedback={feedback} index={i} forceExpanded={isPrintMode} />
            ))}
          </div>
        </div>

        {/* Recommendations */}
        {report.recommendations.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
            <Card>
              <CardHeader>
                <CardTitle>What to Work On</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {report.recommendations.map((r, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm" dir="auto">
                      <span className="text-accent font-mono text-xs mt-0.5">{i + 1}.</span>
                      {r}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Session Statistics */}
        {tokenUsage && tokenUsage.total_tokens > 0 && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45 }}>
            <div className="border-t border-border pt-6 mt-4 space-y-1">
              {modelInfo && (
                <p className="text-xs text-muted text-center">
                  Model: {modelInfo.model}
                </p>
              )}
              <p className="text-xs text-muted text-center">
                Session used {tokenUsage.total_tokens.toLocaleString()} tokens
                ({tokenUsage.prompt_tokens.toLocaleString()} prompt + {tokenUsage.completion_tokens.toLocaleString()} completion)
                {tokenUsage.tts_characters ? ` + ${tokenUsage.tts_characters.toLocaleString()} TTS characters` : ""}
              </p>
              {(() => {
                const cost = estimateCost(modelInfo?.model || "", tokenUsage);
                return cost ? (
                  <p className="text-xs text-muted text-center">
                    Estimated cost: ${cost}
                  </p>
                ) : null;
              })()}
            </div>
          </motion.div>
        )}
        {/* Bottom CTA */}
        <div className="flex justify-center pt-4 pb-8 no-print">
          <Link href="/">
            <Button size="lg">
              <Home className="w-5 h-5 mr-2" />
              Start New Session
            </Button>
          </Link>
        </div>
      </main>
    </div>
  );
}
