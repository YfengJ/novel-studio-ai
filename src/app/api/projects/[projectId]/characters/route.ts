import { getDb } from "@/lib/db/database";
import { errorResponse, json, numberParam, readJson } from "@/lib/api/route";
import { ensureCharacterByName } from "@/lib/characters/characterService";

export const runtime = "nodejs";
type Ctx = { params: Promise<{ projectId: string }> };

export async function GET(request: Request, { params }: Ctx) {
  try {
    const { projectId } = await params;
    const id = numberParam(projectId, "projectId");
    const tier = new URL(request.url).searchParams.get("tier");
    const sql = tier ? "select * from characters where project_id = ? and tier = ? order by name" : "select * from characters where project_id = ? order by tier, name";
    const characters = tier ? getDb().prepare(sql).all(id, tier) : getDb().prepare(sql).all(id);
    return json({ characters });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request, { params }: Ctx) {
  try {
    const { projectId } = await params;
    const id = numberParam(projectId, "projectId");
    const body = await readJson<Record<string, unknown>>(request);
    const characterId = ensureCharacterByName(getDb(), {
      projectId: id,
      name: String(body.name),
      tier: (body.tier as "S" | "A" | "B" | "C" | "D") ?? "D",
      chapterNumber: Number(body.chapterNumber || 1),
      description: String(body.description ?? "")
    });
    return json({ character: getDb().prepare("select * from characters where id = ?").get(characterId) });
  } catch (error) {
    return errorResponse(error);
  }
}

