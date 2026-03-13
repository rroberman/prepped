import Anthropic from "@anthropic-ai/sdk";
import type { LLMProvider, StreamChunk } from "../llm-client";

interface AnthropicProviderConfig {
  apiKey: string;
  model: string;
}

export function createAnthropicProvider(config: AnthropicProviderConfig): LLMProvider {
  const client = new Anthropic({ apiKey: config.apiKey });
  const model = config.model;

  return {
    async chatCompletion(systemPrompt, userPrompt, options) {
      return withRetries(async () => {
        const response = await client.messages.create({
          model,
          max_tokens: options?.maxTokens ?? 2000,
          temperature: options?.temperature ?? 0.7,
          system: systemPrompt,
          messages: [{ role: "user", content: userPrompt }],
        });
        const text = response.content[0]?.type === "text" ? response.content[0].text : "";
        return {
          content: text,
          usage: {
            prompt_tokens: response.usage.input_tokens,
            completion_tokens: response.usage.output_tokens,
          },
        };
      });
    },

    async jsonCompletion(systemPrompt, userPrompt, options) {
      return withRetries(async () => {
        const response = await client.messages.create({
          model,
          max_tokens: options?.maxTokens ?? 2000,
          temperature: options?.temperature ?? 0.7,
          system: systemPrompt,
          messages: [{ role: "user", content: userPrompt }],
        });
        const raw = response.content[0]?.type === "text" ? response.content[0].text : "{}";
        return {
          raw,
          usage: {
            prompt_tokens: response.usage.input_tokens,
            completion_tokens: response.usage.output_tokens,
          },
        };
      });
    },

    async streamChatCompletion(messages, options) {
      // Extract system message if present
      const systemMsg = messages.find((m) => m.role === "system");
      const chatMessages = messages
        .filter((m) => m.role !== "system")
        .map((m) => ({
          role: m.role as "user" | "assistant",
          content: m.content,
        }));

      const stream = client.messages.stream({
        model,
        max_tokens: options?.maxTokens ?? 1500,
        temperature: options?.temperature ?? 0.7,
        ...(systemMsg && { system: systemMsg.content }),
        messages: chatMessages,
      });

      const usage = { prompt_tokens: 0, completion_tokens: 0 };

      return (async function* (): AsyncIterable<StreamChunk> {
        for await (const event of stream) {
          if (event.type === "message_start" && event.message.usage) {
            usage.prompt_tokens = event.message.usage.input_tokens;
          } else if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
            yield { content: event.delta.text };
          } else if (event.type === "message_delta") {
            usage.completion_tokens = event.usage.output_tokens;
            // Yield final chunk with usage
            yield { content: "", usage };
          }
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
