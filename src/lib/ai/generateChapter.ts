import type { Db } from "@/lib/db/database";
import { buildContextPack } from "@/lib/context/contextPack";
import { getSettings } from "@/lib/db/repositories";
import { countWords } from "@/lib/utils/text";
import { chapterDraftPrompt, draftSystemPrompt } from "./prompts";
import { textCompletion } from "./client";

function isEmptyObject(value: unknown) {
  return Boolean(value && typeof value === "object" && !Array.isArray(value) && !Object.keys(value as Record<string, unknown>).length);
}

export async function generateChapterDraft(db: Db, input: { projectId: number; chapterId: number; apiKey?: string | null }) {
  const settings = getSettings(db, input.projectId);
  const contextPack = await buildContextPack(db, input.projectId, input.chapterId);
  if (isEmptyObject(contextPack.storyBible)) throw new Error("请先生成并保存 Story Bible，再生成正文。");
  if (isEmptyObject(contextPack.styleBible)) throw new Error("请先生成并保存 Style Bible，再生成正文。");
  if (isEmptyObject(contextPack.volumeOutline)) throw new Error("当前章节缺少卷大纲，请先在大纲页生成卷大纲。");
  if (isEmptyObject(contextPack.arcPack)) throw new Error("当前章节缺少五章剧情包，请先在大纲页生成五章包。");
  if (isEmptyObject(contextPack.chapterOutline)) throw new Error("当前章节缺少章节细纲，请先在大纲页生成章节细纲。");
  if (!Array.isArray(contextPack.sceneBeats) || contextPack.sceneBeats.length === 0) throw new Error("当前章节缺少场景节拍，请先在大纲页生成 Scene Beats。");
  const draft = await textCompletion(db, {
    projectId: input.projectId,
    runType: "chapter_draft",
    model: String(settings.default_model),
    promptSummary: "Generate Chapter Draft",
    system: draftSystemPrompt,
    user: chapterDraftPrompt(contextPack, Number(settings.chapter_target_words)),
    apiKey: input.apiKey,
    temperature: 0.75
  });
  db.prepare("update chapters set draft_text = ?, status = 'drafted', word_count = ?, updated_at = datetime('now') where id = ?").run(
    draft,
    countWords(draft),
    input.chapterId
  );
  return { draft, contextPack };
}
