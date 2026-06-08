import { getDb } from "@/lib/db/database";
import { errorResponse, json, numberParam, readJson } from "@/lib/api/route";

export const runtime = "nodejs";
type Ctx = { params: Promise<{ projectId: string; characterId: string }> };

export async function GET(_request: Request, { params }: Ctx) {
  try {
    const { projectId, characterId } = await params;
    return json({
      states: getDb()
        .prepare("select * from character_states where project_id = ? and character_id = ? order by chapter_number desc, id desc")
        .all(numberParam(projectId, "projectId"), numberParam(characterId, "characterId"))
    });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request, { params }: Ctx) {
  try {
    const { projectId, characterId } = await params;
    const body = await readJson<Record<string, unknown>>(request);
    const db = getDb();
    db.prepare(
      `insert into character_states
       (project_id, character_id, chapter_number, alive_status, location, physical_state, emotional_state, current_goal, faction,
        relationship_to_protagonist, knowledge_json, secrets_json, possessions_json, injuries_json, notes, source_chapter)
       values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      numberParam(projectId, "projectId"),
      numberParam(characterId, "characterId"),
      Number(body.chapter_number || body.chapterNumber || 1),
      String(body.alive_status || "unknown"),
      String(body.location || ""),
      String(body.physical_state || ""),
      String(body.emotional_state || ""),
      String(body.current_goal || ""),
      String(body.faction || ""),
      String(body.relationship_to_protagonist || ""),
      JSON.stringify(body.knowledge ?? []),
      JSON.stringify(body.secrets ?? []),
      JSON.stringify(body.possessions ?? []),
      JSON.stringify(body.injuries ?? []),
      String(body.notes || ""),
      Number(body.source_chapter || body.chapter_number || 1)
    );
    return json({ ok: true });
  } catch (error) {
    return errorResponse(error);
  }
}

