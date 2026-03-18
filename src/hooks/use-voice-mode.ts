"use client";

import { useState, useRef, useCallback, useEffect } from "react";

export type VoiceState = "idle" | "listening" | "processing" | "speaking";
export type TtsMode = "browser" | "openai";

export const VOICE_LANGUAGES = [
  { code: "en-US", label: "English" },
  { code: "he-IL", label: "עברית" },
  { code: "ar-SA", label: "العربية" },
  { code: "es-ES", label: "Español" },
  { code: "fr-FR", label: "Français" },
  { code: "de-DE", label: "Deutsch" },
  { code: "ru-RU", label: "Русский" },
  { code: "zh-CN", label: "中文" },
  { code: "ja-JP", label: "日本語" },
] as const;

export type VoiceLanguage = (typeof VOICE_LANGUAGES)[number]["code"];

interface UseVoiceModeOptions {
  ttsMode: TtsMode;
  lang: VoiceLanguage;
  sessionId?: string;
  onFinalTranscript?: (transcript: string) => void;
}

interface UseVoiceModeReturn {
  isSupported: boolean;
  openaiTtsAvailable: boolean;
  voiceState: VoiceState;
  interimTranscript: string;
  finalTranscript: string;
  startListening: () => void;
  stopListening: () => void;
  cancelListening: () => void;
  speak: (text: string) => void;
  stopSpeaking: () => void;
  error: string | null;
}

function getSpeechRecognitionCtor(): (new () => SpeechRecognition) | null {
  if (typeof window === "undefined") return null;
  return (window as unknown as Record<string, unknown>).SpeechRecognition as (new () => SpeechRecognition) | null
    ?? (window as unknown as Record<string, unknown>).webkitSpeechRecognition as (new () => SpeechRecognition) | null
    ?? null;
}

export function useVoiceMode({
  ttsMode,
  lang,
  sessionId,
  onFinalTranscript,
}: UseVoiceModeOptions): UseVoiceModeReturn {
  const [voiceState, setVoiceState] = useState<VoiceState>("idle");
  const [interimTranscript, setInterimTranscript] = useState("");
  const [finalTranscript, setFinalTranscript] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [openaiTtsAvailable, setOpenaiTtsAvailable] = useState(false);

  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioUrlRef = useRef<string | null>(null);
  const synthResumeIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isListeningRef = useRef(false);
  const finalTranscriptRef = useRef("");
  const interimTranscriptRef = useRef("");
  const startListeningRef = useRef<() => void>(() => {});

  const isSupported = typeof window !== "undefined" && !!getSpeechRecognitionCtor();

  // Check OpenAI TTS availability on mount
  useEffect(() => {
    fetch("/api/tts", { method: "HEAD" })
      .then((res) => setOpenaiTtsAvailable(res.ok))
      .catch(() => setOpenaiTtsAvailable(false));
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      recognitionRef.current?.abort();
      if (audioUrlRef.current) URL.revokeObjectURL(audioUrlRef.current);
      if (synthResumeIntervalRef.current) clearInterval(synthResumeIntervalRef.current);
      window.speechSynthesis?.cancel();
    };
  }, []);

  const startListening = useCallback(() => {
    if (isListeningRef.current) return;
    const Ctor = getSpeechRecognitionCtor();
    if (!Ctor) return;

    setError(null);
    setInterimTranscript("");
    setFinalTranscript("");
    finalTranscriptRef.current = "";
    interimTranscriptRef.current = "";

    // Stop any ongoing speech
    window.speechSynthesis?.cancel();
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }

    const recognition = new Ctor();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = lang;

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let interim = "";
      let final = "";
      for (let i = 0; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          final += result[0].transcript;
        } else {
          interim += result[0].transcript;
        }
      }
      finalTranscriptRef.current = final;
      interimTranscriptRef.current = interim;
      setFinalTranscript(final);
      setInterimTranscript(interim);
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      if (event.error === "not-allowed") {
        setError("Microphone access denied. Please allow microphone access and try again.");
      } else if (event.error !== "aborted" && event.error !== "no-speech") {
        setError(`Speech recognition error: ${event.error}`);
      }
      isListeningRef.current = false;
      setVoiceState("idle");
    };

    recognition.onend = () => {
      if (!isListeningRef.current) return;
      // Auto-submit on silence if we have content
      const transcript = (finalTranscriptRef.current + " " + interimTranscriptRef.current).trim();
      isListeningRef.current = false;
      if (transcript) {
        setVoiceState("processing");
        setFinalTranscript(transcript);
        setInterimTranscript("");
        onFinalTranscript?.(transcript);
      } else {
        setVoiceState("idle");
      }
    };

    recognitionRef.current = recognition;
    isListeningRef.current = true;
    setVoiceState("listening");

    try {
      recognition.start();
    } catch {
      isListeningRef.current = false;
      setVoiceState("idle");
      setError("Failed to start speech recognition.");
    }
  }, [lang, onFinalTranscript]);

  // Keep ref in sync so speak callbacks can call latest startListening
  useEffect(() => {
    startListeningRef.current = startListening;
  }, [startListening]);

  const stopListening = useCallback(() => {
    if (!isListeningRef.current || !recognitionRef.current) return;
    const transcript = (finalTranscriptRef.current + " " + interimTranscriptRef.current).trim();
    isListeningRef.current = false;
    recognitionRef.current.stop();
    recognitionRef.current = null;

    if (transcript) {
      setVoiceState("processing");
      setFinalTranscript(transcript);
      setInterimTranscript("");
      onFinalTranscript?.(transcript);
    } else {
      setVoiceState("idle");
    }
  }, [onFinalTranscript]);

  const cancelListening = useCallback(() => {
    isListeningRef.current = false;
    recognitionRef.current?.abort();
    recognitionRef.current = null;
    setVoiceState("idle");
    setInterimTranscript("");
    setFinalTranscript("");
    finalTranscriptRef.current = "";
    interimTranscriptRef.current = "";
  }, []);

  const speak = useCallback(
    (text: string) => {
      setError(null);

      if (ttsMode === "browser") {
        // Browser SpeechSynthesis
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = 1;
        utterance.pitch = 1;

        utterance.onstart = () => setVoiceState("speaking");
        utterance.onend = () => {
          if (synthResumeIntervalRef.current) {
            clearInterval(synthResumeIntervalRef.current);
            synthResumeIntervalRef.current = null;
          }
          setVoiceState("idle");
          startListeningRef.current();
        };
        utterance.onerror = () => {
          if (synthResumeIntervalRef.current) {
            clearInterval(synthResumeIntervalRef.current);
            synthResumeIntervalRef.current = null;
          }
          setVoiceState("idle");
        };

        window.speechSynthesis.speak(utterance);
        setVoiceState("speaking");

        // Chrome workaround: Chrome pauses SpeechSynthesis after ~15s
        synthResumeIntervalRef.current = setInterval(() => {
          if (window.speechSynthesis.speaking) {
            window.speechSynthesis.pause();
            window.speechSynthesis.resume();
          } else {
            if (synthResumeIntervalRef.current) {
              clearInterval(synthResumeIntervalRef.current);
              synthResumeIntervalRef.current = null;
            }
          }
        }, 10000);
      } else {
        // OpenAI TTS
        setVoiceState("speaking");
        fetch("/api/tts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text, sessionId }),
        })
          .then((res) => {
            if (!res.ok) throw new Error("TTS request failed");
            return res.blob();
          })
          .then((blob) => {
            if (audioUrlRef.current) URL.revokeObjectURL(audioUrlRef.current);
            const url = URL.createObjectURL(blob);
            audioUrlRef.current = url;
            const audio = new Audio(url);
            audioRef.current = audio;
            audio.onended = () => {
              audioRef.current = null;
              setVoiceState("idle");
              startListeningRef.current();
            };
            audio.onerror = () => {
              setVoiceState("idle");
              audioRef.current = null;
              setError("Audio playback failed");
            };
            audio.play();
          })
          .catch((err) => {
            setVoiceState("idle");
            setError(err instanceof Error ? err.message : "TTS failed");
          });
      }
    },
    [ttsMode, sessionId]
  );

  const stopSpeaking = useCallback(() => {
    if (ttsMode === "browser") {
      window.speechSynthesis.cancel();
      if (synthResumeIntervalRef.current) {
        clearInterval(synthResumeIntervalRef.current);
        synthResumeIntervalRef.current = null;
      }
    } else {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    }
    setVoiceState("idle");
  }, [ttsMode]);

  return {
    isSupported,
    openaiTtsAvailable,
    voiceState,
    interimTranscript,
    finalTranscript,
    startListening,
    stopListening,
    cancelListening,
    speak,
    stopSpeaking,
    error,
  };
}
