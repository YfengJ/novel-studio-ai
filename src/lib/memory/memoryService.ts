import type { Db } from "@/lib/db/database";
import { ensureCharacterByName, promoteCharacterIfNeeded } from "@/lib/characters/characterService";
import { parseJson } from "@/lib/db/json";
import { countWords } from "@/lib/utils/text";
import { createEmbedding } from "@/lib/ai/embeddings";
import { extractChapterMemory } from "@/lib/ai/extractMemory";
import { MemoryExtractionSchema, type MemoryExtraction } from "@/lib/ai/schemas";

const highImpactEventTypes = [/death/i, /dead/i, /复活/, /死亡/, /背叛/, /betray/i, /突破/, /breakthrough/i, /core.*item/i, /核心道具/, /转移/];

export function getChapterAcceptanceGate(db: Db, chapterId: number) {
  const chapter = db.prepare("select status from chapters where id = ?").get(chapterId) as { status: string } | undefined;
  if (!chapter) return { canAccept: false, reason: "章节不存在。" };
  const report = db.prepare("select pass, issues_json from continuity_reports where chapter_id = ? order by created_at desc, id desc limit 1").get(chapterId) as
    | { pass: number; issues_json: string }
    | undefined;
  if (!report) {
    return { canAccept: false, reason: "接受章节前必须先运行一次一致性检查。" };
  }
  if (chapter.status !== "checked") {
    return { canAccept: false, reason: "正文在最近一次检查后被修改或润色过，请重新运行一致性检查。" };
  }
  const issues = parseJson<Array<{ severity: string }>>(report.issues_json, []);
  const blocking = issues.some((issue) => issue.severity === "high" || issue.severity === "critical");
  if (blocking) {
    return { canAccept: false, reason: "最新一致性报告仍有 high 或 critical 问题，不能接受章节入库。请先修正文稿并重新检查。" };
  }
  if (!report.pass) {
    return { canAccept: false, reason: "最新一致性报告未通过，请先修正文稿并重新检查。" };
  }
  return { canAccept: true };
}

function normalizeImpact(type: string, current: "low" | "medium" | "high" | "critical") {
  if (current === "critical") return current;
  return highImpactEventTypes.some((pattern) => pattern.test(type)) ? "high" : current;
}

function normalizeExtraction(value: unknown): MemoryExtraction {
  const parsed = MemoryExtractionSchema.parse(value);
  return {
    chapter_summary: parsed.chapter_summary,
    scene_summaries: parsed.scene_summaries ?? [],
    new_characters: parsed.new_characters ?? [],
    character_state_updates: parsed.character_state_updates ?? [],
    new_entities: parsed.new_entities ?? [],
    relation_triples: parsed.relation_triples ?? [],
    timeline_events: parsed.timeline_events ?? [],
    foreshadowing_added: parsed.foreshadowing_added ?? [],
    foreshadowing_resolved: parsed.foreshadowing_resolved ?? [],
    new_rules_or_lore: parsed.new_rules_or_lore ?? [],
    style_samples: parsed.style_samples ?? []
  } as MemoryExtraction;
}

function resolveEntityId(db: Db, projectId: number, name: string) {
  return (db.prepare("select id from entities where project_id = ? and name = ?").get(projectId, name) as { id: number } | undefined)?.id ?? null;
}

function resolveCharacterId(db: Db, projectId: number, name: string) {
  return (db.prepare("select id from characters where project_id = ? and name = ?").get(projectId, name) as { id: number } | undefined)?.id ?? null;
}

async function insertMemoryChunk(
  db: Db,
  input: {
    projectId: number;
    sourceType: "chapter" | "scene" | "bible" | "style" | "note";
    sourceId: number;
    chapterNumber: number;
    text: string;
    summary: string;
    tags: string[];
    apiKey?: string | null;
  }
) {
  const embedding = await createEmbedding(db, input.projectId, `${input.summary}\n${input.text}`, input.apiKey);
  db.prepare(
    `insert into memory_chunks
      (project_id, source_type, source_id, chapter_number, text, summary, tags_json, embedding_json)
     values (?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    input.projectId,
    input.sourceType,
    input.sourceId,
    input.chapterNumber,
    input.text,
    input.summary,
    JSON.stringify(input.tags),
    JSON.stringify(embedding)
  );
}

export async function persistMemoryExtraction(
  db: Db,
  input: {
    projectId: number;
    chapterId: number;
    finalText: string;
    extraction: MemoryExtraction;
    apiKey?: string | null;
  }
) {
  const chapter = db.prepare("select * from chapters where id = ? and project_id = ?").get(input.chapterId, input.projectId) as
    | { chapter_number: number }
    | undefined;
  if (!chapter) throw new Error("Chapter not found");

  db.prepare("delete from scenes where chapter_id = ?").run(input.chapterId);

  const characterMentions = new Map<string, { id: number; count: number; plotRelevant: boolean }>();

  for (const item of input.extraction.new_characters) {
    const id = ensureCharacterByName(db, {
      projectId: input.projectId,
      name: item.name,
      tier: item.tier,
      chapterNumber: chapter.chapter_number,
      description: item.description,
      appearance: item.appearance,
      role: item.role,
      tags: item.tags
    });
    characterMentions.set(item.name, { id, count: 1, plotRelevant: item.plot_relevant });
  }

  for (const scene of input.extraction.scene_summaries) {
    const involvedIds = scene.involved_character_names.map((name) => {
      const id = ensureCharacterByName(db, { projectId: input.projectId, name, chapterNumber: chapter.chapter_number });
      const mention = characterMentions.get(name);
      characterMentions.set(name, { id, count: (mention?.count ?? 0) + 1, plotRelevant: mention?.plotRelevant ?? false });
      return id;
    });
    const inserted = db
      .prepare(
        `insert into scenes
          (project_id, chapter_id, scene_number, summary, location, involved_character_ids_json, emotional_turn, plot_function)
         values (?, ?, ?, ?, ?, ?, ?, ?)
         returning id`
      )
      .get(
        input.projectId,
        input.chapterId,
        scene.scene_number,
        scene.summary,
        scene.location,
        JSON.stringify(involvedIds),
        scene.emotional_turn,
        scene.plot_function
      ) as { id: number };
    await insertMemoryChunk(db, {
      projectId: input.projectId,
      sourceType: "scene",
      sourceId: inserted.id,
      chapterNumber: chapter.chapter_number,
      text: scene.summary,
      summary: scene.summary,
      tags: ["scene", scene.location].filter(Boolean),
      apiKey: input.apiKey
    });
  }

  for (const [name, mention] of characterMentions) {
    promoteCharacterIfNeeded(db, {
      projectId: input.projectId,
      characterId: mention.id,
      mentionCount: mention.count,
      plotRelevant: mention.plotRelevant,
      chapterNumber: chapter.chapter_number
    });
    const tier = (db.prepare("select tier from characters where id = ?").get(mention.id) as { tier: string }).tier;
    if (["S", "A", "B"].includes(tier)) {
      const hasState = db.prepare("select id from character_states where character_id = ? order by id desc limit 1").get(mention.id);
      if (!hasState) {
        db.prepare(
          "insert into character_states (project_id, character_id, chapter_number, alive_status, notes, source_chapter) values (?, ?, ?, 'unknown', ?, ?)"
        ).run(input.projectId, mention.id, chapter.chapter_number, `自动为重要角色 ${name} 创建初始状态`, chapter.chapter_number);
      }
    }
  }

  for (const state of input.extraction.character_state_updates) {
    const characterId = ensureCharacterByName(db, {
      projectId: input.projectId,
      name: state.character_name,
      chapterNumber: chapter.chapter_number
    });
    db.prepare(
      `insert into character_states
        (project_id, character_id, chapter_number, alive_status, location, physical_state, emotional_state, current_goal, faction,
         relationship_to_protagonist, knowledge_json, secrets_json, possessions_json, injuries_json, notes, source_chapter)
       values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      input.projectId,
      characterId,
      chapter.chapter_number,
      state.alive_status,
      state.location,
      state.physical_state,
      state.emotional_state,
      state.current_goal,
      state.faction,
      state.relationship_to_protagonist,
      JSON.stringify(state.knowledge),
      JSON.stringify(state.secrets),
      JSON.stringify(state.possessions),
      JSON.stringify(state.injuries),
      state.notes,
      state.source_chapter
    );
  }

  for (const entity of input.extraction.new_entities) {
    db.prepare(
      `insert into entities (project_id, type, name, aliases_json, description, first_seen_chapter, last_seen_chapter)
       values (?, ?, ?, ?, ?, ?, ?)
       on conflict(project_id, type, name) do update set description = excluded.description, last_seen_chapter = excluded.last_seen_chapter`
    ).run(input.projectId, entity.type, entity.name, JSON.stringify(entity.aliases), entity.description, chapter.chapter_number, chapter.chapter_number);
  }

  for (const triple of input.extraction.relation_triples) {
    const subjectId = triple.subject_id ?? (triple.subject_name ? resolveCharacterId(db, input.projectId, triple.subject_name) ?? resolveEntityId(db, input.projectId, triple.subject_name) : null);
    const objectId = triple.object_id ?? (triple.object_name ? resolveCharacterId(db, input.projectId, triple.object_name) ?? resolveEntityId(db, input.projectId, triple.object_name) : null);
    db.prepare(
      `insert into relation_triples
        (project_id, subject_type, subject_id, predicate, object_type, object_id, object_value, source_chapter, source_scene,
         evidence_text, confidence, valid_from_chapter, valid_to_chapter, importance)
       values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      input.projectId,
      triple.subject_type,
      subjectId,
      triple.predicate,
      triple.object_type,
      objectId,
      triple.object_value ?? triple.object_name ?? "",
      triple.source_chapter,
      triple.source_scene ?? null,
      triple.evidence_text,
      triple.confidence,
      triple.valid_from_chapter ?? triple.source_chapter,
      triple.valid_to_chapter ?? null,
      triple.importance
    );
  }

  for (const event of input.extraction.timeline_events) {
    const characterIds = event.involved_character_names.map((name) => resolveCharacterId(db, input.projectId, name)).filter(Boolean);
    const entityIds = event.involved_entity_names.map((name) => resolveEntityId(db, input.projectId, name)).filter(Boolean);
    db.prepare(
      `insert into timeline_events
        (project_id, chapter_number, scene_number, event_type, title, summary, involved_character_ids_json, involved_entity_ids_json, impact_level, consequences_json)
       values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      input.projectId,
      event.chapter_number,
      event.scene_number ?? null,
      event.event_type,
      event.title,
      event.summary,
      JSON.stringify(characterIds),
      JSON.stringify(entityIds),
      normalizeImpact(event.event_type, event.impact_level),
      JSON.stringify(event.consequences)
    );
  }

  await insertMemoryChunk(db, {
    projectId: input.projectId,
    sourceType: "chapter",
    sourceId: input.chapterId,
    chapterNumber: chapter.chapter_number,
    text: input.finalText,
    summary: input.extraction.chapter_summary,
    tags: ["chapter", "accepted"],
    apiKey: input.apiKey
  });

  for (const sample of input.extraction.style_samples.slice(0, 5)) {
    await insertMemoryChunk(db, {
      projectId: input.projectId,
      sourceType: "style",
      sourceId: input.chapterId,
      chapterNumber: chapter.chapter_number,
      text: sample,
      summary: "已接受章节文风样例",
      tags: ["style_sample"],
      apiKey: input.apiKey
    });
  }
}

export async function acceptChapter(db: Db, input: { projectId: number; chapterId: number; finalText?: string; apiKey?: string | null }) {
  const gate = getChapterAcceptanceGate(db, input.chapterId);
  if (!gate.canAccept) {
    throw new Error(gate.reason);
  }

  const chapter = db.prepare("select * from chapters where id = ? and project_id = ?").get(input.chapterId, input.projectId) as
    | { chapter_number: number; draft_text: string | null; final_text: string | null }
    | undefined;
  if (!chapter) throw new Error("章节不存在。");

  const finalText = input.finalText ?? chapter.final_text ?? chapter.draft_text ?? "";
  if (!finalText.trim()) throw new Error("正文为空，不能接受章节入库。");

  const extraction = normalizeExtraction(await extractChapterMemory(db, {
    projectId: input.projectId,
    chapterNumber: chapter.chapter_number,
    finalText,
    apiKey: input.apiKey
  }));

  db.prepare("update chapters set final_text = ?, summary = ?, status = 'accepted', word_count = ?, updated_at = datetime('now') where id = ?").run(
    finalText,
    extraction.chapter_summary,
    countWords(finalText),
    input.chapterId
  );

  await persistMemoryExtraction(db, {
    projectId: input.projectId,
    chapterId: input.chapterId,
    finalText,
    extraction,
    apiKey: input.apiKey
  });

  return extraction;
}
