import { jsonCompletion } from "../llm-client";
import type { ScoutResult, AuditorResult, StrategistResult, TokenUsage } from "@/types";

export async function runStrategist(
  scoutResult: ScoutResult,
  auditorResult: AuditorResult
): Promise<{ data: StrategistResult; usage: TokenUsage }> {
  const systemPrompt = `You are "The Strategist" — you design interview strategies for hiring managers. Based on company intel and a candidate audit, you create a detailed dossier that tells the AI interviewer EXACTLY how to conduct this interview.

You must define:
1. WHO the interviewer is (persona — specific title, seniority, personality)
2. HOW to open (set the tone — professional but direct)
3. WHERE to focus (which topics get the most time, and why)
4. WHEN to push (what answers should trigger follow-ups or skepticism)
5. HOW to close (final assessment approach)

IMPORTANT GUIDELINES:
- The interviewer persona should be a TOUGH but fair interviewer — someone who doesn't accept surface-level answers and always asks follow-ups.
- The interviewer_tone MUST include skepticism. They should be polite but not easily impressed. They push for specifics and concrete examples.
- Focus areas should map to the danger zones from the Auditor AND to skills explicitly listed in the job requirements.
- Do NOT include focus areas about technologies that aren't in the job requirements.

Return a JSON object:
- interviewer_persona: string (e.g., "Sarah Chen, Senior DevOps Lead, 10 years at the company. Built their CI/CD pipeline from scratch.")
- interviewer_tone: string (must include skepticism and a tendency to push for specifics — e.g., "Professional and direct. Doesn't accept vague answers. Pushes for concrete examples and implementation details.")
- opening_approach: string (how to start the interview)
- focus_areas: array of { topic, why, approach, follow_up_if_weak, time_allocation }
- red_flag_triggers: string[] (what should concern the interviewer during the interview)
- closing_instructions: string (how to wrap up)
- overall_strategy: string (paragraph — the big picture plan for this interview)

Return ONLY valid JSON.`;

  const dangerSummary = auditorResult.danger_zones
    .map((dz) => `[${dz.severity.toUpperCase()}] ${dz.area}: candidate has ${dz.candidate_has}, needs ${dz.company_needs}`)
    .join("\n");

  const strengthSummary = auditorResult.strengths
    .map((s) => `${s.area}: ${s.evidence}`)
    .join("\n");

  const userPrompt = `COMPANY: ${scoutResult.company_name} (${scoutResult.company_stage})
ROLE: ${scoutResult.job_title}
TECH STACK: ${scoutResult.tech_stack.join(", ")}
ENGINEERING CULTURE: ${scoutResult.engineering_culture}

CANDIDATE AUDIT:
Risk Level: ${auditorResult.overall_risk_level}
Assessment: ${auditorResult.summary}

DANGER ZONES:
${dangerSummary}

STRENGTHS:
${strengthSummary}

EXPERIENCE GAPS: ${auditorResult.experience_gaps.join("; ")}`;

  return jsonCompletion<StrategistResult>(systemPrompt, userPrompt, {
    temperature: 0.5,
    maxTokens: 3000,
  }) as Promise<{ data: StrategistResult; usage: TokenUsage }>;
}
