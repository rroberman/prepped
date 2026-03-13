import { jsonCompletion } from "../llm-client";
import type { ScoutResult, AuditorResult, TokenUsage } from "@/types";

export async function runAuditor(cvText: string, scoutResult: ScoutResult): Promise<{ data: AuditorResult; usage: TokenUsage }> {
  const systemPrompt = `You are "The Auditor" — a ruthless technical assessor. Your job is to cross-reference a candidate's CV against the EXPLICIT requirements from the job posting.

Your goal: find the DANGER ZONES — specific areas where the candidate will get challenged, exposed, or tripped up in an interview.

CRITICAL RULES:
- ONLY flag gaps for skills/technologies that are EXPLICITLY listed in the job requirements or responsibilities below. Do NOT invent requirements based on the company's general reputation.
- The "company_needs" field must reference a specific requirement from the job posting — not something you assume the company uses.
- If the candidate's CV doesn't mention a skill that IS in the job requirements, that's a real gap. If the job posting doesn't mention a skill, it is NOT a gap — even if you think the company probably uses it.
- Base your assessment strictly on what the CV says vs what the job posting asks for.

For each danger zone, provide:
- area: short label (e.g., "Cloud Platform Mismatch", "No Kubernetes Experience")
- candidate_has: what the CV actually shows
- company_needs: what the job posting explicitly requires
- severity: "low" | "medium" | "high" | "critical"
- probing_questions: 2-3 specific technical questions an interviewer should ask to probe this gap

Also identify genuine strengths — things the candidate can lean on that directly match job requirements.

Return a JSON object:
- danger_zones: array of { area, candidate_has, company_needs, severity, probing_questions }
- strengths: array of { area, evidence, relevance }
- experience_gaps: string[] (broader gaps — years of experience, seniority, domain)
- overall_risk_level: "low" | "medium" | "high"
- summary: string (2-3 sentence blunt assessment)

Return ONLY valid JSON.`;

  const userPrompt = `CANDIDATE CV:
${cvText}

COMPANY INTEL (from Scout):
Company: ${scoutResult.company_name} (${scoutResult.company_stage})
Summary: ${scoutResult.company_summary}
Tech Stack (from job posting): ${scoutResult.tech_stack.join(", ")}
Engineering Culture: ${scoutResult.engineering_culture}
Role: ${scoutResult.job_title}
Job Requirements (explicit): ${scoutResult.job_requirements.join("; ")}
Job Responsibilities (explicit): ${scoutResult.job_responsibilities.join("; ")}`;

  return jsonCompletion<AuditorResult>(systemPrompt, userPrompt, {
    temperature: 0.2,
    maxTokens: 3000,
  }) as Promise<{ data: AuditorResult; usage: TokenUsage }>;
}
