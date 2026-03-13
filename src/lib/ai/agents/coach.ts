import { jsonCompletion } from "../llm-client";
import type { ScoutResult, AuditorResult, ProfilerResult, CoachResult, TokenUsage } from "@/types";

export async function runCoach(
  scout: ScoutResult,
  auditor: AuditorResult,
  profiler: ProfilerResult
): Promise<{ data: CoachResult; usage: TokenUsage }> {
  const systemPrompt = `You are "The Coach" — a seasoned interview coach who's prepped hundreds of candidates for technical interviews. You've seen the company research and the candidate audit. Now you need to prepare them.

You know:
- What the company actually uses and cares about
- Where the candidate's danger zones are
- What red flags are in their CV
- What the interviewer will likely probe

Your job: give ACTIONABLE prep advice. Not generic "be confident" garbage — real, specific strategies.

For each danger zone, provide:
- A strategy for handling it when asked
- An honest framing (how to admit the gap without tanking the interview)

For talking points, focus on connecting the candidate's actual experience to what the company needs.

For stories to prepare, give specific STAR-format prompts using their real experience.

Return a JSON object:
- overall_readiness: string (honest assessment paragraph)
- danger_zone_strategies: array of { zone, strategy, honest_framing }
- talking_points: array of { topic, key_message, supporting_evidence }
- stories_to_prepare: array of { scenario, which_experience_to_use, key_points_to_hit }
- things_to_avoid: string[] (specific pitfalls for THIS interview)
- opening_pitch: string (a draft "tell me about yourself" answer tailored to this role)
- questions_to_ask_them: string[] (smart questions that show you've researched the company)

Return ONLY valid JSON.`;

  const dangerSummary = auditor.danger_zones
    .map((dz) => `[${dz.severity}] ${dz.area}: has "${dz.candidate_has}", needs "${dz.company_needs}"`)
    .join("\n");

  const redFlags = profiler.career_red_flags
    .map((rf) => `[${rf.severity}] ${rf.flag}: ${rf.evidence}`)
    .join("\n");

  const userPrompt = `COMPANY: ${scout.company_name} (${scout.company_stage})
ROLE: ${scout.job_title}
TECH STACK: ${scout.tech_stack.join(", ")}
CULTURE: ${scout.engineering_culture}

CANDIDATE: ${profiler.candidate_name}
EXPERIENCE: ${profiler.years_of_experience} years
SENIORITY: ${profiler.seniority_assessment}
TRAJECTORY: ${profiler.career_trajectory}
STRONGEST: ${profiler.strongest_signal}
WEAKEST: ${profiler.weakest_signal}
SKILLS: ${profiler.skills_claimed.join(", ")}

DANGER ZONES:
${dangerSummary}

CV RED FLAGS:
${redFlags}

CV QUESTIONS THEY'LL ASK: ${profiler.resume_questions.join("; ")}`;

  return jsonCompletion<CoachResult>(systemPrompt, userPrompt, {
    temperature: 0.5,
    maxTokens: 3000,
  }) as Promise<{ data: CoachResult; usage: TokenUsage }>;
}
