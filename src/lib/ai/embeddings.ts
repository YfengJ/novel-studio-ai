import type { Db } from "@/lib/db/database";
import { getSettings } from "@/lib/db/repositories";
import { hashTextEmbedding } from "@/lib/retrieval/hashEmbedding";
import { createOpenAIClient } from "./client";
import { logGenerationRun } from "./runs";

export async function createEmbedding(db: Db, projectId: number, text: string, apiKey?: string | null) {
  const settings = getSettings(db, projectId);
  const model = String(settings.embedding_model);
  if (["local-hash", "none", "disabled", "off"].includes(model.toLowerCase())) return hashTextEmbedding(text);
  if (!apiKey && !process.env.OPENAI_API_KEY) return hashTextEmbedding(text);
  try {
    const client = createOpenAIClient(apiKey);
    const response = await client.embeddings.create({ model, input: text.slice(0, 7000) });
    const embedding = response.data[0]?.embedding ?? hashTextEmbedding(text);
    logGenerationRun(db, {
      projectId,
      runType: "embedding",
      model,
      promptSummary: "Create memory embedding",
      input: { text: text.slice(0, 500) },
      output: { dimensions: embedding.length }
    });
    return embedding;
  } catch (error) {
    logGenerationRun(db, {
      projectId,
      runType: "embedding",
      model,
      promptSummary: "Create memory embedding",
      input: { text: text.slice(0, 500) },
      error: error instanceof Error ? error.message : String(error)
    });
    return hashTextEmbedding(text);
  }
}
