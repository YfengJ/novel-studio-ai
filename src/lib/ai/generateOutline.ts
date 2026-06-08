import type { Db } from "@/lib/db/database";
import { parseJson } from "@/lib/db/json";
import { getLatestStoryBible, getLatestStyleBible, getSettings } from "@/lib/db/repositories";
import { ArcPackSchema, ChapterOutlineSchema, SceneBeatsSchema, VolumeOutlineSchema, type ArcPack, type VolumeOutline } from "./schemas";
import { arcPackPrompt, chapterOutlinePrompt, jsonSystemPrompt, sceneBeatsPrompt, volumeOutlinePrompt } from "./prompts";
import { structuredJsonCompletion } from "./client";
import { evaluateArcPackPacing, evaluateVolumeOutlinePacing, formatPacingWarnings, type PacingEvaluation } from "./pacing";

function buildOutlineContinuityContext(db: Db, projectId: number) {
  const storyBible = getLatestStoryBible(db, projectId)?.content ?? {};
  const styleBible = getLatestStyleBible(db, projectId)?.content ?? {};
  const existingVolumes = db
    .prepare("select id, volume_number, title, outline_json, status from volumes where project_id = ? order by volume_number")
    .all(projectId)
    .map((row: any) => ({ id: row.id, volume_number: row.volume_number, title: row.title, status: row.status, outline: parseJson(row.outline_json, {}) }));
  const existingArcPacks = db
    .prepare("select id, volume_id, start_chapter_number, end_chapter_number, outline_json, status from arc_packs where project_id = ? order by start_chapter_number")
    .all(projectId)
    .map((row: any) => ({
      id: row.id,
      volume_id: row.volume_id,
      start_chapter_number: row.start_chapter_number,
      end_chapter_number: row.end_chapter_number,
      status: row.status,
      outline: parseJson(row.outline_json, {})
    }));
  const existingChapters = db
    .prepare("select id, volume_id, arc_pack_id, chapter_number, title, summary, status, outline_json from chapters where project_id = ? order by chapter_number desc limit 12")
    .all(projectId)
    .map((row: any) => ({
      id: row.id,
      volume_id: row.volume_id,
      arc_pack_id: row.arc_pack_id,
      chapter_number: row.chapter_number,
      title: row.title,
      summary: row.summary,
      status: row.status,
      outline: parseJson(row.outline_json, {})
    }))
    .reverse();
  const characterStates = db
    .prepare(
      `select c.name, c.tier, c.role, cs.chapter_number, cs.alive_status, cs.location, cs.current_goal, cs.faction, cs.relationship_to_protagonist
       from characters c
       left join character_states cs on cs.id = (
         select id from character_states
         where project_id = c.project_id and character_id = c.id
         order by chapter_number desc, id desc
         limit 1
       )
       where c.project_id = ? and c.tier in ('S','A','B')
       order by c.tier, c.id
       limit 20`
    )
    .all(projectId);
  const timelineEvents = db
    .prepare("select chapter_number, scene_number, event_type, title, summary, impact_level from timeline_events where project_id = ? order by chapter_number desc, id desc limit 20")
    .all(projectId);
  const graphFacts = db
    .prepare(
      `select subject_type, subject_id, predicate, object_type, object_id, object_value, source_chapter, evidence_text, importance
       from relation_triples
       where project_id = ? and (valid_to_chapter is null or valid_to_chapter >= 0)
       order by case importance when 'critical' then 0 when 'high' then 1 when 'medium' then 2 else 3 end, id desc
       limit 40`
    )
    .all(projectId);

  return { storyBible, styleBible, existingVolumes, existingArcPacks, existingChapters, characterStates, timelineEvents, graphFacts };
}

function requirePlanningBibles(db: Db, projectId: number) {
  const storyBible = getLatestStoryBible(db, projectId);
  if (!storyBible) throw new Error("请先在 Story Bible 页面生成并保存全书设定，再继续拆大纲。");
  const styleBible = getLatestStyleBible(db, projectId);
  if (!styleBible) throw new Error("请先在 Style Bible 页面生成并保存文风圣经，再继续拆大纲。");
  return { storyBible, styleBible };
}

function assertArcPackRange(outline: { chapters?: Array<{ chapter_number: number }> }, startChapterNumber: number, endChapterNumber: number) {
  const invalid = (outline.chapters ?? [])
    .map((chapter) => Number(chapter.chapter_number))
    .filter((chapterNumber) => chapterNumber < startChapterNumber || chapterNumber > endChapterNumber);
  if (invalid.length) {
    throw new Error(`模型返回的五章包章号 ${invalid.join(", ")} 不在 ${startChapterNumber}-${endChapterNumber} 范围内，请重试或调整大纲。`);
  }
}

function assertPacing(kind: string, evaluation: PacingEvaluation) {
  if (evaluation.passed) return;
  throw new Error(`${kind} 节奏过快：\n${formatPacingWarnings(evaluation.warnings)}\n系统没有写入数据库，请重试或手动把大纲缩小到一个局部目标。`);
}

async function structuredJsonWithPacingRetry<T>(
  db: Db,
  input: {
    projectId: number;
    runType: string;
    model: string;
    promptSummary: string;
    user: string;
    schema: any;
    apiKey?: string | null;
    validate: (value: T) => PacingEvaluation;
    label: string;
  }
) {
  const first = await structuredJsonCompletion<T>(db, {
    projectId: input.projectId,
    runType: input.runType,
    model: input.model,
    promptSummary: input.promptSummary,
    system: jsonSystemPrompt,
    user: input.user,
    schema: input.schema,
    apiKey: input.apiKey
  });
  const firstEvaluation = input.validate(first);
  if (firstEvaluation.passed) return first;

  const retry = await structuredJsonCompletion<T>(db, {
    projectId: input.projectId,
    runType: input.runType,
    model: input.model,
    promptSummary: `${input.promptSummary} Pacing Retry`,
    system: jsonSystemPrompt,
    user: `${input.user}

上一版因为节奏过快被系统拒绝，原因：
${formatPacingWarnings(firstEvaluation.warnings)}

请重新生成。必须显著放慢：只保留一个局部目标，删除远征、升职、称号、高层权斗、力量突破、核心道具转移等卷级事件。`,
    schema: input.schema,
    apiKey: input.apiKey
  });
  assertPacing(input.label, input.validate(retry));
  return retry;
}

export async function generateVolumeOutline(db: Db, projectId: number, apiKey?: string | null) {
  const settings = getSettings(db, projectId);
  const { storyBible: storyBibleVersion, styleBible: styleBibleVersion } = requirePlanningBibles(db, projectId);
  const continuityContext = buildOutlineContinuityContext(db, projectId);
  const user = volumeOutlinePrompt({
    storyBible: storyBibleVersion.content,
    styleBible: styleBibleVersion.content,
    existingVolumes: continuityContext.existingVolumes
  });
  const outline = await structuredJsonWithPacingRetry<VolumeOutline>(db, {
    projectId,
    runType: "volume_outline",
    model: String(settings.default_model),
    promptSummary: "Generate Volume Outline",
    user,
    schema: VolumeOutlineSchema,
    apiKey,
    validate: evaluateVolumeOutlinePacing,
    label: "卷大纲"
  });
  const next = db.prepare("select coalesce(max(volume_number), 0) + 1 as n from volumes where project_id = ?").get(projectId) as { n: number };
  return db
    .prepare("insert into volumes (project_id, volume_number, title, outline_json, status) values (?, ?, ?, ?, 'planned') returning *")
    .get(projectId, next.n, outline.title, JSON.stringify(outline));
}

export async function generateArcPack(
  db: Db,
  input: { projectId: number; volumeId: number; startChapterNumber: number; endChapterNumber: number; apiKey?: string | null }
) {
  const settings = getSettings(db, input.projectId);
  requirePlanningBibles(db, input.projectId);
  const volume = db.prepare("select * from volumes where id = ? and project_id = ?").get(input.volumeId, input.projectId) as { outline_json: string } | undefined;
  if (!volume) throw new Error("Volume not found");
  const continuityContext = buildOutlineContinuityContext(db, input.projectId);
  const user = arcPackPrompt({
    volumeOutline: JSON.parse(volume.outline_json),
    startChapterNumber: input.startChapterNumber,
    endChapterNumber: input.endChapterNumber,
    continuityContext
  });
  const outline = await structuredJsonWithPacingRetry<ArcPack>(db, {
    projectId: input.projectId,
    runType: "arc_pack",
    model: String(settings.default_model),
    promptSummary: "Generate Five-Chapter Arc Pack",
    user,
    schema: ArcPackSchema,
    apiKey: input.apiKey,
    validate: (value) => {
      try {
        assertArcPackRange(value, input.startChapterNumber, input.endChapterNumber);
      } catch (error) {
        return {
          passed: false,
          warnings: [{ code: "chapter_scope_overload", severity: "high", message: error instanceof Error ? error.message : String(error) }]
        };
      }
      return evaluateArcPackPacing(value);
    },
    label: "五章剧情包"
  });
  return db
    .prepare(
      "insert into arc_packs (project_id, volume_id, start_chapter_number, end_chapter_number, outline_json, status) values (?, ?, ?, ?, ?, 'planned') returning *"
    )
    .get(input.projectId, input.volumeId, input.startChapterNumber, input.endChapterNumber, JSON.stringify(outline));
}

export async function generateChapterOutline(
  db: Db,
  input: { projectId: number; arcPackId: number; chapterNumber: number; apiKey?: string | null }
) {
  const settings = getSettings(db, input.projectId);
  requirePlanningBibles(db, input.projectId);
  const arcPack = db.prepare("select * from arc_packs where id = ? and project_id = ?").get(input.arcPackId, input.projectId) as
    | { id: number; volume_id: number; outline_json: string }
    | undefined;
  if (!arcPack) throw new Error("Arc pack not found");
  const volume = db.prepare("select * from volumes where id = ? and project_id = ?").get(arcPack.volume_id, input.projectId) as { outline_json: string } | undefined;
  const continuityContext = buildOutlineContinuityContext(db, input.projectId);
  const outline = await structuredJsonCompletion(db, {
    projectId: input.projectId,
    runType: "chapter_outline",
    model: String(settings.default_model),
    promptSummary: "Generate Chapter Outline",
    system: jsonSystemPrompt,
    user: chapterOutlinePrompt({
      arcPack: JSON.parse(arcPack.outline_json),
      volumeOutline: parseJson(volume?.outline_json, {}),
      chapterNumber: input.chapterNumber,
      continuityContext
    }),
    schema: ChapterOutlineSchema,
    apiKey: input.apiKey
  });
  const title = (JSON.parse(arcPack.outline_json).chapters ?? []).find((chapter: { chapter_number: number }) => chapter.chapter_number === input.chapterNumber)?.title ?? `第 ${input.chapterNumber} 章`;
  const existing = db
    .prepare("select id from chapters where project_id = ? and chapter_number = ?")
    .get(input.projectId, input.chapterNumber) as { id: number } | undefined;
  if (existing) {
    db.prepare("update chapters set outline_json = ?, title = ?, volume_id = ?, arc_pack_id = ?, updated_at = datetime('now') where id = ?").run(
      JSON.stringify(outline),
      title,
      arcPack.volume_id,
      input.arcPackId,
      existing.id
    );
    return db.prepare("select * from chapters where id = ?").get(existing.id);
  }
  return db
    .prepare(
      "insert into chapters (project_id, volume_id, arc_pack_id, chapter_number, title, outline_json, status) values (?, ?, ?, ?, ?, ?, 'planned') returning *"
    )
    .get(input.projectId, arcPack.volume_id, input.arcPackId, input.chapterNumber, title, JSON.stringify(outline));
}

export async function generateSceneBeats(db: Db, input: { projectId: number; chapterId: number; apiKey?: string | null }) {
  const settings = getSettings(db, input.projectId);
  requirePlanningBibles(db, input.projectId);
  const chapter = db.prepare("select * from chapters where id = ? and project_id = ?").get(input.chapterId, input.projectId) as { outline_json: string; volume_id: number | null; arc_pack_id: number | null } | undefined;
  if (!chapter) throw new Error("Chapter not found");
  const volume = chapter.volume_id
    ? (db.prepare("select * from volumes where id = ? and project_id = ?").get(chapter.volume_id, input.projectId) as { outline_json: string } | undefined)
    : undefined;
  const arcPack = chapter.arc_pack_id
    ? (db.prepare("select * from arc_packs where id = ? and project_id = ?").get(chapter.arc_pack_id, input.projectId) as { outline_json: string } | undefined)
    : undefined;
  const continuityContext = buildOutlineContinuityContext(db, input.projectId);
  const beats = await structuredJsonCompletion(db, {
    projectId: input.projectId,
    runType: "scene_beats",
    model: String(settings.default_model),
    promptSummary: "Generate Scene Beats",
    system: jsonSystemPrompt,
    user: sceneBeatsPrompt({
      chapterOutline: JSON.parse(chapter.outline_json),
      volumeOutline: parseJson(volume?.outline_json, {}),
      arcPack: parseJson(arcPack?.outline_json, {}),
      continuityContext
    }),
    schema: SceneBeatsSchema,
    apiKey: input.apiKey
  });
  db.prepare("update chapters set scene_beats_json = ?, updated_at = datetime('now') where id = ?").run(JSON.stringify(beats), input.chapterId);
  return beats;
}
