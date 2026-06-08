import type { Db } from "@/lib/db/database";
import { parseJson } from "@/lib/db/json";
import { cosineSimilarity } from "./cosine";

export type VectorSearchResult = {
  id: number;
  text: string;
  summary: string;
  chapter_number: number | null;
  score: number;
};

export interface VectorStore {
  search(projectId: number, queryEmbedding: number[], maxResults: number): VectorSearchResult[];
}

export class SQLiteVectorStore implements VectorStore {
  constructor(private readonly db: Db) {}

  search(projectId: number, queryEmbedding: number[], maxResults: number): VectorSearchResult[] {
    const rows = this.db
      .prepare("select id, text, summary, chapter_number, embedding_json from memory_chunks where project_id = ? and embedding_json is not null")
      .all(projectId) as Array<{ id: number; text: string; summary: string; chapter_number: number | null; embedding_json: string }>;

    return rows
      .map((row) => ({
        id: row.id,
        text: row.text,
        summary: row.summary,
        chapter_number: row.chapter_number,
        score: cosineSimilarity(queryEmbedding, parseJson<number[]>(row.embedding_json, []))
      }))
      .filter((row) => row.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, maxResults);
  }
}

