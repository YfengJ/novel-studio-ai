import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { getApiKeyFromHeaders } from "@/lib/ai/client";

export function json(data: unknown, init?: ResponseInit) {
  return NextResponse.json(data, init);
}

export function errorResponse(error: unknown, status = 500) {
  if (error instanceof ZodError) {
    return NextResponse.json(
      {
        error: "AI 返回的 JSON 字段不符合系统要求。系统已重试并记录本次失败；请补充更明确的提示词后再试。",
        details: error.issues.slice(0, 8).map((issue) => ({
          path: issue.path.join("."),
          message: issue.message
        }))
      },
      { status }
    );
  }
  return NextResponse.json({ error: error instanceof Error ? error.message : String(error) }, { status });
}

export async function readJson<T = Record<string, unknown>>(request: Request): Promise<T> {
  const text = await request.text();
  if (!text) return {} as T;
  return JSON.parse(text) as T;
}

export function apiKeyFromRequest(request: Request) {
  return getApiKeyFromHeaders(request.headers);
}

export function numberParam(value: string | undefined, name: string) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) throw new Error(`Invalid ${name}`);
  return parsed;
}
