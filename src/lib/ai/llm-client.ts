import { createOpenAIProvider } from "./providers/openai";
import { createAnthropicProvider } from "./providers/anthropic";

// --- Public types ---

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface StreamChunk {
  content: string;
  usage?: { prompt_tokens: number; completion_tokens: number };
}

export interface CompletionOptions {
  temperature?: number;
  maxTokens?: number;
}

export interface LLMProvider {
  chatCompletion(
    systemPrompt: string,
    userPrompt: string,
    options?: CompletionOptions
  ): Promise<{ content: string; usage: { prompt_tokens: number; completion_tokens: number } }>;

  jsonCompletion(
    systemPrompt: string,
    userPrompt: string,
    options?: CompletionOptions
  ): Promise<{ raw: string; usage: { prompt_tokens: number; completion_tokens: number } }>;

  streamChatCompletion(
    messages: ChatMessage[],
    options?: CompletionOptions
  ): Promise<AsyncIterable<StreamChunk>>;
}

// --- Provider singleton ---

let provider: LLMProvider | null = null;

function getProvider(): LLMProvider {
  if (!provider) {
    const name = process.env.LLM_PROVIDER || "openai";
    switch (name) {
      case "anthropic":
        provider = createAnthropicProvider({
          apiKey: process.env.ANTHROPIC_API_KEY!,
          model: process.env.ANTHROPIC_MODEL || "claude-sonnet-4-20250514",
        });
        break;
      case "gemini":
        provider = createOpenAIProvider({
          apiKey: process.env.GEMINI_API_KEY!,
          baseURL: "https://generativelanguage.googleapis.com/v1beta/openai",
          model: process.env.GEMINI_MODEL || "gemini-2.5-flash",
        });
        break;
      case "ollama":
        provider = createOpenAIProvider({
          apiKey: "ollama",
          baseURL: process.env.OLLAMA_BASE_URL
            ? `${process.env.OLLAMA_BASE_URL}/v1`
            : "http://localhost:11434/v1",
          model: process.env.OLLAMA_MODEL || "llama3",
          supportsStreamOptions: false,
          supportsJsonMode: false,
        });
        break;
      case "openrouter":
        provider = createOpenAIProvider({
          apiKey: process.env.OPENROUTER_API_KEY!,
          baseURL: "https://openrouter.ai/api/v1",
          model: process.env.OPENROUTER_MODEL || "openai/gpt-4o",
        });
        break;
      case "openai":
      default:
        provider = createOpenAIProvider({
          apiKey: process.env.OPENAI_API_KEY!,
          model: process.env.OPENAI_MODEL || "gpt-4o",
        });
        break;
    }
  }
  return provider;
}

// --- Public API ---

export async function chatCompletion(
  systemPrompt: string,
  userPrompt: string,
  options?: CompletionOptions
): Promise<{ content: string; usage: { prompt_tokens: number; completion_tokens: number } }> {
  return getProvider().chatCompletion(systemPrompt, userPrompt, options);
}

export async function jsonCompletion<T = unknown>(
  systemPrompt: string,
  userPrompt: string,
  options?: CompletionOptions
): Promise<{ data: T; usage: { prompt_tokens: number; completion_tokens: number } }> {
  const { raw, usage } = await getProvider().jsonCompletion(systemPrompt, userPrompt, options);
  return { data: JSON.parse(cleanJsonResponse(raw)) as T, usage };
}

export async function streamChatCompletion(
  messages: ChatMessage[],
  options?: CompletionOptions
): Promise<AsyncIterable<StreamChunk>> {
  return getProvider().streamChatCompletion(messages, options);
}

/** Strip markdown code fences that LLMs sometimes wrap around JSON */
function cleanJsonResponse(text: string): string {
  let cleaned = text.trim();
  if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```(?:json)?\s*\n?/, "").replace(/\n?\s*```$/, "");
  }
  return cleaned.trim();
}
