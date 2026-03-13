import { jsonCompletion } from "./llm-client";
import { getAnalysesBySession, createReport } from "@/lib/db/queries";
import type { Message, Report, ReportData, ScoutResult, AuditorResult } from "@/types";

export async function generateReport(
  sessionId: string,
  interviewId: string,
  messages: Message[]
): Promise<Report> {
  const analyses = getAnalysesBySession(sessionId);
  const scoutAnalysis = analyses.find((a) => a.agent_type === "scout");
  const auditorAnalysis = analyses.find((a) => a.agent_type === "auditor");

  const scout = scoutAnalysis?.result ? (JSON.parse(scoutAnalysis.result) as ScoutResult) : null;
  const auditor = auditorAnalysis?.result ? (JSON.parse(auditorAnalysis.result) as AuditorResult) : null;

  const transcript = messages
    .map((m) => `[${m.role.toUpperCase()} — ${m.phase}]: ${m.content}`)
    .join("\n\n");

  const dangerZones = auditor?.danger_zones
    .map((dz) => `${dz.area} (${dz.severity}): ${dz.candidate_has} vs ${dz.company_needs}`)
    .join("\n") || "N/A";

  const systemPrompt = `You are a Hiring Committee reviewing an interview transcript. You must produce a brutally honest hiring decision.

CRITICAL LANGUAGE RULE: Detect the language used in the interview transcript. Write the ENTIRE report in that same language. Copy questions and answers EXACTLY as they appear — do NOT translate them.

You have:
1. The full interview transcript
2. The danger zones that were identified before the interview
3. Company context

Your job: decide if this person should be hired.

Return a JSON object with this EXACT structure:
{
  "decision": "<strong_hire|hire|lean_hire|lean_no_hire|no_hire>",
  "hire_probability": <number 0-100>,
  "summary": "<2-3 sentence hiring committee summary>",
  "technical_gaps": [
    { "area": "<what>", "severity": "<minor|moderate|major>", "detail": "<specifics>" }
  ],
  "communication_flags": ["<any communication concerns — vague answers, defensiveness, etc>"],
  "strengths_demonstrated": ["<things the candidate did well>"],
  "danger_zone_performance": [
    { "zone": "<danger zone name>", "result": "<passed|partially_passed|failed>", "detail": "<what happened>" }
  ],
  "question_feedback": [
    {
      "question": "<EXACT question from transcript>",
      "answer": "<EXACT answer from transcript>",
      "phase": "<warmup|technical_deep_dive|danger_zones|system_design|closing>",
      "score": <1-10>,
      "verdict": "<Strong|Adequate|Concerning|Red Flag>",
      "analysis": "<what was good/bad about this answer>",
      "what_interviewer_was_testing": "<the hidden intent behind the question>",
      "ideal_response_outline": "<what a great answer would cover>"
    }
  ],
  "final_verdict": "<paragraph — write this like a hiring committee member arguing their case>",
  "recommendations": ["<specific things to study/practice for next time>"]
}

Be direct. "The candidate clearly doesn't know X" is better than "There may be some gaps in X."
Return ONLY valid JSON.`;

  const userPrompt = `COMPANY: ${scout?.company_name || "Unknown"} (${scout?.company_stage || "Unknown"})
ROLE: ${scout?.job_title || "Unknown"}
TECH STACK: ${scout?.tech_stack.join(", ") || "Unknown"}

PRE-INTERVIEW DANGER ZONES:
${dangerZones}

INTERVIEW TRANSCRIPT:
${transcript}`;

  const { data: reportData, usage } = await jsonCompletion<ReportData>(systemPrompt, userPrompt, {
    temperature: 0.4,
    maxTokens: 4000,
  });

  const decisionToScore: Record<string, number> = {
    strong_hire: 9.5,
    hire: 8,
    lean_hire: 6.5,
    lean_no_hire: 4,
    no_hire: 2,
  };

  return createReport(
    sessionId,
    interviewId,
    decisionToScore[reportData.decision] ?? 5,
    reportData.decision,
    JSON.stringify(reportData),
    usage
  );
}
