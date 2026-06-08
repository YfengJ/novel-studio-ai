import type { Db } from "@/lib/db/database";

export type RelationTripleRow = {
  id: number;
  project_id: number;
  subject_type: string;
  subject_id: number | null;
  predicate: string;
  object_type: string;
  object_id: number | null;
  object_value: string | null;
  source_chapter: number | null;
  source_scene: number | null;
  evidence_text: string;
  confidence: number;
  valid_from_chapter: number | null;
  valid_to_chapter: number | null;
  importance: "low" | "medium" | "high" | "critical";
};

export function getValidRelationTriples(db: Db, projectId: number, chapterNumber: number, limit = 100): RelationTripleRow[] {
  return db
    .prepare(
      `select *
       from relation_triples
       where project_id = ?
         and (valid_from_chapter is null or valid_from_chapter <= ?)
         and (valid_to_chapter is null or valid_to_chapter >= ?)
       order by
         case importance when 'critical' then 4 when 'high' then 3 when 'medium' then 2 else 1 end desc,
         confidence desc,
         id desc
       limit ?`
    )
    .all(projectId, chapterNumber, chapterNumber, limit) as RelationTripleRow[];
}

