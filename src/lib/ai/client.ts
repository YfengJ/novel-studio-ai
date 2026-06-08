import OpenAI from "openai";
import { z } from "zod";
import type { Db } from "@/lib/db/database";
import { logGenerationRun } from "./runs";

export function getApiKey(explicit?: string | null) {
  return explicit || process.env.OPENAI_API_KEY || "";
}

export function getApiKeyFromHeaders(headers: Headers) {
  return getApiKey(headers.get("x-openai-api-key"));
}

export function createOpenAIClient(apiKey?: string | null) {
  const resolved = getApiKey(apiKey);
  if (!resolved) throw new Error("OpenAI API key is required. Set OPENAI_API_KEY or provide a session key in settings.");
  return new OpenAI({
    apiKey: resolved,
    baseURL: process.env.OPENAI_BASE_URL || undefined,
    timeout: Number(process.env.OPENAI_TIMEOUT_MS || 180000)
  });
}

function extractJson(text: string) {
  const trimmed = text.trim();
  if (trimmed.startsWith("{") || trimmed.startsWith("[")) return trimmed;
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i)?.[1];
  if (fenced) return fenced.trim();
  const firstObject = trimmed.indexOf("{");
  const lastObject = trimmed.lastIndexOf("}");
  if (firstObject >= 0 && lastObject > firstObject) return trimmed.slice(firstObject, lastObject + 1);
  const firstArray = trimmed.indexOf("[");
  const lastArray = trimmed.lastIndexOf("]");
  if (firstArray >= 0 && lastArray > firstArray) return trimmed.slice(firstArray, lastArray + 1);
  return trimmed;
}

export async function structuredJsonCompletion<T>(
  db: Db,
  input: {
    projectId: number | null;
    runType: string;
    model: string;
    promptSummary: string;
    system: string;
    user: string;
    schema: z.ZodType<T>;
    apiKey?: string | null;
  }
): Promise<T> {
  const client = createOpenAIClient(input.apiKey);
  let lastError: unknown;
  for (let attempt = 1; attempt <= 2; attempt += 1) {
    try {
      const response = await client.chat.completions.create({
        model: input.model,
        temperature: 0.4,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: input.system },
          { role: "user", content: input.user }
        ]
      });
      const content = response.choices[0]?.message.content ?? "";
      const parsedJson = JSON.parse(extractJson(content));
      const parsed = input.schema.parse(parsedJson);
      logGenerationRun(db, {
        projectId: input.projectId,
        runType: input.runType,
        model: input.model,
        promptSummary: input.promptSummary,
        input: { system: input.system, user: input.user, attempt },
        output: parsed
      });
      return parsed;
    } catch (error) {
      lastError = error;
    }
  }

  logGenerationRun(db, {
    projectId: input.projectId,
    runType: input.runType,
    model: input.model,
    promptSummary: input.promptSummary,
    input: { system: input.system, user: input.user },
    output: {},
    error: lastError instanceof Error ? lastError.message : String(lastError)
  });
  throw lastError instanceof Error ? lastError : new Error(String(lastError));
}

export async function textCompletion(
  db: Db,
  input: {
    projectId: number | null;
    runType: string;
    model: string;
    promptSummary: string;
    system: string;
    user: string;
    apiKey?: string | null;
    temperature?: number;
  }
) {
  const client = createOpenAIClient(input.apiKey);
  try {
    const response = await client.chat.completions.create({
      model: input.model,
      temperature: input.temperature ?? 0.7,
      messages: [
        { role: "system", content: input.system },
        { role: "user", content: input.user }
      ]
    });
    const content = response.choices[0]?.message.content?.trim() ?? "";
    logGenerationRun(db, {
      projectId: input.projectId,
      runType: input.runType,
      model: input.model,
      promptSummary: input.promptSummary,
      input: { system: input.system, user: input.user },
      output: { text: content }
    });
    return content;
  } catch (error) {
    logGenerationRun(db, {
      projectId: input.projectId,
      runType: input.runType,
      model: input.model,
      promptSummary: input.promptSummary,
      input: { system: input.system, user: input.user },
      error: error instanceof Error ? error.message : String(error)
    });
    throw error;
  }
}
