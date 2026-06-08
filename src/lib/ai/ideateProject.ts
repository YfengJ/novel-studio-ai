import type { Db } from "@/lib/db/database";
import { getSettings } from "@/lib/db/repositories";
import { jsonSystemPrompt, projectIdeaPrompt } from "./prompts";
import { ProjectIdeaSchema } from "./schemas";
import { structuredJsonCompletion } from "./client";

export async function ideateProject(
  db: Db,
  input: {
    projectId?: number;
    brief: string;
    preferredGenre?: string;
    targetWordCount?: number;
    apiKey?: string | null;
  }
) {
  const model = input.projectId != null ? String(getSettings(db, input.projectId).default_model) : process.env.DEFAULT_MODEL || "deepseek-v4-pro";
  return structuredJsonCompletion(db, {
    projectId: input.projectId ?? null,
    runType: "project_idea",
    model,
    promptSummary: "Ideate project seed before creation",
    system: jsonSystemPrompt,
    user: projectIdeaPrompt(input),
    schema: ProjectIdeaSchema,
    apiKey: input.apiKey
  });
}

