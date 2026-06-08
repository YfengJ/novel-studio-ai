import { z } from "zod";

export const ImportanceSchema = z.enum(["low", "medium", "high", "critical"]);
export const ImpactLevelSchema = z.enum(["low", "medium", "high", "critical"]);
export const CharacterTierSchema = z.enum(["S", "A", "B", "C", "D"]);
export const AliveStatusSchema = z.enum(["alive", "dead", "unknown", "missing", "undead", "sealed"]);

function looseText(value: unknown) {
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (value && typeof value === "object") return JSON.stringify(value);
  return "";
}

const looseStringArraySchema = z.preprocess((value) => {
  if (Array.isArray(value)) {
    return value
      .flatMap((item) => {
        if (typeof item === "string") return item;
        if (item && typeof item === "object") return Object.values(item).map((entry) => looseText(entry));
        return looseText(item);
      })
      .map((item) => item.trim())
      .filter(Boolean);
  }
  if (typeof value === "string") {
    return value
      .split(/[,，、\n；;]/)
      .map((item) => item.trim())
      .filter(Boolean);
  }
  if (value && typeof value === "object") {
    return Object.values(value)
      .map((entry) => looseText(entry).trim())
      .filter(Boolean);
  }
  return [];
}, z.array(z.string()).default([]));

const looseRecordSchema = z.preprocess((value) => {
  if (value && typeof value === "object" && !Array.isArray(value)) return value;
  const text = looseText(value).trim();
  return text ? { name: text, description: text } : {};
}, z.record(z.unknown()).default({}));

const looseRecordArraySchema = z.preprocess((value) => {
  const toRecord = (item: unknown, key?: string) => {
    if (item && typeof item === "object" && !Array.isArray(item)) return item;
    const text = looseText(item).trim();
    return text ? { name: key ?? text, description: text } : null;
  };
  if (Array.isArray(value)) {
    return value.map((item) => toRecord(item)).filter(Boolean);
  }
  if (typeof value === "string") {
    return looseStringArraySchema.parse(value).map((item) => ({ name: item, description: item }));
  }
  if (value && typeof value === "object") {
    return Object.entries(value)
      .map(([key, entry]) => toRecord(entry, key))
      .filter(Boolean);
  }
  return [];
}, z.array(z.record(z.unknown())).default([]));

const looseProjectCharacterSchema = z.preprocess((value) => {
  if (typeof value === "string") return { name: value, role: "", hook: "" };
  if (value && typeof value === "object") return value;
  return { name: "未命名角色", role: "", hook: "" };
}, z.object({
  name: z.string().default("未命名角色"),
  role: z.string().default(""),
  hook: z.string().default("")
}));

export const StoryBibleSchema = z.object({
  logline: z.string(),
  core_promise: z.string(),
  world_rules: looseStringArraySchema,
  power_system: z.union([z.string(), z.record(z.unknown())]).default(""),
  factions: looseRecordArraySchema,
  locations: looseRecordArraySchema,
  protagonist: looseRecordSchema,
  main_cast: looseRecordArraySchema,
  antagonist_forces: looseRecordArraySchema,
  major_conflicts: looseStringArraySchema,
  forbidden_contradictions: looseStringArraySchema,
  terminology: looseRecordSchema
});

export const StyleBibleSchema = z.object({
  narration_style: z.string(),
  sentence_rhythm: z.string(),
  emotional_texture: z.string(),
  imagery: looseStringArraySchema,
  dialogue_style: z.string(),
  pacing_rules: looseStringArraySchema,
  forbidden_style: looseStringArraySchema,
  sample_paragraphs: looseStringArraySchema,
  style_fingerprint: z.string()
});

export const ProjectIdeaSchema = z.object({
  title: z.string().default("未命名长篇项目"),
  genre: z.string().default("长篇小说"),
  premise: z.string().default(""),
  target_word_count: z.number().int().positive().default(800000),
  pov: z.string().default("第三人称有限视角"),
  tone: z.string().default(""),
  protagonist: z.object({
    name: z.string().default("未命名主角"),
    description: z.string().default(""),
    goal: z.string().default("")
  }).default({}),
  main_characters: z
    .array(looseProjectCharacterSchema)
    .default([]),
  world_setup: looseStringArraySchema,
  core_hooks: looseStringArraySchema,
  style_keywords: looseStringArraySchema,
  project_seed: z.string().default("")
});

export const VolumeOutlineSchema = z.object({
  title: z.string(),
  promise: z.string(),
  opening_situation: z.string(),
  major_turns: looseStringArraySchema,
  midpoint: z.string(),
  climax: z.string(),
  ending_hook: z.string(),
  character_arcs: looseRecordArraySchema,
  key_mysteries: looseStringArraySchema,
  foreshadowing: looseStringArraySchema,
  chapters_estimate: z.coerce.number().int().positive()
});

export const ArcChapterSchema = z.object({
  chapter_number: z.coerce.number().int().positive(),
  title: z.string(),
  plot_goal: z.string(),
  conflict: z.string(),
  key_scenes: looseStringArraySchema,
  character_focus: looseStringArraySchema,
  new_information: looseStringArraySchema,
  foreshadowing: looseStringArraySchema,
  cliffhanger: z.string(),
  state_changes_expected: looseStringArraySchema
});

export const ArcPackSchema = z.object({
  mini_arc_goal: z.string(),
  escalation: z.string(),
  payoff: z.string(),
  transition_to_next_pack: z.string(),
  chapters: z.array(ArcChapterSchema).min(1).max(5)
});

export const SceneBeatSchema = z.object({
  scene_number: z.number().int().positive(),
  summary: z.string(),
  location: z.string().default(""),
  pov: z.string().default(""),
  involved_character_names: z.array(z.string()).default([]),
  emotional_turn: z.string().default(""),
  plot_function: z.string().default("")
});

export const SceneBeatsSchema = z.array(SceneBeatSchema);

export const ChapterOutlineSchema = z.object({
  chapter_goal: z.string(),
  scene_list: z.array(SceneBeatSchema).default([]),
  pov: z.string(),
  emotional_arc: z.string(),
  conflict_beats: z.array(z.string()).default([]),
  reveals: z.array(z.string()).default([]),
  ending_hook: z.string(),
  required_character_state_changes: z.array(z.string()).default([]),
  required_graph_facts: z.array(z.string()).default([])
});

export const ContinuityIssueSchema = z.object({
  severity: z.enum(["low", "medium", "high", "critical"]),
  type: z.enum([
    "dead_character_appears",
    "location_conflict",
    "knowledge_leak",
    "relationship_conflict",
    "item_ownership_conflict",
    "power_system_violation",
    "timeline_conflict",
    "outline_deviation",
    "style_drift",
    "unresolved_previous_hook",
    "forbidden_contradiction",
    "personality_reversal",
    "other"
  ]),
  description: z.string(),
  evidence: z.string(),
  suggested_fix: z.string()
});

export const ContinuityReportSchema = z.object({
  pass: z.boolean(),
  issues: z.array(ContinuityIssueSchema).default([])
});

export const MemoryExtractionSchema = z.object({
  chapter_summary: z.string(),
  scene_summaries: z.array(
    z.object({
      scene_number: z.number().int().positive(),
      summary: z.string(),
      location: z.string().default(""),
      involved_character_names: z.array(z.string()).default([]),
      emotional_turn: z.string().default(""),
      plot_function: z.string().default(""),
      evidence_text: z.string(),
      confidence: z.number().min(0).max(1)
    })
  ).default([]),
  new_characters: z.array(
    z.object({
      name: z.string(),
      aliases: z.array(z.string()).default([]),
      tier: CharacterTierSchema.default("D"),
      role: z.string().default(""),
      description: z.string().default(""),
      appearance: z.string().default(""),
      personality: z.array(z.string()).default([]),
      speech_style: z.string().default(""),
      tags: z.array(z.string()).default([]),
      plot_relevant: z.boolean().default(false),
      source_chapter: z.number().int().positive(),
      evidence_text: z.string(),
      confidence: z.number().min(0).max(1)
    })
  ).default([]),
  character_state_updates: z.array(
    z.object({
      character_name: z.string(),
      alive_status: AliveStatusSchema.default("unknown"),
      location: z.string().default(""),
      physical_state: z.string().default(""),
      emotional_state: z.string().default(""),
      current_goal: z.string().default(""),
      faction: z.string().default(""),
      relationship_to_protagonist: z.string().default(""),
      knowledge: z.array(z.string()).default([]),
      secrets: z.array(z.string()).default([]),
      possessions: z.array(z.string()).default([]),
      injuries: z.array(z.string()).default([]),
      notes: z.string().default(""),
      source_chapter: z.number().int().positive(),
      evidence_text: z.string(),
      confidence: z.number().min(0).max(1)
    })
  ).default([]),
  new_entities: z.array(
    z.object({
      type: z.enum(["location", "item", "organization", "ability", "secret", "rule", "event", "concept"]),
      name: z.string(),
      aliases: z.array(z.string()).default([]),
      description: z.string().default(""),
      source_chapter: z.number().int().positive(),
      evidence_text: z.string(),
      confidence: z.number().min(0).max(1)
    })
  ).default([]),
  relation_triples: z.array(
    z.object({
      subject_type: z.string(),
      subject_name: z.string().optional(),
      subject_id: z.number().int().optional(),
      predicate: z.string(),
      object_type: z.string(),
      object_name: z.string().optional(),
      object_id: z.number().int().optional(),
      object_value: z.string().optional(),
      source_chapter: z.number().int().positive(),
      source_scene: z.number().int().positive().optional(),
      evidence_text: z.string(),
      confidence: z.number().min(0).max(1),
      valid_from_chapter: z.number().int().positive().optional(),
      valid_to_chapter: z.number().int().positive().nullable().optional(),
      importance: ImportanceSchema.default("medium")
    })
  ).default([]),
  timeline_events: z.array(
    z.object({
      chapter_number: z.number().int().positive(),
      scene_number: z.number().int().positive().optional(),
      event_type: z.string(),
      title: z.string(),
      summary: z.string(),
      involved_character_names: z.array(z.string()).default([]),
      involved_entity_names: z.array(z.string()).default([]),
      impact_level: ImpactLevelSchema,
      consequences: z.array(z.string()).default([]),
      evidence_text: z.string(),
      confidence: z.number().min(0).max(1)
    })
  ).default([]),
  foreshadowing_added: z.array(z.object({ text: z.string(), evidence_text: z.string(), confidence: z.number().min(0).max(1) })).default([]),
  foreshadowing_resolved: z.array(z.object({ text: z.string(), evidence_text: z.string(), confidence: z.number().min(0).max(1) })).default([]),
  new_rules_or_lore: z.array(z.object({ text: z.string(), evidence_text: z.string(), confidence: z.number().min(0).max(1) })).default([]),
  style_samples: z.array(z.string()).default([])
});

export type ContinuityReport = z.infer<typeof ContinuityReportSchema>;
export type MemoryExtraction = z.infer<typeof MemoryExtractionSchema>;
export type ChapterOutline = z.infer<typeof ChapterOutlineSchema>;
export type VolumeOutline = z.infer<typeof VolumeOutlineSchema>;
export type ArcPack = z.infer<typeof ArcPackSchema>;
