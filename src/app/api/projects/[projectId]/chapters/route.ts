import { getDb } from "@/lib/db/database";
import { errorResponse, json, numberParam, readJson } from "@/lib/api/route";

export const runtime = "nodejs";
type Ctx = { params: Promise<{ projectId: string }> };

export async function GET(_request: Request, { params }: Ctx) {
  try {
    const { projectId } = await params;
    const id = numberParam(projectId, "projectId");
    return json({ chapters: getDb().prepare("select * from chapters where project_id = ? order by chapter_number").all(id) });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request, { params }: Ctx) {
  try {
    const { projectId } = await params;
    const id = numberParam(projectId, "projectId");
    const body = await readJson<Record<string, unknown>>(request);
    const chapter = getDb()
      .prepare("insert into chapters (project_id, chapter_number, title, outline_json, scene_beats_json, status) values (?, ?, ?, ?, ?, 'planned') returning *")
      .get(id, Number(body.chapter_number), String(body.title ?? ""), String(body.outline_json ?? "{}"), String(body.scene_beats_json ?? "[]"));
    return json({ chapter });
  } catch (error) {
    return errorResponse(error);
  }
}

