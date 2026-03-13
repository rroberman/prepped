"use client";

import { Mic, MicOff, Volume2, X, Send, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { VoiceState, TtsMode, VoiceLanguage } from "@/hooks/use-voice-mode";
import { VOICE_LANGUAGES } from "@/hooks/use-voice-mode";

interface VoiceControlsProps {
  voiceState: VoiceState;
  interimTranscript: string;
  finalTranscript: string;
  ttsMode: TtsMode;
  lang: VoiceLanguage;
  openaiTtsAvailable: boolean;
  onTtsModeChange: (mode: TtsMode) => void;
  onLangChange: (lang: VoiceLanguage) => void;
  onStartListening: () => void;
  onStopListening: () => void;
  onCancelListening: () => void;
  onStopSpeaking: () => void;
  error: string | null;
  disabled?: boolean;
}

export function VoiceControls({
  voiceState,
  interimTranscript,
  finalTranscript,
  ttsMode,
  lang,
  openaiTtsAvailable,
  onTtsModeChange,
  onLangChange,
  onStartListening,
  onStopListening,
  onCancelListening,
  onStopSpeaking,
  error,
  disabled,
}: VoiceControlsProps) {
  const transcript = finalTranscript + (interimTranscript ? " " + interimTranscript : "");
  const hasTranscript = transcript.trim().length > 0;

  const stateLabel: Record<VoiceState, string> = {
    idle: "Tap to speak",
    listening: "Listening...",
    processing: "Sending...",
    speaking: "Speaking...",
  };

  const handleMicClick = () => {
    if (disabled && voiceState === "idle") return;
    switch (voiceState) {
      case "idle":
        onStartListening();
        break;
      case "listening":
        onStopListening();
        break;
      case "speaking":
        onStopSpeaking();
        break;
    }
  };

  return (
    <div className="flex flex-col items-center gap-3 py-2">
      {/* Language + TTS pickers */}
      <div className="flex items-center gap-2">
        <select
          value={lang}
          onChange={(e) => onLangChange(e.target.value as VoiceLanguage)}
          className="rounded-lg bg-surface border border-border px-2 py-1 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-accent/30"
        >
          {VOICE_LANGUAGES.map((l) => (
            <option key={l.code} value={l.code}>
              {l.label}
            </option>
          ))}
        </select>
      </div>
      <div className="flex items-center gap-1 rounded-lg bg-surface border border-border p-0.5 text-xs">
        <button
          onClick={() => onTtsModeChange("browser")}
          className={cn(
            "px-3 py-1 rounded-md transition-colors cursor-pointer",
            ttsMode === "browser"
              ? "bg-surface-light text-foreground"
              : "text-muted hover:text-foreground"
          )}
        >
          Browser (Free)
        </button>
        {openaiTtsAvailable && (
          <button
            onClick={() => onTtsModeChange("openai")}
            className={cn(
              "px-3 py-1 rounded-md transition-colors cursor-pointer",
              ttsMode === "openai"
                ? "bg-surface-light text-foreground"
                : "text-muted hover:text-foreground"
            )}
          >
            Natural (OpenAI)
          </button>
        )}
      </div>

      {/* Transcript display */}
      {voiceState === "listening" && (
        <div className="w-full min-h-[44px] rounded-xl bg-surface border border-border px-4 py-3 text-sm text-foreground">
          {hasTranscript ? (
            <span>
              {finalTranscript}
              {interimTranscript && (
                <span className="text-muted">{" " + interimTranscript}</span>
              )}
            </span>
          ) : (
            <span className="text-muted">Start speaking...</span>
          )}
        </div>
      )}

      {/* Controls row */}
      <div className="flex items-center gap-4">
        {/* Cancel button */}
        {voiceState === "listening" && (
          <button
            onClick={onCancelListening}
            className="w-10 h-10 rounded-full bg-surface border border-border flex items-center justify-center text-muted hover:text-foreground hover:bg-surface-light transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        )}

        {/* Main mic button */}
        <button
          onClick={handleMicClick}
          disabled={disabled && voiceState === "idle"}
          className={cn(
            "w-14 h-14 rounded-full flex items-center justify-center transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed",
            {
              "bg-accent text-background hover:bg-accent/90":
                voiceState === "idle",
              "bg-danger text-white animate-pulse":
                voiceState === "listening",
              "bg-surface-light text-muted border border-border":
                voiceState === "processing",
              "bg-accent/20 text-accent border border-accent/30 hover:bg-accent/30":
                voiceState === "speaking",
            }
          )}
        >
          {voiceState === "idle" && <Mic className="w-6 h-6" />}
          {voiceState === "listening" && <MicOff className="w-6 h-6" />}
          {voiceState === "processing" && (
            <Loader2 className="w-6 h-6 animate-spin" />
          )}
          {voiceState === "speaking" && <Volume2 className="w-6 h-6" />}
        </button>

        {/* Send button */}
        {voiceState === "listening" && hasTranscript && (
          <button
            onClick={onStopListening}
            className="w-10 h-10 rounded-full bg-accent text-background flex items-center justify-center hover:bg-accent/90 transition-colors cursor-pointer"
          >
            <Send className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* State label */}
      <p className="text-xs text-muted">{stateLabel[voiceState]}</p>

      {/* Error */}
      {error && (
        <p className="text-xs text-danger text-center max-w-xs">{error}</p>
      )}
    </div>
  );
}
