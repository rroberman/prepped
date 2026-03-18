"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  ShieldAlert,
  TrendingUp,
  ArrowUp,
  ArrowDown,
  Minus,
  Target,
  BarChart3,
} from "lucide-react";
import Link from "next/link";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { GroupInsights, HireDecision } from "@/types";

const decisionConfig: Record<string, { label: string; variant: "success" | "accent" | "warning" | "danger" | "default" }> = {
  strong_hire: { label: "Strong Hire", variant: "success" },
  hire: { label: "Hire", variant: "success" },
  lean_hire: { label: "Lean Hire", variant: "accent" },
  lean_no_hire: { label: "Lean No Hire", variant: "warning" },
  no_hire: { label: "No Hire", variant: "danger" },
};

const difficultyVariant: Record<string, "default" | "accent" | "danger"> = {
  friendly: "default",
  realistic: "accent",
  tough: "danger",
};

const decisionRank: Record<string, number> = {
  no_hire: 0,
  lean_no_hire: 1,
  lean_hire: 2,
  hire: 3,
  strong_hire: 4,
};

function formatDate(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return dateStr;
  }
}

function averageScore(scores: number[]): string {
  if (scores.length === 0) return "0";
  const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
  return avg % 1 === 0 ? avg.toString() : avg.toFixed(1);
}

export default function InsightsPage() {
  const { groupId } = useParams<{ groupId: string }>();
  const [data, setData] = useState<GroupInsights | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/insights/${encodeURIComponent(groupId)}`)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load insights");
        return res.json();
      })
      .then((json) => {
        setData(json);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, [groupId]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted text-sm">Loading insights...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-danger mb-4">{error || "Insights not found"}</p>
          <Link href="/history">
            <Button variant="secondary">Back to History</Button>
          </Link>
        </div>
      </div>
    );
  }

  const { group, trends, dangerZones, strengths, skillCoverage, difficultyBreakdown } = data;
  const displayName = group.groupLabel || group.companyName || group.company_domain || "Unknown";
  const consistentStrengths = strengths.filter((s) => s.count >= 2);

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="border-b border-border">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center gap-4">
          <Link href="/history" className="text-muted hover:text-foreground transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="font-semibold tracking-tight text-lg" dir="auto">{displayName}</h1>
            <p className="text-sm text-muted">
              {group.sessionCount} session{group.sessionCount !== 1 ? "s" : ""}
              {group.dateRange && (
                <> &middot; {formatDate(group.dateRange.first)} &ndash; {formatDate(group.dateRange.last)}</>
              )}
            </p>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8 space-y-8" dir="auto">
        {/* Performance Trend */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-accent-light" />
                Performance Trend
              </CardTitle>
            </CardHeader>
            <CardContent>
              {trends.length === 0 ? (
                <p className="text-sm text-muted">No sessions with reports yet.</p>
              ) : (
                <div className="space-y-2">
                  {trends.map((trend, i) => {
                    const dc = trend.decision ? decisionConfig[trend.decision] : null;
                    const prevTrend = i > 0 ? trends[i - 1] : null;

                    let changeIndicator = null;
                    if (prevTrend && trend.decision && prevTrend.decision) {
                      const curr = decisionRank[trend.decision] ?? 0;
                      const prev = decisionRank[prevTrend.decision] ?? 0;
                      if (curr > prev) {
                        changeIndicator = <ArrowUp className="w-4 h-4 text-success" />;
                      } else if (curr < prev) {
                        changeIndicator = <ArrowDown className="w-4 h-4 text-danger" />;
                      } else {
                        changeIndicator = <Minus className="w-4 h-4 text-muted" />;
                      }
                    }

                    return (
                      <div key={trend.sessionId}>
                        {changeIndicator && (
                          <div className="flex justify-center py-1">
                            {changeIndicator}
                          </div>
                        )}
                        <div className="flex items-center gap-3 py-2 px-3 rounded-lg bg-surface-light/50">
                          <span className="text-sm text-muted w-28 flex-shrink-0">
                            {formatDate(trend.date)}
                          </span>
                          <Badge variant={difficultyVariant[trend.difficulty] || "default"}>
                            {trend.difficulty}
                          </Badge>
                          {dc && (
                            <Badge variant={dc.variant}>
                              {dc.label}
                            </Badge>
                          )}
                          {trend.overallScore !== null && (
                            <span className="text-sm text-muted ml-auto">
                              Score: {trend.overallScore}/10
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Danger Zones & Strengths */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <Card className="h-full">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ShieldAlert className="w-5 h-5 text-danger" />
                  Recurring Danger Zones
                </CardTitle>
              </CardHeader>
              <CardContent>
                {dangerZones.length === 0 ? (
                  <p className="text-sm text-muted">No recurring danger zones identified.</p>
                ) : (
                  <div className="space-y-3">
                    {dangerZones.map((dz, i) => (
                      <div key={i} className="flex items-center gap-3">
                        <span className="text-sm font-medium flex-1" dir="auto">{dz.area}</span>
                        <Badge variant="default">{dz.count}x</Badge>
                        {dz.resolved && (
                          <Badge variant="success">Resolved</Badge>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
            <Card className="h-full">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-success">
                  <TrendingUp className="w-5 h-5" />
                  Consistent Strengths
                </CardTitle>
              </CardHeader>
              <CardContent>
                {consistentStrengths.length === 0 ? (
                  <p className="text-sm text-muted">No consistent strengths identified yet.</p>
                ) : (
                  <div className="space-y-3">
                    {consistentStrengths.map((s, i) => (
                      <div key={i} className="flex items-center gap-3">
                        <span className="text-sm font-medium flex-1" dir="auto">{s.strength}</span>
                        <Badge variant="default">{s.count}x</Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Skill Coverage Map */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="w-5 h-5 text-accent-light" />
                Skill Coverage
              </CardTitle>
            </CardHeader>
            <CardContent>
              {skillCoverage.length === 0 ? (
                <p className="text-sm text-muted">No skill data available.</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {skillCoverage.map((skill, i) =>
                    skill.tested ? (
                      <Badge key={i} variant="accent">
                        {skill.skill} ({averageScore(skill.scores)})
                      </Badge>
                    ) : (
                      <Badge key={i} variant="default">
                        {skill.skill}
                      </Badge>
                    )
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Difficulty Progression */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-accent-light" />
                Difficulty Progression
              </CardTitle>
            </CardHeader>
            <CardContent>
              {difficultyBreakdown.length === 0 ? (
                <p className="text-sm text-muted">No difficulty data available.</p>
              ) : (
                <div className="space-y-4">
                  {difficultyBreakdown.map((db, i) => (
                    <div key={i} className="space-y-1">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium capitalize">{db.difficulty}</span>
                        <span className="text-muted">
                          {db.sessions} session{db.sessions !== 1 ? "s" : ""} &middot; {Math.round(db.passRate)}% pass rate
                        </span>
                      </div>
                      <div className="h-3 rounded-full bg-surface-light overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${
                            db.passRate > 60
                              ? "bg-success"
                              : db.passRate >= 30
                              ? "bg-warning"
                              : "bg-danger"
                          }`}
                          style={{ width: `${db.passRate}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </main>
    </div>
  );
}
