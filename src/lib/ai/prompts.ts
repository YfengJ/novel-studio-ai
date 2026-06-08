import type { ContextPack } from "@/lib/context/contextPack";
import { LONG_SERIAL_PACING_RULES } from "./pacing";

export const jsonSystemPrompt = `你是长篇连载小说创作系统的结构化规划模块。只输出严格 JSON，不要 Markdown，不要解释，不要代码围栏。`;

export const draftSystemPrompt = `你是长篇连载小说正文写作模块。你必须只依据 Context Pack 写正文，不能依赖聊天记忆，不能输出解释。`;

export function projectIdeaPrompt(input: { brief: string; preferredGenre?: string; targetWordCount?: number }) {
  return `请为一个长篇连载小说项目做创建前构思。必须输出严格 JSON，字段包括：
title, genre, premise, target_word_count, pov, tone, protagonist, main_characters, world_setup, core_hooks, style_keywords, project_seed。

要求：
- title 要像真实连载小说标题，短、有辨识度。
- premise 是 1-2 句项目简介。
- protagonist 包含 name, description, goal。
- main_characters 给 3-5 个对象，每个对象必须包含 name, role, hook。
- world_setup 必须是字符串数组，给关键世界观、力量体系、限制。
- core_hooks 必须是字符串数组，给爽点、悬念、连载钩子。
- style_keywords 必须是字符串数组，给文风关键词。
- project_seed 要能直接作为后续 Story Bible 的种子设定，整合主角、世界观、角色、爽点、文风、目标字数。

用户初始想法：
${input.brief || "用户暂未输入，请构思一个适合长篇连载的东方幻想项目。"}

偏好类型：
${input.preferredGenre || "不限"}

目标字数：
${input.targetWordCount || 800000}`;
}

export function storyBiblePrompt(seed: unknown) {
  return `根据以下小说种子生成 Story Bible。必须输出 JSON，字段包括：
logline, core_promise, world_rules, power_system, factions, locations, protagonist, main_cast, antagonist_forces, major_conflicts, forbidden_contradictions, terminology。

小说种子：
${JSON.stringify(seed, null, 2)}`;
}

export function styleBiblePrompt(seed: unknown, storyBible: unknown) {
  return `根据小说种子和 Story Bible 生成 Style Bible。必须输出 JSON，字段包括：
narration_style, sentence_rhythm, emotional_texture, imagery, dialogue_style, pacing_rules, forbidden_style, sample_paragraphs, style_fingerprint。

小说种子：
${JSON.stringify(seed, null, 2)}

Story Bible：
${JSON.stringify(storyBible, null, 2)}`;
}

export type OutlineContinuityContext = {
  storyBible?: unknown;
  styleBible?: unknown;
  existingVolumes?: unknown;
  existingArcPacks?: unknown;
  existingChapters?: unknown;
  characterStates?: unknown;
  timelineEvents?: unknown;
  graphFacts?: unknown;
};

function continuityContextBlock(context?: OutlineContinuityContext) {
  if (!context) return "";
  return `\n\n连续性上下文（必须遵守，不能和已有内容割裂）：\n${JSON.stringify(context, null, 2)}`;
}

export function volumeOutlinePrompt(input: { storyBible: unknown; styleBible?: unknown; existingVolumes?: unknown }) {
  return `基于 Story Bible 生成第一卷或下一卷卷大纲。必须输出 JSON，字段包括：
title, promise, opening_situation, major_turns, midpoint, climax, ending_hook, character_arcs, key_mysteries, foreshadowing, chapters_estimate。

硬性要求：
- 必须使用项目已有语言、题材、角色和力量体系，不要生成泛化西幻/陌生主角。
- 输出语言必须沿用小说种子的主要语言；中文项目不要输出英文卷名、英文角色名或英文剧情骨架。
- chapters_estimate 要按长篇连载估算，一卷通常 60-120 章，不要用 5-15 章写完整卷。
- major_turns 是卷级里程碑，只能描述远期方向；不要让第一组五章就走到 midpoint、climax 或 ending_hook。
- 如果已有卷大纲，只能生成下一卷，必须承接上一卷 ending_hook、未回收伏笔和人物状态。
- 不允许提前解决后续卷高潮。

${LONG_SERIAL_PACING_RULES}

Story Bible：
${JSON.stringify(input.storyBible, null, 2)}

Style Bible：
${JSON.stringify(input.styleBible ?? {}, null, 2)}

已有卷大纲：
${JSON.stringify(input.existingVolumes ?? [], null, 2)}`;
}

export function arcPackPrompt(input: { volumeOutline: unknown; startChapterNumber: number; endChapterNumber: number; continuityContext?: OutlineContinuityContext }) {
  return `基于卷大纲生成 ${input.startChapterNumber}-${input.endChapterNumber} 章的五章剧情包。必须输出 JSON：
mini_arc_goal, escalation, payoff, transition_to_next_pack, chapters。
chapters 中每章包含 chapter_number, title, plot_goal, conflict, key_scenes, character_focus, new_information, foreshadowing, cliffhanger, state_changes_expected。

硬性要求：
- 只能生成第 ${input.startChapterNumber}-${input.endChapterNumber} 章，不得生成其他章号。
- 输出语言必须沿用小说种子的主要语言；中文项目不要输出英文标题或英文剧情骨架。
- 必须承接 Story Bible、当前卷大纲、已有五章包、已有章节摘要、角色状态、时间线和图谱事实。
- 不允许重启故事、替换主角、换世界观、跳到无关剧情。
- 五章只解决一个局部问题，payoff 只能是局部阶段收益；不得把卷级转折压缩进五章。
- 如果这是第 1-5 章，只能写开局适应、一次小冲突、一个关系试探或一个基础能力限制，不得直接进入远征、核心组织、高层权斗或主线高潮。
- state_changes_expected 只能写预期变化，不能直接更新数据库；真实状态只在接受章节后入库。
- 伏笔、角色目标、地点、道具归属必须与连续性上下文一致。

${LONG_SERIAL_PACING_RULES}

卷大纲：
${JSON.stringify(input.volumeOutline, null, 2)}${continuityContextBlock(input.continuityContext)}`;
}

export function chapterOutlinePrompt(input: { arcPack: unknown; chapterNumber: number; volumeOutline?: unknown; continuityContext?: OutlineContinuityContext }) {
  return `基于五章剧情包生成第 ${input.chapterNumber} 章章节细纲。必须输出 JSON，字段包括：
chapter_goal, scene_list, pov, emotional_arc, conflict_beats, reveals, ending_hook, required_character_state_changes, required_graph_facts。
scene_list 每项包含 scene_number, summary, location, pov, involved_character_names, emotional_turn, plot_function。

硬性要求：
- 只能生成第 ${input.chapterNumber} 章细纲，必须贴合当前卷大纲和当前五章包。
- 输出语言必须沿用小说种子的主要语言；中文项目不要输出英文标题或英文剧情骨架。
- 必须承接已有章节摘要、上一章结尾、角色状态、有效图谱事实和时间线。
- 不要用总结跳过过程；每章聚焦一个明确目标，scene_list 建议 3-5 场，不能把训练、调查、战斗、升职、远征等多个大阶段塞进同一章。
- required_character_state_changes / required_graph_facts 是写作后需要抽取的事实预期，不是立即入库。
- 不允许让角色知道其 knowledge 中没有的信息。
- 不允许让死亡/失踪/封印角色正常行动，除非 Story Bible 和本章细纲明确允许。

${LONG_SERIAL_PACING_RULES}

当前卷大纲：
${JSON.stringify(input.volumeOutline ?? {}, null, 2)}

五章剧情包：
${JSON.stringify(input.arcPack, null, 2)}${continuityContextBlock(input.continuityContext)}`;
}

export function sceneBeatsPrompt(input: { chapterOutline: unknown; volumeOutline?: unknown; arcPack?: unknown; continuityContext?: OutlineContinuityContext }) {
  return `把章节细纲拆成可写作的 Scene Beats。只输出 JSON 数组，每项包含：
scene_number, summary, location, pov, involved_character_names, emotional_turn, plot_function。

硬性要求：
- Scene Beats 必须服务于本章细纲，不得新增大剧情或提前解决卷高潮。
- 输出语言必须沿用小说种子的主要语言；中文项目不要输出英文场景描述。
- 场景顺序要有清晰因果：目标、冲突、转折、钩子。
- 出场角色、地点、道具必须和连续性上下文一致。
- 不要用旁白概括跨越多天或多个大事件；需要把动作、对话、误判、反应和余波拆成可写场景。

当前卷大纲：
${JSON.stringify(input.volumeOutline ?? {}, null, 2)}

当前五章包：
${JSON.stringify(input.arcPack ?? {}, null, 2)}

章节细纲：
${JSON.stringify(input.chapterOutline, null, 2)}${continuityContextBlock(input.continuityContext)}`;
}

export function chapterDraftPrompt(contextPack: ContextPack, chapterTargetWords: number) {
  return `请根据 Context Pack 写当前章节正文。

硬性要求：
- 只根据 Context Pack 写正文。
- 不允许擅自改变死亡、阵营、地点、道具归属、力量体系规则。
- 不允许提前解决后续大纲高潮。
- 不允许让角色知道自己不该知道的信息。
- 必须保持 Style Bible。
- 每章结尾要有具体钩子。
- 输出正文，不输出解释、标题说明或 Markdown。
- 字数尽量接近 ${chapterTargetWords} 字。
- 慢热连载节奏：不要用总结跳过过程；优先展开具体场景、对话、动作、误判、后果和情绪余波。若章节细纲过密，只写本章最核心的当前目标，不要压缩完成后续大纲。

Context Pack：
${JSON.stringify(contextPack, null, 2)}`;
}

export function continuityPrompt(input: { contextPack: ContextPack; draftText: string }) {
  return `检查草稿是否违背 Context Pack。输出 JSON：pass, issues。
issue 字段：severity, type, description, evidence, suggested_fix。
检查类型至少包括 dead_character_appears, location_conflict, knowledge_leak, relationship_conflict, item_ownership_conflict, power_system_violation, timeline_conflict, outline_deviation, style_drift, unresolved_previous_hook。

Context Pack：
${JSON.stringify(input.contextPack, null, 2)}

草稿正文：
${input.draftText}`;
}

export function styleRevisionPrompt(input: { draftText: string; styleBible: unknown; continuityReport: unknown }) {
  return `请基于 Style Bible 和检查报告润色正文，只能做文风润色与必要修复，不允许新增大剧情，不允许改写已确认事实。
只输出润色后的正文。

Style Bible：
${JSON.stringify(input.styleBible, null, 2)}

检查报告：
${JSON.stringify(input.continuityReport, null, 2)}

正文：
${input.draftText}`;
}

export function memoryExtractorPrompt(input: { chapterNumber: number; finalText: string }) {
  return `从已接受的第 ${input.chapterNumber} 章正文中抽取可入库记忆。必须输出 JSON，字段包括：
chapter_summary, scene_summaries, new_characters, character_state_updates, new_entities, relation_triples, timeline_events, foreshadowing_added, foreshadowing_resolved, new_rules_or_lore, style_samples。
所有事实抽取必须包含 source_chapter、evidence_text、confidence。死亡、复活、阵营背叛、力量体系突破、核心道具转移必须标记 high 或 critical impact/importance。

已接受正文：
${input.finalText}`;
}
