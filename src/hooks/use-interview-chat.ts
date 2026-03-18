"use client";

import { useState, useCallback } from "react";
import type { Message, InterviewPhase, EffectiveDifficulty } from "@/types";

interface ChatState {
  messages: Message[];
  isLoading: boolean;
  currentPhase: InterviewPhase;
  isComplete: boolean;
  error: string | null;
  effectiveDifficulty: EffectiveDifficulty | null;
}

export function useInterviewChat(sessionId: string, difficulty?: string) {
  const [state, setState] = useState<ChatState>({
    messages: [],
    isLoading: false,
    currentPhase: "warmup",
    isComplete: false,
    error: null,
    effectiveDifficulty: null,
  });

  const startInterview = useCallback(async () => {
    setState((s) => ({ ...s, isLoading: true, error: null }));
    try {
      const res = await fetch(`/api/interview/${sessionId}/start`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ difficulty: difficulty || "realistic" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to start");
      setState((s) => ({
        ...s,
        messages: data.messages,
        currentPhase: data.interview.current_phase,
        effectiveDifficulty: data.interview.effective_difficulty || null,
        isLoading: false,
      }));
    } catch (err) {
      setState((s) => ({
        ...s,
        isLoading: false,
        error: err instanceof Error ? err.message : "Failed to start interview",
      }));
    }
  }, [sessionId, difficulty]);

  const sendMessage = useCallback(
    async (content: string) => {
      // Add candidate message optimistically
      const candidateMsg: Message = {
        id: `temp-${Date.now()}`,
        interview_id: "",
        role: "candidate",
        content,
        phase: state.currentPhase,
        evaluation: null,
        created_at: new Date().toISOString(),
        prompt_tokens: 0,
        completion_tokens: 0,
        quality_score: null,
      };

      setState((s) => ({
        ...s,
        messages: [...s.messages, candidateMsg],
        isLoading: true,
        error: null,
      }));

      try {
        const res = await fetch(`/api/interview/${sessionId}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message: content }),
        });

        if (!res.ok) throw new Error("Failed to send message");

        const reader = res.body?.getReader();
        if (!reader) throw new Error("No response stream");

        const decoder = new TextDecoder();
        let interviewerContent = "";

        // Add placeholder for interviewer response
        const interviewerMsg: Message = {
          id: `temp-interviewer-${Date.now()}`,
          interview_id: "",
          role: "interviewer",
          content: "",
          phase: state.currentPhase,
          evaluation: null,
          created_at: new Date().toISOString(),
          prompt_tokens: 0,
          completion_tokens: 0,
          quality_score: null,
        };

        setState((s) => ({
          ...s,
          messages: [...s.messages, interviewerMsg],
        }));

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const text = decoder.decode(value);
          const lines = text.split("\n");

          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;
            try {
              const data = JSON.parse(line.slice(6));

              if (data.type === "delta") {
                interviewerContent += data.content;
                setState((s) => {
                  const msgs = [...s.messages];
                  const last = msgs[msgs.length - 1];
                  if (last.role === "interviewer") {
                    msgs[msgs.length - 1] = { ...last, content: interviewerContent };
                  }
                  return { ...s, messages: msgs };
                });
              } else if (data.type === "replace") {
                // Replace full content (used to strip score tags)
                interviewerContent = data.content;
                setState((s) => {
                  const msgs = [...s.messages];
                  const last = msgs[msgs.length - 1];
                  if (last.role === "interviewer") {
                    msgs[msgs.length - 1] = { ...last, content: data.content };
                  }
                  return { ...s, messages: msgs };
                });
              } else if (data.type === "done") {
                setState((s) => ({
                  ...s,
                  currentPhase: data.phase || s.currentPhase,
                  effectiveDifficulty: data.effectiveDifficulty || s.effectiveDifficulty,
                  isLoading: false,
                }));
              } else if (data.type === "complete") {
                setState((s) => ({
                  ...s,
                  isComplete: true,
                  isLoading: false,
                }));
              } else if (data.type === "error") {
                setState((s) => ({
                  ...s,
                  error: data.message,
                  isLoading: false,
                }));
              }
            } catch {
              // Skip unparseable lines
            }
          }
        }
      } catch (err) {
        setState((s) => ({
          ...s,
          isLoading: false,
          error: err instanceof Error ? err.message : "Failed to send message",
        }));
      }
    },
    [sessionId, state.currentPhase]
  );

  const endInterview = useCallback(async () => {
    setState((s) => ({ ...s, isLoading: true }));
    try {
      const res = await fetch(`/api/interview/${sessionId}/end`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to end interview");
      return data.report;
    } catch (err) {
      setState((s) => ({
        ...s,
        isLoading: false,
        error: err instanceof Error ? err.message : "Failed to generate report",
      }));
      return null;
    }
  }, [sessionId]);

  return {
    ...state,
    startInterview,
    sendMessage,
    endInterview,
  };
}
