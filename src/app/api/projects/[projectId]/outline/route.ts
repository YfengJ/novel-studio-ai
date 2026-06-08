import { getDb } from "@/lib/db/database";
import { errorResponse, json, numberParam, readJson } from "@/lib/api/route";

export const runtime = "nodejs";
type Ctx = { params: Promise<{ projectId: string }> };

export async function GET(_request: Request, { params }: Ctx) {
  try {
    const { projectId } = await params;
    const id = numberParam(projectId, "projectId");
    const db = getDb();
    return json({
      volumes: db.prepare("select * from volumes where project_id = ? order by volume_number").all(id),
      arcPacks: db.prepare("select * from arc_packs where project_id = ? order by start_chapter_number").all(id),
      chapters: db.prepare("select id, volume_id, arc_pack_id, chapter_number, title, outline_json, scene_beats_json, status from chapters where project_id = ? order by chapter_number").all(id)
    });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PATCH(request: Request, { params }: Ctx) {
  try {
    const { projectId } = await params;
    const id = numberParam(projectId, "projectId");
    const body = await readJson<Record<string, unknown>>(request);
    const db = getDb();
    if (body.kind === "volume") db.prepare("update volumes set outline_json = ?, title = coalesce(?, title) where id = ? and project_id = ?").run(String(body.outline_json), body.title ?? null, Number(body.id), id);
    if (body.kind === "arc") db.prepare("update arc_packs set outline_json = ? where id = ? and project_id = ?").run(String(body.outline_json), Number(body.id), id);
    if (body.kind === "chapter") {
      db.prepare("update chapters set outline_json = ?, scene_beats_json = ?, title = coalesce(?, title), updated_at = datetime('now') where id = ? and project_id = ?").run(
        String(body.outline_json),
        String(body.scene_beats_json ?? "[]"),
        body.title ?? null,
        Number(body.id),
        id
      );
    }
    return json({ ok: true });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function DELETE(request: Request, { params }: Ctx) {
  try {
    const { projectId } = await params;
    const id = numberParam(projectId, "projectId");
    const body = await readJson<Record<string, unknown>>(request);
    const db = getDb();
    if (body.kind === "volume") db.prepare("delete from volumes where id = ? and project_id = ?").run(Number(body.id), id);
    else if (body.kind === "arc") db.prepare("delete from arc_packs where id = ? and project_id = ?").run(Number(body.id), id);
    else if (body.kind === "chapter") db.prepare("delete from chapters where id = ? and project_id = ?").run(Number(body.id), id);
    else throw new Error("Unknown outline item kind");
    return json({ ok: true });
  } catch (error) {
    return errorResponse(error);
  }
}
