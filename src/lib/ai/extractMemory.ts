import type { Db } from "@/lib/db/database";
import { getSettings } from "@/lib/db/repositories";
import { memoryExtractorPrompt, jsonSystemPrompt } from "./prompts";
import { MemoryExtractionSchema } from "./schemas";
import { structuredJsonCompletion } from "./client";

export async function extractChapterMemory(
  db: Db,
  input: { projectId: number; chapterNumber: number; finalText: string; apiKey?: string | null }
) {
  const settings = getSettings(db, input.projectId);
  return structuredJsonCompletion(db, {
    projectId: input.projectId,
    runType: "memory_extraction",
    model: String(settings.default_model),
    promptSummary: "Extract Accepted Chapter Memory",
    system: jsonSystemPrompt,
    user: memoryExtractorPrompt({ chapterNumber: input.chapterNumber, finalText: input.finalText }),
    schema: MemoryExtractionSchema,
    apiKey: input.apiKey
  });
}

