import type { Db } from "./database";
import { parseJson } from "./json";
import { getProjectWorkflow } from "@/lib/workflow/projectWorkflow";

export type ProjectRow = {
  id: number;
  title: string;
  genre: string;
  premise: string;
  target_word_count: number;
  pov: string;
  tone: string;
  created_at: string;
  updated_at: string;
};

export function listProjects(db: Db) {
  return db.prepare("select * from projects order by updated_at desc, id desc").all() as ProjectRow[];
}

export function getProject(db: Db, projectId: number) {
  return db.prepare("select * from projects where id = ?").get(projectId) as ProjectRow | undefined;
}

export function createProject(
  db: Db,
  input: {
    title: string;
    genre?: string;
    premise?: string;
    target_word_count?: number;
    pov?: string;
    tone?: string;
  }
) {
  const created = db
    .prepare(
      `insert into projects (title, genre, premise, target_word_count, pov, tone)
       values (?, ?, ?, ?, ?, ?)
       returning *`
    )
    .get(
      input.title,
      input.genre ?? "",
      input.premise ?? "",
      input.target_word_count ?? 0,
      input.pov ?? "第三人称有限视角",
      input.tone ?? ""
    ) as ProjectRow;
  db.prepare("insert into project_settings (project_id, default_model, embedding_model) values (?, ?, ?)").run(
    created.id,
    process.env.DEFAULT_MODEL || "gpt-4o-mini",
    process.env.EMBEDDING_MODEL || "text-embedding-3-small"
  );
  return created;
}

export function updateProject(db: Db, projectId: number, input: Partial<ProjectRow>) {
  const existing = getProject(db, projectId);
  if (!existing) throw new Error("Project not found");
  db.prepare(
    `update projects
     set title = ?, genre = ?, premise = ?, target_word_count = ?, pov = ?, tone = ?, updated_at = datetime('now')
     where id = ?`
  ).run(
    input.title ?? existing.title,
    input.genre ?? existing.genre,
    input.premise ?? existing.premise,
    input.target_word_count ?? existing.target_word_count,
    input.pov ?? existing.pov,
    input.tone ?? existing.tone,
    projectId
  );
  return getProject(db, projectId);
}

export function deleteProject(db: Db, projectId: number) {
  db.prepare("delete from projects where id = ?").run(projectId);
}

export function getSettings(db: Db, projectId: number) {
  const existing = db.prepare("select * from project_settings where project_id = ?").get(projectId);
  if (existing) return existing as Record<string, unknown>;
  db.prepare("insert into project_settings (project_id, default_model, embedding_model) values (?, ?, ?)").run(
    projectId,
    process.env.DEFAULT_MODEL || "gpt-4o-mini",
    process.env.EMBEDDING_MODEL || "text-embedding-3-small"
  );
  return db.prepare("select * from project_settings where project_id = ?").get(projectId) as Record<string, unknown>;
}

export function updateSettings(db: Db, projectId: number, input: Record<string, unknown>) {
  const current = getSettings(db, projectId);
  db.prepare(
    `update project_settings
     set default_model = ?,
         embedding_model = ?,
         chapter_target_words = ?,
         context_token_budget = ?,
         style_strength = ?,
         continuity_strictness = ?
     where project_id = ?`
  ).run(
    String(input.default_model ?? current.default_model),
    String(input.embedding_model ?? current.embedding_model),
    Number(input.chapter_target_words ?? current.chapter_target_words),
    Number(input.context_token_budget ?? current.context_token_budget),
    Number(input.style_strength ?? current.style_strength),
    Number(input.continuity_strictness ?? current.continuity_strictness),
    projectId
  );
  return getSettings(db, projectId);
}

export function getLatestStoryBible(db: Db, projectId: number) {
  const row = db
    .prepare("select * from story_bibles where project_id = ? order by version desc, id desc limit 1")
    .get(projectId) as { id: number; content_json: string; version: number; created_at: string } | undefined;
  return row ? { ...row, content: parseJson(row.content_json, {}) } : null;
}

export function getLatestStyleBible(db: Db, projectId: number) {
  const row = db
    .prepare("select * from style_bibles where project_id = ? order by version desc, id desc limit 1")
    .get(projectId) as { id: number; content_json: string; style_fingerprint: string; version: number; created_at: string } | undefined;
  return row ? { ...row, content: parseJson(row.content_json, {}) } : null;
}

export function saveStoryBibleVersion(db: Db, projectId: number, content: unknown) {
  const versionRow = db.prepare("select coalesce(max(version), 0) + 1 as version from story_bibles where project_id = ?").get(projectId) as { version: number };
  return db
    .prepare("insert into story_bibles (project_id, content_json, version) values (?, ?, ?) returning *")
    .get(projectId, JSON.stringify(content), versionRow.version);
}

export function saveStyleBibleVersion(db: Db, projectId: number, content: Record<string, unknown>) {
  const versionRow = db.prepare("select coalesce(max(version), 0) + 1 as version from style_bibles where project_id = ?").get(projectId) as { version: number };
  return db
    .prepare("insert into style_bibles (project_id, content_json, style_fingerprint, version) values (?, ?, ?, ?) returning *")
    .get(projectId, JSON.stringify(content), String(content.style_fingerprint ?? ""), versionRow.version);
}

export function getDashboard(db: Db, projectId: number) {
  const project = getProject(db, projectId);
  if (!project) throw new Error("Project not found");
  const currentChapter = db.prepare("select * from chapters where project_id = ? order by chapter_number desc limit 1").get(projectId);
  const currentVolume = db.prepare("select * from volumes where project_id = ? order by volume_number desc limit 1").get(projectId);
  const completed = db.prepare("select coalesce(sum(word_count), 0) as words from chapters where project_id = ? and status = 'accepted'").get(projectId) as { words: number };
  const mainCharacters = db.prepare("select * from characters where project_id = ? and tier in ('S','A','B') order by tier, id limit 12").all(projectId);
  const recentChapters = db
    .prepare("select id, chapter_number, title, summary, status, word_count from chapters where project_id = ? order by chapter_number desc limit 3")
    .all(projectId);
  const issues = db
    .prepare(
      `select cr.*, c.chapter_number, c.title
       from continuity_reports cr
       join chapters c on c.id = cr.chapter_id
       where cr.project_id = ? and cr.pass = 0
       order by cr.created_at desc
       limit 10`
    )
    .all(projectId);
  const readiness = {
    storyBible: Boolean(getLatestStoryBible(db, projectId)),
    styleBible: Boolean(getLatestStyleBible(db, projectId)),
    volumes: Number((db.prepare("select count(*) as count from volumes where project_id = ?").get(projectId) as { count: number }).count),
    arcPacks: Number((db.prepare("select count(*) as count from arc_packs where project_id = ?").get(projectId) as { count: number }).count),
    chapters: Number((db.prepare("select count(*) as count from chapters where project_id = ?").get(projectId) as { count: number }).count),
    chaptersWithSceneBeats: Number(
      (db.prepare("select count(*) as count from chapters where project_id = ? and scene_beats_json is not null and scene_beats_json != '[]'").get(projectId) as { count: number }).count
    ),
    acceptedChapters: Number((db.prepare("select count(*) as count from chapters where project_id = ? and status = 'accepted'").get(projectId) as { count: number }).count)
  };
  return { project, currentChapter, currentVolume, completedWords: completed.words, mainCharacters, recentChapters, issues, readiness, workflow: getProjectWorkflow(db, projectId) };
}
