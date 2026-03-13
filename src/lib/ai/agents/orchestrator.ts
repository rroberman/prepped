import { runScout } from "./scout";
import { runProfiler } from "./profiler";
import { runAuditor } from "./auditor";
import { runStrategist } from "./strategist";
import { runCoach } from "./coach";
import {
  getAnalysesBySession,
  updateAnalysis,
  updateSession,
  createAnalysis,
} from "@/lib/db/queries";
import type { AgentType, ScoutResult, ProfilerResult, AuditorResult, TokenUsage } from "@/types";

type ProgressCallback = (
  agentType: AgentType,
  status: "running" | "completed" | "failed",
  result?: unknown,
  error?: string,
  usage?: TokenUsage
) => void;

export async function runAgentPipeline(
  sessionId: string,
  cvText: string,
  jobUrl: string,
  onProgress: ProgressCallback
) {
  const agentTypes: AgentType[] = ["scout", "profiler", "auditor", "strategist", "coach"];

  // Create analysis records if they don't exist
  const existing = getAnalysesBySession(sessionId);
  for (const type of agentTypes) {
    if (!existing.find((a) => a.agent_type === type)) {
      createAnalysis(sessionId, type);
    }
  }

  updateSession(sessionId, { status: "analyzing" });

  const analyses = getAnalysesBySession(sessionId);
  const getAnalysisId = (type: AgentType) => analyses.find((a) => a.agent_type === type)!.id;

  const failDependents = (types: AgentType[], reason: string) => {
    for (const type of types) {
      updateAnalysis(getAnalysisId(type), {
        status: "failed",
        error: reason,
        completed_at: new Date().toISOString(),
      });
      onProgress(type, "failed", undefined, reason);
    }
  };

  // --- WAVE 1 (parallel): Scout + Profiler ---
  let scoutResult: ScoutResult | null = null;
  let profilerResult: ProfilerResult | null = null;

  const wave1 = await Promise.allSettled([
    runAgent(getAnalysisId("scout"), "scout", onProgress, () => runScout(jobUrl)),
    runAgent(getAnalysisId("profiler"), "profiler", onProgress, () => runProfiler(cvText)),
  ]);

  if (wave1[0].status === "fulfilled") {
    scoutResult = wave1[0].value as ScoutResult;
    updateSession(sessionId, {
      job_title: scoutResult.job_title,
      company_name: scoutResult.company_name,
    });
  }
  if (wave1[1].status === "fulfilled") {
    profilerResult = wave1[1].value as ProfilerResult;
  }

  // Scout is critical — Auditor/Strategist/Coach all need it
  if (!scoutResult) {
    failDependents(["auditor", "strategist", "coach"], "Scout failed — no company intel available");
    return;
  }

  // Profiler failure is less critical — Auditor can work with just Scout + raw CV
  if (!profilerResult) {
    // Continue anyway — Auditor will use raw CV text
  }

  // --- WAVE 2: The Auditor (needs Scout + Profiler/CV) ---
  let auditorResult: AuditorResult | null = null;
  try {
    auditorResult = await runAgent(getAnalysisId("auditor"), "auditor", onProgress, () =>
      runAuditor(
        profilerResult
          ? `PROFILER FINDINGS:\nName: ${profilerResult.candidate_name}\nSeniority: ${profilerResult.seniority_assessment}\nTrajectory: ${profilerResult.career_trajectory}\nRed flags: ${profilerResult.career_red_flags.map(r => r.flag).join(", ")}\nSkills: ${profilerResult.skills_claimed.join(", ")}\n\nRAW CV:\n${cvText}`
          : cvText,
        scoutResult!
      )
    );
  } catch {
    failDependents(["strategist", "coach"], "Auditor failed — cannot build strategy");
    return;
  }

  // --- WAVE 3 (parallel): Strategist + Coach ---
  await Promise.allSettled([
    runAgent(getAnalysisId("strategist"), "strategist", onProgress, () =>
      runStrategist(scoutResult!, auditorResult!)
    ),
    runAgent(getAnalysisId("coach"), "coach", onProgress, () =>
      runCoach(scoutResult!, auditorResult!, profilerResult || {
        candidate_name: "Unknown",
        seniority_assessment: "Unknown",
        career_trajectory: "Unknown",
        career_red_flags: [],
        resume_questions: [],
        narrative_assessment: "Profiler did not run",
        strongest_signal: "Unknown",
        weakest_signal: "Unknown",
        years_of_experience: 0,
        skills_claimed: [],
      })
    ),
  ]);

  updateSession(sessionId, { status: "ready" });
}

async function runAgent<T>(
  analysisId: string,
  agentType: AgentType,
  onProgress: ProgressCallback,
  execute: () => Promise<{ data: T; usage: TokenUsage }>
): Promise<T> {
  updateAnalysis(analysisId, {
    status: "running",
    started_at: new Date().toISOString(),
  });
  onProgress(agentType, "running");

  try {
    const { data, usage } = await execute();
    updateAnalysis(analysisId, {
      status: "completed",
      result: JSON.stringify(data),
      completed_at: new Date().toISOString(),
      prompt_tokens: usage.prompt_tokens,
      completion_tokens: usage.completion_tokens,
    });
    onProgress(agentType, "completed", data, undefined, usage);
    return data;
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : "Unknown error";
    updateAnalysis(analysisId, {
      status: "failed",
      error: errorMsg,
      completed_at: new Date().toISOString(),
    });
    onProgress(agentType, "failed", undefined, errorMsg);
    throw error;
  }
}
