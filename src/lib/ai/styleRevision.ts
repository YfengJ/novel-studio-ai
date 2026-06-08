import type { Db } from "@/lib/db/database";
import { getLatestStyleBible, getSettings } from "@/lib/db/repositories";
import { styleRevisionPrompt, draftSystemPrompt } from "./prompts";
import { textCompletion } from "./client";

export async function reviseStyle(db: Db, input: { projectId: number; chapterId: number; draftText?: string; continuityReport?: unknown; apiKey?: string | null }) {
  const settings = getSettings(db, input.projectId);
  const chapter = db.prepare("select draft_text from chapters where id = ? and project_id = ?").get(input.chapterId, input.projectId) as
    | { draft_text: string | null }
    | undefined;
  const latestReport =
    input.continuityReport ??
    (db.prepare("select pass, issues_json from continuity_reports where chapter_id = ? order by created_at desc, id desc limit 1").get(input.chapterId) as
      | { pass: number; issues_json: string }
      | undefined);
  const revised = await textCompletion(db, {
    projectId: input.projectId,
    runType: "style_revision",
    model: String(settings.default_model),
    promptSummary: "Revise Chapter Style",
    system: draftSystemPrompt,
    user: styleRevisionPrompt({
      draftText: input.draftText ?? chapter?.draft_text ?? "",
      styleBible: getLatestStyleBible(db, input.projectId)?.content ?? {},
      continuityReport: latestReport ?? {}
    }),
    apiKey: input.apiKey,
    temperature: 0.55
  });
  db.prepare("update chapters set draft_text = ?, status = 'drafted', updated_at = datetime('now') where id = ?").run(revised, input.chapterId);
  return revised;
}

