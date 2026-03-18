import { NextRequest } from "next/server";
import {
  getSession,
  getInterviewBySession,
  createMessage,
  getMessagesByInterview,
  updateInterview,
} from "@/lib/db/queries";
import { generateInterviewerResponse, isInterviewComplete, parseScoreTag, computeAdaptiveShift } from "@/lib/ai/interviewer";
import type { EffectiveDifficulty } from "@/types";

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

        // Parse score tag from the response and strip it
        const { text: cleanContent, score } = parseScoreTag(fullContent);

        // Send a correction delta to remove the score tag from the client display
        if (score !== null && cleanContent.length < fullContent.length) {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ type: "replace", content: cleanContent })}\n\n`)
          );
        }

        const phase = nextPhase || interview.current_phase;
        const usage = getUsage();
        createMessage(interview.id, "interviewer", cleanContent, phase, undefined, usage, score);

        // Handle adaptive difficulty shifting
        let effectiveDifficulty: EffectiveDifficulty | undefined;
        if (interview.difficulty === "adaptive" && score !== null) {
          const messages = getMessagesByInterview(interview.id);
          const recentScores = messages
            .filter((m) => m.role === "interviewer" && m.quality_score !== null)
            .map((m) => m.quality_score as number);
          // Include the score we just got
          recentScores.push(score);
          const newDifficulty = computeAdaptiveShift(
            recentScores,
            (interview.effective_difficulty as EffectiveDifficulty) || "realistic"
          );
          if (newDifficulty) {
            updateInterview(interview.id, { effective_difficulty: newDifficulty });
            effectiveDifficulty = newDifficulty;
          }
        }

        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({
              type: "done",
              phase: nextPhase || interview.current_phase,
              ...(effectiveDifficulty ? { effectiveDifficulty } : {}),
            })}\n\n`
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
