import type { Db } from "@/lib/db/database";
import { parseJson } from "@/lib/db/json";
import { getValidRelationTriples, type RelationTripleRow } from "@/lib/graph/relationTriples";
import { hashTextEmbedding } from "./hashEmbedding";
import { SQLiteVectorStore, type VectorSearchResult } from "./vectorStore";

export type HybridRetrievalInput = {
  projectId: number;
  chapterId: number;
  query: string;
  activeCharacterIds?: number[];
  maxResults?: number;
  queryEmbedding?: number[];
};

export type HybridRetrievalResult = {
  graphFacts: RelationTripleRow[];
  vectorChunks: VectorSearchResult[];
  keywordChunks: Array<{ id: number; text: string; summary: string; chapter_number: number | null; score: number }>;
  characterStates: Array<Record<string, unknown>>;
  timelineEvents: Array<Record<string, unknown>>;
};

function tokenize(query: string) {
  return Array.from(new Set(query.toLowerCase().match(/[\p{L}\p{N}_]+/gu) ?? [])).filter((token) => token.length > 1);
}

function keywordScore(text: string, tokens: string[]) {
  const lower = text.toLowerCase();
  return tokens.reduce((score, token) => score + (lower.includes(token) ? 1 : 0), 0);
}

export class HybridRetrievalService {
  constructor(private readonly db: Db) {}

  search(input: HybridRetrievalInput): HybridRetrievalResult {
    const maxResults = input.maxResults ?? 8;
    const chapter = this.db
      .prepare("select chapter_number from chapters where id = ? and project_id = ?")
      .get(input.chapterId, input.projectId) as { chapter_number: number } | undefined;
    const chapterNumber = chapter?.chapter_number ?? 1;
    const tokens = tokenize(input.query);

    const chunks = this.db
      .prepare("select id, text, summary, chapter_number from memory_chunks where project_id = ? order by id desc limit 500")
      .all(input.projectId) as Array<{ id: number; text: string; summary: string; chapter_number: number | null }>;
    const keywordChunks = chunks
      .map((chunk) => ({ ...chunk, score: keywordScore(`${chunk.text}\n${chunk.summary}`, tokens) }))
      .filter((chunk) => chunk.score > 0)
      .sort((a, b) => b.score - a.score || (b.chapter_number ?? 0) - (a.chapter_number ?? 0))
      .slice(0, maxResults);

    const vectorChunks = new SQLiteVectorStore(this.db).search(input.projectId, input.queryEmbedding ?? hashTextEmbedding(input.query), maxResults);
    const graphFacts = getValidRelationTriples(this.db, input.projectId, chapterNumber, maxResults).filter((triple) => {
      if (tokens.length === 0) return true;
      return keywordScore(`${triple.subject_type} ${triple.predicate} ${triple.object_type} ${triple.object_value ?? ""} ${triple.evidence_text}`, tokens) > 0;
    });

    const characterStates = this.getLatestCharacterStates(input.projectId, chapterNumber, input.activeCharacterIds ?? [], maxResults);
    const timelineEvents = this.db
      .prepare("select * from timeline_events where project_id = ? and chapter_number <= ? order by chapter_number desc, id desc limit ?")
      .all(input.projectId, chapterNumber, maxResults) as Array<Record<string, unknown>>;

    return { graphFacts, vectorChunks, keywordChunks, characterStates, timelineEvents };
  }

  private getLatestCharacterStates(projectId: number, chapterNumber: number, characterIds: number[], limit: number) {
    if (characterIds.length > 0) {
      return characterIds
        .map((characterId) =>
          this.db
            .prepare(
              `select cs.*, c.name, c.tier, c.personality_json
               from character_states cs
               join characters c on c.id = cs.character_id
               where cs.project_id = ? and cs.character_id = ? and cs.chapter_number <= ?
               order by cs.chapter_number desc, cs.id desc
               limit 1`
            )
            .get(projectId, characterId, chapterNumber) as Record<string, unknown> | undefined
        )
        .filter(Boolean)
        .map((state) => ({
          ...state,
          knowledge: parseJson(String(state?.knowledge_json ?? "[]"), []),
          secrets: parseJson(String(state?.secrets_json ?? "[]"), []),
          possessions: parseJson(String(state?.possessions_json ?? "[]"), [])
        }));
    }

    return this.db
      .prepare(
        `select cs.*, c.name, c.tier, c.personality_json
         from character_states cs
         join characters c on c.id = cs.character_id
         where cs.project_id = ?
           and cs.chapter_number = (
             select max(cs2.chapter_number)
             from character_states cs2
             where cs2.project_id = cs.project_id
               and cs2.character_id = cs.character_id
               and cs2.chapter_number <= ?
           )
         order by case c.tier when 'S' then 5 when 'A' then 4 when 'B' then 3 when 'C' then 2 else 1 end desc, cs.id desc
         limit ?`
      )
      .all(projectId, chapterNumber, limit) as Array<Record<string, unknown>>;
  }
}

