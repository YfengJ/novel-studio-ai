import type { Db } from "@/lib/db/database";

const secretKeyPattern = /api[_-]?key|openai_api_key|authorization|x-openai-api-key/i;

function redact(value: unknown): unknown {
  if (Array.isArray(value)) return value.map((item) => redact(item));
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([key, entry]) => [
        key,
        secretKeyPattern.test(key) ? "[REDACTED]" : redact(entry)
      ])
    );
  }
  if (typeof value === "string" && /(sk-[A-Za-z0-9_-]{8,}|Bearer\s+sk-[A-Za-z0-9_-]{8,})/.test(value)) {
    return value.replace(/Bearer\s+sk-[A-Za-z0-9_-]{8,}|sk-[A-Za-z0-9_-]{8,}/g, "[REDACTED]");
  }
  return value;
}

export function sanitizeForGenerationLog(value: unknown) {
  return redact(value);
}

export function logGenerationRun(
  db: Db,
  input: {
    projectId?: number | null;
    runType: string;
    model: string;
    promptSummary: string;
    input: unknown;
    output?: unknown;
    error?: string | null;
  }
) {
  db.prepare(
    `insert into generation_runs
      (project_id, run_type, model, prompt_summary, input_json, output_json, error)
     values (?, ?, ?, ?, ?, ?, ?)`
  ).run(
    input.projectId ?? null,
    input.runType,
    input.model,
    input.promptSummary,
    JSON.stringify(sanitizeForGenerationLog(input.input ?? {})),
    JSON.stringify(sanitizeForGenerationLog(input.output ?? {})),
    input.error ?? null
  );
}

