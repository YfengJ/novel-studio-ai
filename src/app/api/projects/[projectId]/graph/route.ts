import { getDb } from "@/lib/db/database";
import { errorResponse, json, numberParam } from "@/lib/api/route";

export const runtime = "nodejs";
type Ctx = { params: Promise<{ projectId: string }> };

export async function GET(request: Request, { params }: Ctx) {
  try {
    const { projectId } = await params;
    const id = numberParam(projectId, "projectId");
    const search = new URL(request.url).searchParams;
    const q = `%${search.get("q") ?? ""}%`;
    const importance = search.get("importance");
    const chapter = search.get("chapter");
    const triples = getDb()
      .prepare(
        `select * from relation_triples
         where project_id = ?
           and (? is null or importance = ?)
           and (? is null or source_chapter = ?)
           and (subject_type like ? or predicate like ? or object_type like ? or object_value like ? or evidence_text like ?)
         order by source_chapter desc, id desc
         limit 300`
      )
      .all(id, importance, importance, chapter, chapter ? Number(chapter) : null, q, q, q, q, q);
    return json({ triples });
  } catch (error) {
    return errorResponse(error);
  }
}

