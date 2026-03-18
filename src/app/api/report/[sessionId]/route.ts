import { NextRequest, NextResponse } from "next/server";
import {
  getReportBySession,
  getSessionTokenUsage,
  getInterviewBySession,
  getMessagesByInterview,
  updateSession,
} from "@/lib/db/queries";
import { generateReport } from "@/lib/ai/report-generator";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const { sessionId } = await params;
  let report = getReportBySession(sessionId);

  // Generate report on-demand if it doesn't exist yet
  if (!report) {
    const interview = getInterviewBySession(sessionId);
    if (!interview) {
      return NextResponse.json({ error: "No interview found" }, { status: 404 });
    }
    const messages = getMessagesByInterview(interview.id);
    if (messages.length === 0) {
      return NextResponse.json({ error: "No messages found" }, { status: 404 });
    }
    report = await generateReport(sessionId, interview.id, messages);
    updateSession(sessionId, { status: "completed" });
  }

  const tokenUsage = getSessionTokenUsage(sessionId);
  const interview = getInterviewBySession(sessionId);
  const interviewMessages = interview ? getMessagesByInterview(interview.id) : [];

  // Extract interviewer quality scores for dual scoring display
  const interviewerScores = interviewMessages
    .filter((m) => m.role === "interviewer" && m.quality_score != null)
    .map((m) => m.quality_score as number);

  return NextResponse.json({
    report: {
      ...report,
      report_data: JSON.parse(report.report_data),
    },
    tokenUsage,
    interviewMeta: {
      difficulty: interview?.difficulty || "realistic",
      effective_difficulty: interview?.effective_difficulty || "realistic",
      interviewerScores,
    },
  });
}
