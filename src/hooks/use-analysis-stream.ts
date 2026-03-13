"use client";

import { useState, useEffect, useRef } from "react";
import type { AgentType } from "@/types";

interface AgentState {
  status: "pending" | "running" | "completed" | "failed";
  result: unknown | null;
  error: string | null;
  prompt_tokens: number;
  completion_tokens: number;
}

type AgentMap = Record<AgentType, AgentState>;

const initialAgentState: AgentState = { status: "pending", result: null, error: null, prompt_tokens: 0, completion_tokens: 0 };

const defaultAgents = (): AgentMap => ({
  scout: { ...initialAgentState },
  profiler: { ...initialAgentState },
  auditor: { ...initialAgentState },
  strategist: { ...initialAgentState },
  coach: { ...initialAgentState },
});

export function useAnalysisStream(sessionId: string) {
  const [agents, setAgents] = useState<AgentMap>(defaultAgents);
  const [isDone, setIsDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);

  useEffect(() => {
    // Close any existing connection
    eventSourceRef.current?.close();

    const eventSource = new EventSource(`/api/analysis/${sessionId}`);
    eventSourceRef.current = eventSource;

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        if (data.type === "done") {
          setIsDone(true);
          eventSource.close();
          return;
        }

        if (data.type === "error") {
          setError(data.message);
          eventSource.close();
          return;
        }

        if (data.agent_type) {
          setAgents((prev) => ({
            ...prev,
            [data.agent_type as AgentType]: {
              status: data.status,
              result: data.result || null,
              error: data.error || null,
              prompt_tokens: data.prompt_tokens || 0,
              completion_tokens: data.completion_tokens || 0,
            },
          }));
        }
      } catch {
        // Ignore parse errors
      }
    };

    eventSource.onerror = () => {
      eventSource.close();
    };

    return () => {
      eventSource.close();
    };
  }, [sessionId]);

  const completedCount = Object.values(agents).filter(
    (a) => a.status === "completed" || a.status === "failed"
  ).length;

  const totalTokens = Object.values(agents).reduce(
    (acc, a) => ({
      prompt_tokens: acc.prompt_tokens + a.prompt_tokens,
      completion_tokens: acc.completion_tokens + a.completion_tokens,
    }),
    { prompt_tokens: 0, completion_tokens: 0 }
  );

  return { agents, isDone, error, completedCount, total: 5, totalTokens };
}
