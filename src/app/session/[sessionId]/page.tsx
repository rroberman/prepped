"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAnalysisStream } from "@/hooks/use-analysis-stream";
import { AgentCard } from "@/components/dashboard/agent-card";
import { DangerZonesPanel } from "@/components/dashboard/danger-zones-panel";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Radar,
  ShieldAlert,
  Crosshair,
  UserSearch,
  Lightbulb,
  MessageSquare,
  ArrowLeft,
} from "lucide-react";
import Link from "next/link";
import { CoachPrepPanel } from "@/components/dashboard/coach-prep-panel";
import { DifficultySelector } from "@/components/dashboard/difficulty-selector";
import { DashboardHints } from "@/components/dashboard/dashboard-hints";
import type { AgentType, AuditorResult, CoachResult, ScoutResult, InterviewDifficulty } from "@/types";

const agentConfig: Record<AgentType, { title: string; description: string; icon: typeof Radar }> = {
  scout: {
    title: "The Scout",
    description: "Investigating company tech stack, blog, and culture",
    icon: Radar,
  },
  profiler: {
    title: "The Profiler",
    description: "Analyzing your CV for red flags and weak spots",
    icon: UserSearch,
  },
  auditor: {
    title: "The Auditor",
    description: "Cross-referencing your CV against real company needs",
    icon: ShieldAlert,
  },
  strategist: {
    title: "The Strategist",
    description: "Building your interviewer's dossier and attack plan",
    icon: Crosshair,
  },
  coach: {
    title: "The Coach",
    description: "Preparing your game plan and talking points",
    icon: Lightbulb,
  },
};

const agentOrder: AgentType[] = ["scout", "profiler", "auditor", "strategist", "coach"];

export default function SessionDashboard() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const router = useRouter();
  const [difficulty, setDifficulty] = useState<InterviewDifficulty>("realistic");
  const { agents, isDone, completedCount, total, totalTokens } = useAnalysisStream(sessionId);

  const scoutResult = agents.scout.result as ScoutResult | null;
  const auditorResult = agents.auditor.result as AuditorResult | null;
  const coachResult = agents.coach.result as CoachResult | null;
  const allCompleted = isDone && Object.values(agents).every(
    (a) => a.status === "completed" || a.status === "failed"
  );
  const hasEnoughToInterview = agents.strategist.status === "completed";

  return (
    <div className="min-h-screen">
      <header className="border-b border-border">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/" className="text-muted hover:text-foreground transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <span className="font-semibold tracking-tight">prepped</span>
          </div>
          {hasEnoughToInterview && (
            <Button onClick={() => router.push(`/session/${sessionId}/interview?difficulty=${difficulty}`)}>
              <MessageSquare className="w-4 h-4 mr-2" />
              Enter Interview
            </Button>
          )}
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8">
        <DashboardHints
          companyName={scoutResult?.company_name || null}
          companyDomain={null}
        />
        {/* Progress */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-3">
            <h1 className="text-lg font-semibold">Recon &amp; Analysis</h1>
            <span className="text-sm text-muted">
              {completedCount}/{total} agents
            </span>
          </div>
          <Progress value={completedCount} max={total} />
        </div>

        {/* Agent cards */}
        <div className="space-y-3 mb-4">
          {agentOrder.map((type, i) => (
            <AgentCard
              key={type}
              title={agentConfig[type].title}
              description={agentConfig[type].description}
              icon={agentConfig[type].icon}
              status={agents[type].status}
              result={agents[type].result}
              error={agents[type].error}
              index={i}
              tokens={agents[type].prompt_tokens + agents[type].completion_tokens > 0
                ? { prompt: agents[type].prompt_tokens, completion: agents[type].completion_tokens }
                : undefined}
            />
          ))}
        </div>

        {/* Token stats */}
        {(totalTokens.prompt_tokens + totalTokens.completion_tokens > 0) && (
          <div className="mb-8 flex items-center justify-end gap-4 text-xs text-muted">
            <span>{totalTokens.prompt_tokens.toLocaleString()} in</span>
            <span>{totalTokens.completion_tokens.toLocaleString()} out</span>
            <span className="text-foreground/60">
              {(totalTokens.prompt_tokens + totalTokens.completion_tokens).toLocaleString()} total
            </span>
          </div>
        )}

        {/* Danger Zones panel */}
        {auditorResult && <DangerZonesPanel data={auditorResult} />}

        {/* Coach prep panel */}
        {coachResult && <CoachPrepPanel data={coachResult} />}

        {/* CTA */}
        {allCompleted && hasEnoughToInterview && (
          <div className="mt-10 text-center space-y-5">
            <p className="text-muted text-sm">
              Intel gathered. Your interviewer is ready.
            </p>
            <DifficultySelector value={difficulty} onChange={setDifficulty} />
            <div>
              <Button size="lg" onClick={() => router.push(`/session/${sessionId}/interview?difficulty=${difficulty}`)}>
                <MessageSquare className="w-5 h-5 mr-2" />
                Enter the Interview
              </Button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
