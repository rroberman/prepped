import { NextRequest } from "next/server";
import { getSession, getAnalysesBySession } from "@/lib/db/queries";
import { runAgentPipeline } from "@/lib/ai/agents/orchestrator";
import type { AgentType, TokenUsage } from "@/types";

export const dynamic = "force-dynamic";

// Prevent concurrent pipeline runs for the same session
const runningPipelines = new Set<string>();

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const { sessionId } = await params;
  const session = getSession(sessionId);

  if (!session) {
    return new Response("Session not found", { status: 404 });
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: unknown) => {
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
        } catch {
          // Controller may be closed if client disconnected
        }
      };

      // Check current state of analyses
      const existing = getAnalysesBySession(sessionId);
      const allDone = existing.length === 5 && existing.every((a) => a.status === "completed" || a.status === "failed");

      if (allDone) {
        // All done — just replay existing results
        for (const analysis of existing) {
          send({
            agent_type: analysis.agent_type,
            status: analysis.status,
            result: analysis.result ? JSON.parse(analysis.result) : null,
            error: analysis.error,
            prompt_tokens: analysis.prompt_tokens,
            completion_tokens: analysis.completion_tokens,
          });
        }
        send({ type: "done" });
        controller.close();
        return;
      }

      // If pipeline is already running for this session, poll for updates instead
      if (runningPipelines.has(sessionId)) {
        await pollForResults(sessionId, send);
        send({ type: "done" });
        controller.close();
        return;
      }

      // Send any existing completed results first
      for (const analysis of existing) {
        if (analysis.status === "completed" || analysis.status === "failed") {
          send({
            agent_type: analysis.agent_type,
            status: analysis.status,
            result: analysis.result ? JSON.parse(analysis.result) : null,
            error: analysis.error,
            prompt_tokens: analysis.prompt_tokens,
            completion_tokens: analysis.completion_tokens,
          });
        }
      }

      // Run pipeline
      runningPipelines.add(sessionId);
      try {
        await runAgentPipeline(
          sessionId,
          session.cv_text,
          session.job_url,
          (agentType: AgentType, status: string, result?: unknown, error?: string, usage?: TokenUsage) => {
            send({ agent_type: agentType, status, result, error, prompt_tokens: usage?.prompt_tokens, completion_tokens: usage?.completion_tokens });
          }
        );
      } catch (error) {
        send({ type: "error", message: error instanceof Error ? error.message : "Pipeline failed" });
      } finally {
        runningPipelines.delete(sessionId);
      }

      send({ type: "done" });
      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}

/** Poll the database until all analyses are done, sending updates as they complete */
async function pollForResults(
  sessionId: string,
  send: (data: unknown) => void
) {
  const seen = new Set<string>();
  for (let i = 0; i < 120; i++) {
    await new Promise((r) => setTimeout(r, 1000));
    const analyses = getAnalysesBySession(sessionId);
    for (const a of analyses) {
      const key = `${a.agent_type}:${a.status}`;
      if (!seen.has(key) && (a.status === "running" || a.status === "completed" || a.status === "failed")) {
        seen.add(key);
        send({
          agent_type: a.agent_type,
          status: a.status,
          result: a.result ? JSON.parse(a.result) : null,
          error: a.error,
          prompt_tokens: a.prompt_tokens,
          completion_tokens: a.completion_tokens,
        });
      }
    }
    const allDone = analyses.length === 5 && analyses.every((a) => a.status === "completed" || a.status === "failed");
    if (allDone) break;
  }
}
