import { NextRequest, NextResponse } from "next/server";
import { createTtsUsage } from "@/lib/db/queries";

function isOpenAIConfigured(): boolean {
  const provider = process.env.LLM_PROVIDER || "openai";
  return provider === "openai" && !!process.env.OPENAI_API_KEY;
}

function stripMarkdown(text: string): string {
  return text
    .replace(/#{1,6}\s+/g, "")
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/\*(.+?)\*/g, "$1")
    .replace(/`{1,3}[^`]*`{1,3}/g, "")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/^[-*+]\s+/gm, "")
    .replace(/^\d+\.\s+/gm, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export async function HEAD() {
  if (!isOpenAIConfigured()) {
    return new NextResponse(null, { status: 404 });
  }
  return new NextResponse(null, { status: 200 });
}

export async function POST(request: NextRequest) {
  if (!isOpenAIConfigured()) {
    return NextResponse.json({ error: "OpenAI TTS not available" }, { status: 404 });
  }

  const { text, voice, sessionId } = await request.json();
  if (!text || typeof text !== "string") {
    return NextResponse.json({ error: "text is required" }, { status: 400 });
  }

  const cleanText = stripMarkdown(text);
  const ttsVoice = voice || "alloy";

  const response = await fetch("https://api.openai.com/v1/audio/speech", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "tts-1",
      input: cleanText.slice(0, 4096),
      voice: ttsVoice,
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    return NextResponse.json({ error: `TTS failed: ${err}` }, { status: 500 });
  }

  // Track TTS usage
  if (sessionId) {
    try {
      createTtsUsage(sessionId, cleanText.slice(0, 4096).length);
    } catch {
      // Non-critical — don't fail the request
    }
  }

  const audioBuffer = await response.arrayBuffer();
  return new NextResponse(audioBuffer, {
    headers: {
      "Content-Type": "audio/mpeg",
      "Content-Length": audioBuffer.byteLength.toString(),
    },
  });
}
