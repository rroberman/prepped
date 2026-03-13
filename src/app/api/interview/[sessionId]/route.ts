import { NextRequest } from "next/server";
import {
  getSession,
  getInterviewBySession,
  createMessage,
  getMessagesByInterview,
  updateInterview,
} from "@/lib/db/queries";
import { generateInterviewerResponse, isInterviewComplete } from "@/lib/ai/interviewer";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const { sessionId } = await params;
  const session = getSession(sessionId);

  if (!session) {
    return new Response("Session not found", { status: 404 });
  }

  const interview = getInterviewBySession(sessionId);
  if (!interview || interview.status !== "active") {
    return new Response("No active interview", { status: 400 });
  }

  const body = await request.json();
  const { message } = body;

  if (!message || typeof message !== "string") {
    return new Response("Message is required", { status: 400 });
  }

  // Save candidate message
  createMessage(interview.id, "candidate", message, interview.current_phase);

  // Get updated messages
  const allMessages = getMessagesByInterview(interview.id);

  // Check if interview should end
  if (isInterviewComplete(allMessages)) {
    updateInterview(interview.id, { status: "completed", ended_at: new Date().toISOString() });
    const encoder = new TextEncoder();
    const endStream = new ReadableStream({
      start(controller) {
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ type: "complete" })}\n\n`)
        );
        controller.close();
      },
    });
    return new Response(endStream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  }

  // Generate interviewer response via SSE
  const { stream, nextPhase, getUsage } = await generateInterviewerResponse(
    sessionId,
    interview.id,
    allMessages,
    interview.current_phase as Parameters<typeof generateInterviewerResponse>[3]
  );

  if (nextPhase && nextPhase !== interview.current_phase) {
    updateInterview(interview.id, { current_phase: nextPhase });
  }

  updateInterview(interview.id, { question_count: interview.question_count + 1 });

  const encoder = new TextEncoder();
  const responseStream = new ReadableStream({
    async start(controller) {
      let fullContent = "";
      try {
        for await (const chunk of stream) {
          if (chunk.content) {
            fullContent += chunk.content;
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ type: "delta", content: chunk.content })}\n\n`)
            );
          }
        }

        const phase = nextPhase || interview.current_phase;
        const usage = getUsage();
        createMessage(interview.id, "interviewer", fullContent, phase, undefined, usage);

        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({ type: "done", phase: nextPhase || interview.current_phase })}\n\n`
          )
        );
      } catch (error) {
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({ type: "error", message: error instanceof Error ? error.message : "Unknown error" })}\n\n`
          )
        );
      }
      controller.close();
    },
  });

  return new Response(responseStream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
