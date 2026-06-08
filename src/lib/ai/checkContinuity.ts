import type { Db } from "@/lib/db/database";
import { buildContextPack } from "@/lib/context/contextPack";
import { getSettings } from "@/lib/db/repositories";
import { mergeContinuityReports, runHardRuleChecks } from "@/lib/continuity/hardRules";
import { continuityPrompt, jsonSystemPrompt } from "./prompts";
import { ContinuityReportSchema } from "./schemas";
import { structuredJsonCompletion } from "./client";

export async function checkContinuity(db: Db, input: { projectId: number; chapterId: number; draftText?: string; apiKey?: string | null }) {
  const settings = getSettings(db, input.projectId);
  const chapter = db.prepare("select draft_text from chapters where id = ? and project_id = ?").get(input.chapterId, input.projectId) as
    | { draft_text: string | null }
    | undefined;
  const draftText = input.draftText ?? chapter?.draft_text ?? "";
  const contextPack = await buildContextPack(db, input.projectId, input.chapterId);
  const modelReport = await structuredJsonCompletion(db, {
    projectId: input.projectId,
    runType: "continuity_check",
    model: String(settings.default_model),
    promptSummary: "Check Chapter Continuity",
    system: jsonSystemPrompt,
    user: continuityPrompt({ contextPack, draftText }),
    schema: ContinuityReportSchema,
    apiKey: input.apiKey
  });
  const report = mergeContinuityReports(
    { pass: Boolean(modelReport.pass), issues: modelReport.issues ?? [] },
    runHardRuleChecks(contextPack, draftText)
  );
  db.prepare("insert into continuity_reports (project_id, chapter_id, pass, issues_json) values (?, ?, ?, ?)").run(
    input.projectId,
    input.chapterId,
    report.pass ? 1 : 0,
    JSON.stringify(report.issues)
  );
  db.prepare("update chapters set status = 'checked', updated_at = datetime('now') where id = ?").run(input.chapterId);
  return report;
}
