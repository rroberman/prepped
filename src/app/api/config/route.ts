import { NextResponse } from "next/server";

export async function GET() {
  const provider = process.env.LLM_PROVIDER || "openai";

  let model = "";
  switch (provider) {
    case "openai":
      model = process.env.OPENAI_MODEL || "gpt-4o";
      break;
    case "anthropic":
      model = process.env.ANTHROPIC_MODEL || "claude-sonnet-4-20250514";
      break;
    case "gemini":
      model = process.env.GEMINI_MODEL || "gemini-2.5-flash";
      break;
    case "ollama":
      model = process.env.OLLAMA_MODEL || "llama3";
      break;
    case "openrouter":
      model = process.env.OPENROUTER_MODEL || "openai/gpt-4o";
      break;
  }

  return NextResponse.json({ provider, model });
}
