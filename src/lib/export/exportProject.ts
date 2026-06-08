import type { Db } from "@/lib/db/database";
import { parseJson } from "@/lib/db/json";

const tables = [
  "projects",
  "project_settings",
  "story_bibles",
  "style_bibles",
  "volumes",
  "arc_packs",
  "chapters",
  "scenes",
  "characters",
  "character_states",
  "entities",
  "relation_triples",
  "timeline_events",
  "memory_chunks",
  "continuity_reports",
  "generation_runs"
];

export function exportProjectBackup(db: Db, projectId: number) {
  return Object.fromEntries(tables.map((table) => [table, db.prepare(`select * from ${table} where ${table === "projects" ? "id" : "project_id"} = ?`).all(projectId)]));
}

export function exportStoryBibleJson(db: Db, projectId: number) {
  const row = db.prepare("select content_json from story_bibles where project_id = ? order by version desc, id desc limit 1").get(projectId) as
    | { content_json: string }
    | undefined;
  return parseJson(row?.content_json, {});
}

export function exportCharacterBibleJson(db: Db, projectId: number) {
  const characters = db.prepare("select * from characters where project_id = ? order by tier, name").all(projectId) as Array<Record<string, unknown>>;
  return characters.map((character) => ({
    ...character,
    latest_state: db
      .prepare("select * from character_states where project_id = ? and character_id = ? order by chapter_number desc, id desc limit 1")
      .get(projectId, character.id as number)
  }));
}

export function exportGraphTriplesJson(db: Db, projectId: number) {
  return db.prepare("select * from relation_triples where project_id = ? order by source_chapter, id").all(projectId);
}

export function exportChapterMarkdown(db: Db, projectId: number, chapterId: number) {
  const chapter = db.prepare("select * from chapters where id = ? and project_id = ?").get(chapterId, projectId) as
    | { chapter_number: number; title: string; final_text: string | null; draft_text: string | null }
    | undefined;
  if (!chapter) throw new Error("Chapter not found");
  return `# 第 ${chapter.chapter_number} 章 ${chapter.title}\n\n${chapter.final_text ?? chapter.draft_text ?? ""}\n`;
}

export function exportBookMarkdown(db: Db, projectId: number) {
  const project = db.prepare("select title from projects where id = ?").get(projectId) as { title: string } | undefined;
  const chapters = db
    .prepare("select chapter_number, title, final_text from chapters where project_id = ? and status = 'accepted' order by chapter_number")
    .all(projectId) as Array<{ chapter_number: number; title: string; final_text: string | null }>;
  return [`# ${project?.title ?? "Untitled"}`, ...chapters.map((chapter) => `## 第 ${chapter.chapter_number} 章 ${chapter.title}\n\n${chapter.final_text ?? ""}`)].join("\n\n");
}

