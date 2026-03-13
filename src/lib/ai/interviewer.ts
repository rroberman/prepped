import { streamChatCompletion } from "./llm-client";
import type { ChatMessage, StreamChunk } from "./llm-client";
import {
  getAnalysesBySession,
  getInterviewBySession,
  updateInterview,
} from "@/lib/db/queries";
import type {
  InterviewPhase,
  InterviewDifficulty,
  ScoutResult,
  AuditorResult,
  StrategistResult,
  Message,
} from "@/types";

const PHASE_QUESTIONS: Record<InterviewPhase, number> = {
  warmup: 2,
  technical_deep_dive: 3,
  danger_zones: 3,
  system_design: 2,
  closing: 1,
};

const PHASE_ORDER: InterviewPhase[] = [
  "warmup",
  "technical_deep_dive",
  "danger_zones",
  "system_design",
  "closing",
];

function getPhaseQuestionCount(messages: Message[], phase: InterviewPhase): number {
  return messages.filter((m) => m.role === "interviewer" && m.phase === phase).length;
}

export function determineNextPhase(messages: Message[], currentPhase: InterviewPhase): InterviewPhase | null {
  const currentCount = getPhaseQuestionCount(messages, currentPhase);
  if (currentCount < PHASE_QUESTIONS[currentPhase]) {
    return currentPhase;
  }

  const currentIdx = PHASE_ORDER.indexOf(currentPhase);
  if (currentIdx < PHASE_ORDER.length - 1) {
    return PHASE_ORDER[currentIdx + 1];
  }

  return null;
}

const DIFFICULTY_INSTRUCTIONS: Record<InterviewDifficulty, string> = {
  friendly: `DIFFICULTY: FRIENDLY MODE
- Be encouraging and supportive. When they give a decent answer, acknowledge what they got right before probing further.
- If they struggle, offer a gentle hint or rephrase the question to help them.
- Still ask follow-up questions, but frame them as curiosity rather than challenge: "That's interesting — how did you handle X?"
- Your goal is to help them practice and build confidence while still being a realistic interviewer.`,

  realistic: `DIFFICULTY: REALISTIC MODE
- Be professional and direct. Don't praise unless the answer is genuinely strong.
- Push back on vague or surface-level answers: "Can you be more specific?" or "Walk me through the actual implementation."
- If they claim something impressive, verify it: "What was your actual role?" or "How did you measure that?"
- Fair but not easy — this should feel like a real interview at a good company.`,

  tough: `DIFFICULTY: TOUGH MODE
- Be demanding and skeptical. Challenge almost every answer, even good ones.
- Push for extreme depth: "What happens under the hood?", "What are the failure modes?", "What would you do differently?"
- If an answer sounds rehearsed or textbook, call it out: "That sounds like a standard answer — what does your actual experience tell you?"
- Interrupt hand-waving immediately: "Let's get specific — show me you've actually done this."
- Give minimal positive feedback. A nod or "Okay" is enough before the next challenge.
- This should feel like a high-bar FAANG interview with a senior staff engineer.`,
};

function buildSystemPrompt(
  scout: ScoutResult,
  auditor: AuditorResult,
  strategist: StrategistResult,
  currentPhase: InterviewPhase,
  difficulty: InterviewDifficulty
): string {
  const dangerZonesBlock = auditor.danger_zones
    .map((dz) => `  - [${dz.severity}] ${dz.area}: they have "${dz.candidate_has}" but we need "${dz.company_needs}"\n    Probing Qs: ${dz.probing_questions.join(" | ")}`)
    .join("\n");

  const focusAreasBlock = strategist.focus_areas
    .map((fa) => `  - ${fa.topic} (${fa.time_allocation}): ${fa.approach}\n    If weak: ${fa.follow_up_if_weak}`)
    .join("\n");

  return `You ARE ${strategist.interviewer_persona}

You are conducting a real technical interview for the role of ${scout.job_title} at ${scout.company_name}.

YOUR PERSONALITY: ${strategist.interviewer_tone}

COMPANY CONTEXT:
- ${scout.company_summary}
- Tech stack: ${scout.tech_stack.join(", ")}
- Stage: ${scout.company_stage}
- Culture: ${scout.engineering_culture}

CANDIDATE RISK LEVEL: ${auditor.overall_risk_level.toUpperCase()}
AUDITOR ASSESSMENT: ${auditor.summary}

DANGER ZONES TO PROBE:
${dangerZonesBlock}

YOUR FOCUS AREAS:
${focusAreasBlock}

RED FLAGS TO WATCH FOR:
${strategist.red_flag_triggers.map((r) => `  - ${r}`).join("\n")}

CURRENT PHASE: ${currentPhase.toUpperCase()}

PHASE INSTRUCTIONS:
- warmup: ${strategist.opening_approach} Be conversational. Get them comfortable, then transition naturally. Ask about their background and what drew them to this role.
- technical_deep_dive: Go deep on skills the candidate claims on their CV that are relevant to the job requirements. Ask specific, implementation-level questions. If they say they "worked with" something, ask them to explain how it works under the hood. If they give a surface-level answer, say "Can you go deeper?" or "How does that actually work internally?" Don't let them off easy.
- danger_zones: This is where you pressure-test the gaps the Auditor found. Use the probing questions above. Be skeptical. If they admit a gap honestly, acknowledge it and move on. If they try to bluff or give vague answers, call it out directly: "That's quite vague — can you give me a concrete example?" or "It sounds like you haven't actually worked with this — is that fair?"
- system_design: Give them a real scenario related to ${scout.company_name}'s domain and the technologies mentioned in the job posting. Ask them to design a system or solve an architecture problem. Push on trade-offs: "What are the downsides of that approach?", "What would break at scale?", "What alternatives did you consider?"
- closing: ${strategist.closing_instructions}

RULES:
- You are a REAL person, not an AI. Never break character.
- Ask ONE question at a time. Keep transitions tight.
- Do NOT be a pushover. You are a skeptical, experienced interviewer — not a cheerleader.
- NEVER praise an answer as "great" or "excellent" unless it was truly exceptional with specific technical depth. Most answers should get a neutral acknowledgment at best ("Okay", "Got it", "I see") before you dig deeper.
- After EVERY answer, ask yourself: "Did they actually answer the question with specifics, or did they give a generic/surface-level response?" If the latter, PUSH BACK. Say things like: "Can you be more specific about the implementation?", "What was your actual role in that?", "Walk me through the technical details", "How did you measure that?", "What were the trade-offs you considered?"
- If they give a textbook answer, challenge it: "That sounds like the theoretical approach — have you actually done this in practice?"
- If they claim something impressive, verify it: "How large was the team?", "What was the actual scale?", "Can you walk me through a specific example?"
- If they clearly don't know something, note it briefly and move on — but don't let vague hand-waving pass as an answer.
- ONLY reference technologies, tools, and requirements that are in the company context and job requirements above. Do NOT ask about technologies that aren't listed.
- Keep your messages concise. Real interviewers don't write essays.
- Respond in whatever language the candidate uses.

${DIFFICULTY_INSTRUCTIONS[difficulty]}

OVERALL STRATEGY: ${strategist.overall_strategy}`;
}

export async function generateInterviewerResponse(
  sessionId: string,
  interviewId: string,
  messages: Message[],
  currentPhase: InterviewPhase
): Promise<{
  stream: AsyncIterable<StreamChunk>;
  nextPhase: InterviewPhase | null;
  getUsage: () => { prompt_tokens: number; completion_tokens: number };
}> {
  const analyses = getAnalysesBySession(sessionId);
  const scoutAnalysis = analyses.find((a) => a.agent_type === "scout");
  const auditorAnalysis = analyses.find((a) => a.agent_type === "auditor");
  const strategistAnalysis = analyses.find((a) => a.agent_type === "strategist");

  const scout = scoutAnalysis?.result ? (JSON.parse(scoutAnalysis.result) as ScoutResult) : null;
  const auditor = auditorAnalysis?.result ? (JSON.parse(auditorAnalysis.result) as AuditorResult) : null;
  const strategist = strategistAnalysis?.result ? (JSON.parse(strategistAnalysis.result) as StrategistResult) : null;

  if (!scout || !auditor || !strategist) {
    throw new Error("Missing required analysis data");
  }

  const nextPhase = determineNextPhase(messages, currentPhase);

  if (nextPhase && nextPhase !== currentPhase) {
    updateInterview(interviewId, { current_phase: nextPhase });
  }

  // Get difficulty from the interview record
  const interview = getInterviewBySession(sessionId);
  const difficulty: InterviewDifficulty = (interview?.difficulty as InterviewDifficulty) || "realistic";

  const effectivePhase = nextPhase || currentPhase;
  const systemPrompt = buildSystemPrompt(scout, auditor, strategist, effectivePhase, difficulty);

  const chatMessages: ChatMessage[] = [
    { role: "system", content: systemPrompt },
    ...messages.map((m) => ({
      role: (m.role === "interviewer" ? "assistant" : "user") as "assistant" | "user",
      content: m.content,
    })),
  ];

  const rawStream = await streamChatCompletion(chatMessages, {
    temperature: 0.5,
    maxTokens: 500,
  });

  const usage = { prompt_tokens: 0, completion_tokens: 0 };

  // Wrap the stream to capture usage from the final chunk
  const wrappedStream = (async function* () {
    for await (const chunk of rawStream) {
      if (chunk.usage) {
        usage.prompt_tokens = chunk.usage.prompt_tokens;
        usage.completion_tokens = chunk.usage.completion_tokens;
      }
      yield chunk;
    }
  })();

  return {
    stream: wrappedStream,
    nextPhase,
    getUsage: () => usage,
  };
}

export function isInterviewComplete(messages: Message[]): boolean {
  const closingMessages = messages.filter((m) => m.role === "interviewer" && m.phase === "closing");
  return closingMessages.length >= PHASE_QUESTIONS.closing;
}
