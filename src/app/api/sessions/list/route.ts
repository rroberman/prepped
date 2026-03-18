import { NextResponse } from "next/server";
import { listSessions, getSessionTokenUsage, getInterviewBySession, getReportBySession } from "@/lib/db/queries";
import { getSessionGroups } from "@/lib/insights";

export async function GET() {
  const sessions = listSessions();
  const provider = process.env.LLM_PROVIDER || "openai";
  let model = "";
  switch (provider) {
    case "openai": model = process.env.OPENAI_MODEL || "gpt-4o"; break;
    case "anthropic": model = process.env.ANTHROPIC_MODEL || "claude-sonnet-4-20250514"; break;
    case "gemini": model = process.env.GEMINI_MODEL || "gemini-2.5-flash"; break;
    case "ollama": model = process.env.OLLAMA_MODEL || "llama3"; break;
    case "openrouter": model = process.env.OPENROUTER_MODEL || "openai/gpt-4o"; break;
  }

  const sessionsWithUsage = sessions.map((session) => {
    const usage = getSessionTokenUsage(session.id);
    const interview = getInterviewBySession(session.id);
    const report = getReportBySession(session.id);
    const reportData = report?.report_data ? JSON.parse(report.report_data) : null;
    return {
      ...session,
      tokenUsage: usage,
      interviewDifficulty: interview?.difficulty || null,
      reportDecision: reportData?.decision || null,
      reportScore: report?.overall_score || null,
    };
  });

  const groups = getSessionGroups();

  return NextResponse.json({ sessions: sessionsWithUsage, groups, model });
}
