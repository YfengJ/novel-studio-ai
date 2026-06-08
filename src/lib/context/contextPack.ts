import type { Db } from "@/lib/db/database";
import { parseJson } from "@/lib/db/json";
import { HybridRetrievalService } from "@/lib/retrieval/hybridRetrieval";

export type ContextPack = {
  project: Record<string, unknown>;
  storyBible: unknown;
  styleBible: unknown;
  volumeOutline: unknown;
  arcPack: unknown;
  chapterOutline: unknown;
  sceneBeats: unknown;
  lastThreeSummaries: Array<{ chapter_number: number; title: string; summary: string }>;
  previousChapterEndingExcerpt: string;
  activeCharacterStates: Array<Record<string, unknown>>;
  graphFacts: Array<Record<string, unknown>>;
  vectorChunks: Array<Record<string, unknown>>;
  keywordChunks: Array<Record<string, unknown>>;
  timelineRecentEvents: Array<Record<string, unknown>>;
  forbiddenContradictions: string[];
  factsPriority: string[];
  activeCharacterNames: string[];
};

function endingExcerpt(text: string | null | undefined, maxChars = 1800) {
  if (!text) return "";
  return text.length <= maxChars ? text : text.slice(text.length - maxChars);
}

function buildQuery(chapterOutline: unknown, sceneBeats: unknown) {
  return `${JSON.stringify(chapterOutline ?? {})}\n${JSON.stringify(sceneBeats ?? [])}`.slice(0, 4000);
}

const characterNameKeys = new Set(["pov", "pov_character", "pov_character_name", "involved_character_names", "character_focus", "character_name"]);

function splitNameList(value: string) {
  return value
    .split(/[,，、;；\n]/)
    .map((item) => item.trim())
    .filter((item) => item.length > 0 && item.length < 40);
}

function collectActiveCharacterNames(...sources: unknown[]) {
  const names = new Set<string>();
  const visit = (value: unknown, key = "") => {
    if (Array.isArray(value)) {
      for (const item of value) visit(item, key);
      return;
    }
    if (value && typeof value === "object") {
      for (const [childKey, childValue] of Object.entries(value as Record<string, unknown>)) visit(childValue, childKey);
      return;
    }
    if (typeof value === "string" && characterNameKeys.has(key)) {
      for (const name of splitNameList(value)) names.add(name);
    }
  };
  for (const source of sources) visit(source);
  return [...names];
}

function resolveCharacterIdsByNames(db: Db, projectId: number, names: string[]) {
  if (!names.length) return [];
  const nameSet = new Set(names);
  const rows = db.prepare("select id, name, aliases_json from characters where project_id = ?").all(projectId) as Array<{ id: number; name: string; aliases_json: string }>;
  return rows
    .filter((row) => {
      if (nameSet.has(row.name)) return true;
      const aliases = parseJson<string[]>(row.aliases_json, []);
      return aliases.some((alias) => nameSet.has(alias));
    })
    .map((row) => row.id);
}

export async function buildContextPack(db: Db, projectId: number, chapterId: number): Promise<ContextPack> {
  const project = db.prepare("select * from projects where id = ?").get(projectId) as Record<string, unknown> | undefined;
  const chapter = db.prepare("select * from chapters where id = ? and project_id = ?").get(chapterId, projectId) as
    | {
        id: number;
        chapter_number: number;
        volume_id: number | null;
        arc_pack_id: number | null;
        outline_json: string;
        scene_beats_json: string;
      }
    | undefined;
  if (!project || !chapter) throw new Error("Project or chapter not found");

  const storyBibleRow = db
    .prepare("select * from story_bibles where project_id = ? order by version desc, id desc limit 1")
    .get(projectId) as { content_json: string } | undefined;
  const styleBibleRow = db
    .prepare("select * from style_bibles where project_id = ? order by version desc, id desc limit 1")
    .get(projectId) as { content_json: string } | undefined;
  const volume = chapter.volume_id
    ? (db.prepare("select * from volumes where id = ? and project_id = ?").get(chapter.volume_id, projectId) as { outline_json: string } | undefined)
    : undefined;
  const arcPack = chapter.arc_pack_id
    ? (db.prepare("select * from arc_packs where id = ? and project_id = ?").get(chapter.arc_pack_id, projectId) as { outline_json: string } | undefined)
    : undefined;

  const storyBible = parseJson<Record<string, unknown>>(storyBibleRow?.content_json, {});
  const styleBible = parseJson<Record<string, unknown>>(styleBibleRow?.content_json, {});
  const chapterOutline = parseJson<Record<string, unknown>>(chapter.outline_json, {});
  const sceneBeats = parseJson<unknown[]>(chapter.scene_beats_json, []);
  const activeCharacterNames = collectActiveCharacterNames(chapterOutline, sceneBeats);
  const activeCharacterIds = resolveCharacterIdsByNames(db, projectId, activeCharacterNames);

  const lastThreeSummaries = db
    .prepare(
      `select chapter_number, title, summary
       from chapters
       where project_id = ? and status = 'accepted' and chapter_number < ? and summary is not null and summary != ''
       order by chapter_number desc
       limit 3`
    )
    .all(projectId, chapter.chapter_number) as Array<{ chapter_number: number; title: string; summary: string }>;
  lastThreeSummaries.reverse();

  const previousChapter = db
    .prepare("select final_text from chapters where project_id = ? and chapter_number = ? and status = 'accepted'")
    .get(projectId, chapter.chapter_number - 1) as { final_text: string | null } | undefined;

  const retrieval = new HybridRetrievalService(db).search({
    projectId,
    chapterId,
    query: buildQuery(chapterOutline, sceneBeats),
    activeCharacterIds,
    maxResults: 10
  });

  const forbiddenContradictions = Array.isArray(storyBible.forbidden_contradictions)
    ? (storyBible.forbidden_contradictions as string[])
    : [];

  return {
    project,
    storyBible,
    styleBible,
    volumeOutline: parseJson(volume?.outline_json, {}),
    arcPack: parseJson(arcPack?.outline_json, {}),
    chapterOutline,
    sceneBeats,
    lastThreeSummaries,
    previousChapterEndingExcerpt: endingExcerpt(previousChapter?.final_text),
    activeCharacterStates: retrieval.characterStates,
    graphFacts: retrieval.graphFacts,
    vectorChunks: retrieval.vectorChunks,
    keywordChunks: retrieval.keywordChunks,
    timelineRecentEvents: retrieval.timelineEvents,
    forbiddenContradictions,
    activeCharacterNames,
    factsPriority: [
      "用户手动设定",
      "Story Bible",
      "已确认正文",
      "已确认角色状态",
      "已确认三元组",
      "大纲",
      "草稿"
    ]
  };
}
