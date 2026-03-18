"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Clock,
  Briefcase,
  FileText,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  BarChart3,
  Trash2,
  Layers,
  List,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { HintList } from "@/components/ui/hint-banner";
import { useHints } from "@/hooks/use-hints";
import { getHistoryHints } from "@/lib/hints";
import type { Session, SessionGroup, InterviewDifficulty } from "@/types";

interface SessionWithUsage extends Session {
  tokenUsage: { prompt_tokens: number; completion_tokens: number; total_tokens: number; tts_characters: number };
  interviewDifficulty: InterviewDifficulty | null;
  reportDecision: string | null;
  reportScore: number | null;
}

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

const statusConfig: Record<string, { variant: "default" | "success" | "warning" | "accent" | "danger"; label: string }> = {
  pending: { variant: "default", label: "Pending" },
  analyzing: { variant: "accent", label: "Analyzing" },
  ready: { variant: "warning", label: "Ready" },
  interviewing: { variant: "accent", label: "Interviewing" },
  completed: { variant: "success", label: "Completed" },
};

const decisionLabels: Record<string, { label: string; variant: "default" | "success" | "warning" | "accent" | "danger" }> = {
  strong_hire: { label: "Strong Hire", variant: "success" },
  hire: { label: "Hire", variant: "success" },
  lean_hire: { label: "Lean Hire", variant: "accent" },
  lean_no_hire: { label: "Lean No Hire", variant: "warning" },
  no_hire: { label: "No Hire", variant: "danger" },
};

function SessionCard({
  session,
  model,
  index,
  onDelete,
}: {
  session: SessionWithUsage;
  model: string;
  index: number;
  onDelete: (e: React.MouseEvent, id: string) => void;
}) {
  const config = statusConfig[session.status] || statusConfig.pending;
  const link =
    session.status === "completed"
      ? `/session/${session.id}/report`
      : session.status === "interviewing"
      ? `/session/${session.id}/interview`
      : `/session/${session.id}`;

  return (
    <motion.div
      key={session.id}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
    >
      <Link href={link}>
        <Card className="hover:border-border-light transition-colors cursor-pointer">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4 min-w-0">
              <div className="p-2 rounded-lg bg-surface-light">
                <Briefcase className="w-5 h-5 text-accent" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <h3 className="font-medium text-sm truncate">
                    {session.job_title || "Untitled Position"}
                  </h3>
                  <Badge variant={config.variant}>{config.label}</Badge>
                </div>
                <div className="flex items-center gap-3 text-xs text-muted">
                  {session.company_name && (
                    <span>{session.company_name}</span>
                  )}
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {new Date(session.created_at).toLocaleDateString()}
                  </span>
                  <span className="truncate max-w-[200px]">{session.cv_filename}</span>
                </div>
                {session.tokenUsage.total_tokens > 0 && (
                  <div className="flex items-center gap-3 text-xs text-muted mt-0.5">
                    <span>{model}</span>
                    <span>{session.tokenUsage.total_tokens.toLocaleString()} tokens</span>
                    {session.tokenUsage.tts_characters > 0 && (
                      <span>{session.tokenUsage.tts_characters.toLocaleString()} TTS chars</span>
                    )}
                    {(() => {
                      const cost = estimateCost(model, session.tokenUsage);
                      return cost ? <span>~${cost}</span> : null;
                    })()}
                  </div>
                )}
              </div>
            </div>
            <div className="flex items-center gap-1 flex-shrink-0">
              <button
                onClick={(e) => onDelete(e, session.id)}
                className="p-1.5 rounded-md text-muted hover:text-danger hover:bg-danger/10 transition-colors cursor-pointer"
                title="Delete session"
              >
                <Trash2 className="w-4 h-4" />
              </button>
              <ChevronRight className="w-5 h-5 text-muted" />
            </div>
          </div>
        </Card>
      </Link>
    </motion.div>
  );
}

export default function HistoryPage() {
  const [sessions, setSessions] = useState<SessionWithUsage[]>([]);
  const [groups, setGroups] = useState<SessionGroup[]>([]);
  const [model, setModel] = useState("");
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<"grouped" | "flat">("grouped");
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  const allHints = useMemo(() => getHistoryHints({
    sessions: sessions.map((s) => ({
      status: s.status,
      difficulty: (s.interviewDifficulty || "realistic") as InterviewDifficulty,
      decision: s.reportDecision,
      score: s.reportScore,
    })),
    groups,
    recurringDangerZones: [], // Would need cross-session analysis; keep simple for now
  }), [sessions, groups]);
  const { hints, dismiss } = useHints(allHints);

  useEffect(() => {
    fetch("/api/sessions/list")
      .then((res) => res.json())
      .then((data) => {
        setSessions(data.sessions);
        setGroups(data.groups || []);
        setModel(data.model || "");
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const handleDelete = useCallback(async (e: React.MouseEvent, sessionId: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm("Delete this session? This cannot be undone.")) return;
    const res = await fetch(`/api/sessions/${sessionId}`, { method: "DELETE" });
    if (res.ok) {
      setSessions((prev: SessionWithUsage[]) => prev.filter((s) => s.id !== sessionId));
    }
  }, []);

  const toggleGroup = useCallback((groupId: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(groupId)) {
        next.delete(groupId);
      } else {
        next.add(groupId);
      }
      return next;
    });
  }, []);

  function getGroupSessions(group: SessionGroup): SessionWithUsage[] {
    return sessions.filter((s) => {
      if (group.groupLabel) {
        return s.group_label === group.groupLabel;
      }
      return s.company_domain === group.company_domain && s.cv_hash === group.cvHash;
    });
  }

  return (
    <div className="min-h-screen">
      <header className="border-b border-border">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center gap-4">
          <Link href="/" className="text-muted hover:text-foreground transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <span className="font-semibold tracking-tight">History</span>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8">
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
          </div>
        ) : sessions.length === 0 ? (
          <div className="text-center py-20">
            <FileText className="w-12 h-12 text-muted mx-auto mb-4" />
            <h2 className="text-lg font-medium mb-2">No sessions yet</h2>
            <p className="text-muted mb-6 text-sm">Start your first interview preparation session.</p>
            <Link href="/">
              <span className="text-accent hover:text-accent-light transition-colors text-sm">
                Go to Home
              </span>
            </Link>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Summary bar */}
            {sessions.length > 0 && (() => {
              const totals = sessions.reduce(
                (acc, s) => ({
                  tokens: acc.tokens + s.tokenUsage.total_tokens,
                  prompt: acc.prompt + s.tokenUsage.prompt_tokens,
                  completion: acc.completion + s.tokenUsage.completion_tokens,
                  tts: acc.tts + s.tokenUsage.tts_characters,
                }),
                { tokens: 0, prompt: 0, completion: 0, tts: 0 }
              );
              const totalCost = estimateCost(model, {
                prompt_tokens: totals.prompt,
                completion_tokens: totals.completion,
                tts_characters: totals.tts,
              });
              return (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="rounded-xl bg-surface border border-border px-4 py-3 text-center">
                    <p className="text-2xl font-semibold">{sessions.length}</p>
                    <p className="text-xs text-muted">Sessions</p>
                  </div>
                  <div className="rounded-xl bg-surface border border-border px-4 py-3 text-center">
                    <p className="text-2xl font-semibold">{totals.tokens.toLocaleString()}</p>
                    <p className="text-xs text-muted">Total Tokens</p>
                  </div>
                  {totals.tts > 0 && (
                    <div className="rounded-xl bg-surface border border-border px-4 py-3 text-center">
                      <p className="text-2xl font-semibold">{totals.tts.toLocaleString()}</p>
                      <p className="text-xs text-muted">TTS Characters</p>
                    </div>
                  )}
                  {totalCost && (
                    <div className="rounded-xl bg-surface border border-border px-4 py-3 text-center">
                      <p className="text-2xl font-semibold">${totalCost}</p>
                      <p className="text-xs text-muted">Est. Cost ({model})</p>
                    </div>
                  )}
                </div>
              );
            })()}

            {hints.length > 0 && (
              <HintList hints={hints} onDismiss={dismiss} />
            )}

            {/* View mode toggle */}
            {groups.length > 0 && (
              <div className="flex justify-end">
                <div className="flex items-center rounded-lg border border-border bg-surface overflow-hidden">
                  <button
                    onClick={() => setViewMode("grouped")}
                    className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition-colors cursor-pointer ${
                      viewMode === "grouped"
                        ? "bg-accent/15 text-accent"
                        : "text-muted hover:text-foreground"
                    }`}
                  >
                    <Layers className="w-3.5 h-3.5" />
                    Grouped
                  </button>
                  <button
                    onClick={() => setViewMode("flat")}
                    className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition-colors cursor-pointer ${
                      viewMode === "flat"
                        ? "bg-accent/15 text-accent"
                        : "text-muted hover:text-foreground"
                    }`}
                  >
                    <List className="w-3.5 h-3.5" />
                    Flat
                  </button>
                </div>
              </div>
            )}

            <div className="space-y-3">
              {viewMode === "flat" || groups.length === 0 ? (
                // Flat view — existing behavior
                sessions.map((session, i) => (
                  <SessionCard
                    key={session.id}
                    session={session}
                    model={model}
                    index={i}
                    onDelete={handleDelete}
                  />
                ))
              ) : (
                // Grouped view
                groups.map((group, gi) => {
                  const groupSessions = getGroupSessions(group);

                  if (group.sessionCount <= 1) {
                    // Single-session group: render as flat card
                    const session = groupSessions[0];
                    if (!session) return null;
                    return (
                      <SessionCard
                        key={session.id}
                        session={session}
                        model={model}
                        index={gi}
                        onDelete={handleDelete}
                      />
                    );
                  }

                  // Multi-session group
                  const isExpanded = expandedGroups.has(group.groupId);
                  const bestDecision = group.bestOutcome
                    ? decisionLabels[group.bestOutcome]
                    : null;

                  return (
                    <motion.div
                      key={group.groupId}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: gi * 0.05 }}
                    >
                      <Card className="overflow-hidden">
                        <div
                          className="flex items-center justify-between cursor-pointer"
                          onClick={() => toggleGroup(group.groupId)}
                        >
                          <div className="flex items-center gap-4 min-w-0">
                            <div className="p-2 rounded-lg bg-accent/10">
                              <Briefcase className="w-5 h-5 text-accent" />
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-2 mb-0.5">
                                <h3 className="font-medium text-sm truncate">
                                  {group.companyName || group.groupLabel || "Unknown Company"}
                                </h3>
                                <Badge variant="default">
                                  {group.sessionCount} sessions
                                </Badge>
                                {bestDecision && (
                                  <Badge variant={bestDecision.variant}>
                                    {bestDecision.label}
                                  </Badge>
                                )}
                              </div>
                              <div className="flex items-center gap-3 text-xs text-muted">
                                <span className="flex items-center gap-1">
                                  <Clock className="w-3 h-3" />
                                  {new Date(group.dateRange.first).toLocaleDateString()}
                                  {group.dateRange.first !== group.dateRange.last && (
                                    <> &ndash; {new Date(group.dateRange.last).toLocaleDateString()}</>
                                  )}
                                </span>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-1 flex-shrink-0">
                            <Link
                              href={`/insights/${encodeURIComponent(group.groupId)}`}
                              onClick={(e) => e.stopPropagation()}
                              className="p-1.5 rounded-md text-muted hover:text-accent hover:bg-accent/10 transition-colors"
                              title="View insights"
                            >
                              <BarChart3 className="w-4 h-4" />
                            </Link>
                            {isExpanded ? (
                              <ChevronUp className="w-5 h-5 text-muted" />
                            ) : (
                              <ChevronDown className="w-5 h-5 text-muted" />
                            )}
                          </div>
                        </div>

                        {isExpanded && (
                          <div className="mt-3 pt-3 border-t border-border space-y-2">
                            {groupSessions.map((session, si) => {
                              const config = statusConfig[session.status] || statusConfig.pending;
                              const link =
                                session.status === "completed"
                                  ? `/session/${session.id}/report`
                                  : session.status === "interviewing"
                                  ? `/session/${session.id}/interview`
                                  : `/session/${session.id}`;

                              return (
                                <motion.div
                                  key={session.id}
                                  initial={{ opacity: 0, y: 5 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  transition={{ delay: si * 0.03 }}
                                >
                                  <Link href={link} onClick={(e) => e.stopPropagation()}>
                                    <div className="flex items-center justify-between rounded-lg bg-surface-light px-3 py-2 hover:bg-surface-light/80 transition-colors">
                                      <div className="min-w-0">
                                        <div className="flex items-center gap-2 mb-0.5">
                                          <h4 className="font-medium text-xs truncate">
                                            {session.job_title || "Untitled Position"}
                                          </h4>
                                          <Badge variant={config.variant}>{config.label}</Badge>
                                        </div>
                                        <div className="flex items-center gap-3 text-xs text-muted">
                                          <span className="flex items-center gap-1">
                                            <Clock className="w-3 h-3" />
                                            {new Date(session.created_at).toLocaleDateString()}
                                          </span>
                                          <span className="truncate max-w-[200px]">{session.cv_filename}</span>
                                          {session.tokenUsage.total_tokens > 0 && (
                                            <span>{session.tokenUsage.total_tokens.toLocaleString()} tokens</span>
                                          )}
                                        </div>
                                      </div>
                                      <div className="flex items-center gap-1 flex-shrink-0">
                                        <button
                                          onClick={(e) => handleDelete(e, session.id)}
                                          className="p-1.5 rounded-md text-muted hover:text-danger hover:bg-danger/10 transition-colors cursor-pointer"
                                          title="Delete session"
                                        >
                                          <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                        <ChevronRight className="w-4 h-4 text-muted" />
                                      </div>
                                    </div>
                                  </Link>
                                </motion.div>
                              );
                            })}
                          </div>
                        )}
                      </Card>
                    </motion.div>
                  );
                })
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
