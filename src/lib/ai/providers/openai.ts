import OpenAI from "openai";
import type { LLMProvider, ChatMessage, CompletionOptions, StreamChunk } from "../llm-client";

interface OpenAIProviderConfig {
  apiKey: string;
  baseURL?: string;
  model: string;
  supportsStreamOptions?: boolean;
  supportsJsonMode?: boolean;
}

export function createOpenAIProvider(config: OpenAIProviderConfig): LLMProvider {
  const client = new OpenAI({
    apiKey: config.apiKey,
    baseURL: config.baseURL,
  });
  const model = config.model;
  const supportsStreamOptions = config.supportsStreamOptions ?? true;
  const supportsJsonMode = config.supportsJsonMode ?? true;

  return {
    async chatCompletion(systemPrompt, userPrompt, options) {
      return withRetries(async () => {
        const response = await client.chat.completions.create({
          model,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
          temperature: options?.temperature ?? 0.7,
          max_tokens: options?.maxTokens ?? 2000,
        });
        return {
          content: response.choices[0]?.message?.content || "",
          usage: {
            prompt_tokens: response.usage?.prompt_tokens ?? 0,
            completion_tokens: response.usage?.completion_tokens ?? 0,
          },
        };
      });
    },

    async jsonCompletion(systemPrompt, userPrompt, options) {
      return withRetries(async () => {
        const response = await client.chat.completions.create({
          model,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
          temperature: options?.temperature ?? 0.7,
          max_tokens: options?.maxTokens ?? 2000,
          ...(supportsJsonMode && { response_format: { type: "json_object" as const } }),
        });
        const raw = response.choices[0]?.message?.content || "{}";
        return {
          raw,
          usage: {
            prompt_tokens: response.usage?.prompt_tokens ?? 0,
            completion_tokens: response.usage?.completion_tokens ?? 0,
          },
        };
      });
    },

    async streamChatCompletion(messages, options) {
      const openaiMessages: OpenAI.Chat.ChatCompletionMessageParam[] = messages.map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const stream = await client.chat.completions.create({
        model,
        messages: openaiMessages,
        temperature: options?.temperature ?? 0.7,
        max_tokens: options?.maxTokens ?? 1500,
        stream: true,
        ...(supportsStreamOptions && { stream_options: { include_usage: true } }),
      });

      return (async function* (): AsyncIterable<StreamChunk> {
        for await (const chunk of stream) {
          const content = chunk.choices[0]?.delta?.content || "";
          const usage = chunk.usage
            ? { prompt_tokens: chunk.usage.prompt_tokens ?? 0, completion_tokens: chunk.usage.completion_tokens ?? 0 }
            : undefined;
          yield { content, usage };
        }
      })();
    },
  };
}

async function withRetries<T>(fn: () => Promise<T>, maxRetries = 3): Promise<T> {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      if (attempt === maxRetries - 1) throw error;
      await new Promise((r) => setTimeout(r, Math.pow(2, attempt) * 1000));
    }
  }
  throw new Error("Failed after retries");
}
