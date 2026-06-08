import { getDb } from "@/lib/db/database";
import { errorResponse, json, numberParam, readJson } from "@/lib/api/route";

export const runtime = "nodejs";
type Ctx = { params: Promise<{ projectId: string; chapterId: string }> };

export async function GET(_request: Request, { params }: Ctx) {
  try {
    const { projectId, chapterId } = await params;
    return json({
      chapter: getDb().prepare("select * from chapters where project_id = ? and id = ?").get(numberParam(projectId, "projectId"), numberParam(chapterId, "chapterId"))
    });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PATCH(request: Request, { params }: Ctx) {
  try {
    const { projectId, chapterId } = await params;
    const id = numberParam(projectId, "projectId");
    const chapter = numberParam(chapterId, "chapterId");
    const body = await readJson<Record<string, unknown>>(request);
    const draftWasEdited = Object.prototype.hasOwnProperty.call(body, "draft_text");
    getDb()
      .prepare(
        `update chapters
         set title = coalesce(?, title),
             draft_text = coalesce(?, draft_text),
             final_text = coalesce(?, final_text),
             outline_json = coalesce(?, outline_json),
             scene_beats_json = coalesce(?, scene_beats_json),
             status = case when ? then 'drafted' else status end,
             updated_at = datetime('now')
         where project_id = ? and id = ?`
      )
      .run(body.title ?? null, body.draft_text ?? null, body.final_text ?? null, body.outline_json ?? null, body.scene_beats_json ?? null, draftWasEdited ? 1 : 0, id, chapter);
    return json({ chapter: getDb().prepare("select * from chapters where project_id = ? and id = ?").get(id, chapter) });
  } catch (error) {
    return errorResponse(error);
  }
}
