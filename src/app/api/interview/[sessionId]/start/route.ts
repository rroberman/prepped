import { NextRequest, NextResponse } from "next/server";
import {
  getSession,
  createInterview,
  getInterviewBySession,
  createMessage,
  getMessagesByInterview,
  updateSession,
} from "@/lib/db/queries";
import { generateInterviewerResponse, parseScoreTag } from "@/lib/ai/interviewer";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const { sessionId } = await params;
  const session = getSession(sessionId);

  if (!session) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  // Check if interview already exists
  let interview = getInterviewBySession(sessionId);
  if (interview && interview.status === "active") {
    const messages = getMessagesByInterview(interview.id);
    return NextResponse.json({ interview, messages });
  }

  // Create new interview with difficulty
  let difficulty = "realistic";
  try {
    const body = await request.json();
    if (body.difficulty && ["friendly", "realistic", "tough", "adaptive"].includes(body.difficulty)) {
      difficulty = body.difficulty;
    }
  } catch { /* no body or invalid JSON — use default */ }
  interview = createInterview(sessionId, difficulty);
  updateSession(sessionId, { status: "interviewing" });

  // Generate opening message
  const messages = getMessagesByInterview(interview.id);
  const { stream } = await generateInterviewerResponse(
    sessionId,
    interview.id,
    messages,
    "warmup"
  );

  // Collect the full response
  let fullContent = "";
  for await (const chunk of stream) {
    if (chunk.content) fullContent += chunk.content;
  }

  // Parse score tag and save clean content
  const { text: cleanContent, score } = parseScoreTag(fullContent);
  const savedMessage = createMessage(interview.id, "interviewer", cleanContent, "warmup", undefined, undefined, score);

  return NextResponse.json({
    interview,
    messages: [savedMessage],
  });
}
