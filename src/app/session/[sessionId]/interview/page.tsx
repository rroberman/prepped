"use client";

import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState, useCallback } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, PhoneOff, FileText, Mic, Keyboard } from "lucide-react";
import { useInterviewChat } from "@/hooks/use-interview-chat";
import { useVoiceMode, type TtsMode, type VoiceLanguage } from "@/hooks/use-voice-mode";
import { ChatMessage } from "@/components/interview/chat-message";
import { ChatInput } from "@/components/interview/chat-input";
import { VoiceControls } from "@/components/interview/voice-controls";
import { PhaseIndicator } from "@/components/interview/phase-indicator";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function InterviewPage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const difficulty = searchParams.get("difficulty") || "realistic";
  const {
    messages,
    isLoading,
    currentPhase,
    isComplete,
    error,
    startInterview,
    sendMessage,
    endInterview,
  } = useInterviewChat(sessionId, difficulty);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const started = useRef(false);
  const [isVoiceMode, setIsVoiceMode] = useState(false);
  const [ttsMode, setTtsMode] = useState<TtsMode>("browser");
  const [voiceLang, setVoiceLang] = useState<VoiceLanguage>("en-US");
  const prevIsLoadingRef = useRef(false);

  const handleVoiceTranscript = useCallback(
    (transcript: string) => sendMessage(transcript),
    [sendMessage]
  );

  const voice = useVoiceMode({
    ttsMode,
    lang: voiceLang,
    sessionId,
    onFinalTranscript: handleVoiceTranscript,
  });

  useEffect(() => {
    if (!started.current) {
      started.current = true;
      startInterview();
    }
  }, [startInterview]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Auto-speak interviewer response when streaming finishes
  useEffect(() => {
    if (prevIsLoadingRef.current && !isLoading && isVoiceMode && messages.length > 0) {
      const lastMsg = messages[messages.length - 1];
      if (lastMsg.role === "interviewer" && lastMsg.content) {
        voice.speak(lastMsg.content);
      }
    }
    prevIsLoadingRef.current = isLoading;
  }, [isLoading, isVoiceMode, messages, voice]);

  const handleEndInterview = async () => {
    voice.cancelListening();
    voice.stopSpeaking();
    await endInterview();
    router.push(`/session/${sessionId}/report`);
  };

  return (
    <div className="h-screen flex flex-col">
      <header className="border-b border-border flex-shrink-0">
        <div className="max-w-4xl mx-auto px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href={`/session/${sessionId}`} className="text-muted hover:text-foreground transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <span className="font-semibold text-sm tracking-tight">Mock Interview</span>
          </div>
          <div className="flex items-center gap-4">
            <PhaseIndicator currentPhase={currentPhase} />
            <Button
              variant="danger"
              size="sm"
              onClick={handleEndInterview}
              disabled={isLoading || messages.length < 2}
            >
              <PhoneOff className="w-3.5 h-3.5 mr-1.5" />
              End & Get Report
            </Button>
          </div>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto px-6 py-6 space-y-4">
          {messages.map((msg) => (
            <ChatMessage key={msg.id} message={msg} />
          ))}

          {isLoading && messages[messages.length - 1]?.role !== "interviewer" && (
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-accent/10 flex items-center justify-center flex-shrink-0">
                <div className="w-3 h-3 rounded-full bg-accent/60 animate-pulse" />
              </div>
              <div className="bg-surface border border-border rounded-xl px-4 py-3">
                <div className="flex gap-1">
                  <span className="w-2 h-2 bg-muted rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                  <span className="w-2 h-2 bg-muted rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                  <span className="w-2 h-2 bg-muted rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                </div>
              </div>
            </div>
          )}

          {isComplete && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="my-8 mx-auto max-w-md"
            >
              <div className="rounded-xl border border-accent/30 bg-accent/5 p-6 text-center">
                <p className="text-xs font-medium text-accent uppercase tracking-wider mb-3">Interview Complete</p>
                <p className="text-sm text-muted mb-5">
                  Generate your hiring committee report to see how you did.
                </p>
                <motion.div
                  animate={{ scale: [1, 1.02, 1] }}
                  transition={{ repeat: Infinity, duration: 2.5, ease: "easeInOut" }}
                >
                  <Button size="lg" onClick={handleEndInterview} loading={isLoading}>
                    <FileText className="w-5 h-5 mr-2" />
                    Get Report
                  </Button>
                </motion.div>
              </div>
            </motion.div>
          )}

          {error && (
            <div className="text-center py-4">
              <p className="text-sm text-danger">{error}</p>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {!isComplete && (
        <div className="border-t border-border flex-shrink-0">
          <div className="max-w-4xl mx-auto px-6 py-4">
            {isVoiceMode ? (
              <VoiceControls
                voiceState={voice.voiceState}
                interimTranscript={voice.interimTranscript}
                finalTranscript={voice.finalTranscript}
                ttsMode={ttsMode}
                lang={voiceLang}
                openaiTtsAvailable={voice.openaiTtsAvailable}
                onTtsModeChange={setTtsMode}
                onLangChange={setVoiceLang}
                onStartListening={voice.startListening}
                onStopListening={voice.stopListening}
                onCancelListening={voice.cancelListening}
                onStopSpeaking={voice.stopSpeaking}
                error={voice.error}
                disabled={isLoading || messages.length === 0}
              />
            ) : (
              <ChatInput
                onSend={sendMessage}
                disabled={isLoading || messages.length === 0}
              />
            )}
            {voice.isSupported && (
              <div className="flex justify-center mt-2">
                <button
                  onClick={() => {
                    if (isVoiceMode) {
                      voice.cancelListening();
                      voice.stopSpeaking();
                    }
                    setIsVoiceMode(!isVoiceMode);
                  }}
                  className="flex items-center gap-1.5 text-xs text-muted hover:text-foreground transition-colors cursor-pointer"
                >
                  {isVoiceMode ? (
                    <>
                      <Keyboard className="w-3.5 h-3.5" />
                      Switch to text
                    </>
                  ) : (
                    <>
                      <Mic className="w-3.5 h-3.5" />
                      Switch to voice
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
