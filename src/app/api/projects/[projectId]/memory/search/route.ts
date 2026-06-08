import { getDb } from "@/lib/db/database";
import { HybridRetrievalService } from "@/lib/retrieval/hybridRetrieval";
import { errorResponse, json, numberParam, readJson } from "@/lib/api/route";

export const runtime = "nodejs";
type Ctx = { params: Promise<{ projectId: string }> };

export async function POST(request: Request, { params }: Ctx) {
  try {
    const { projectId } = await params;
    const id = numberParam(projectId, "projectId");
    const body = await readJson<Record<string, unknown>>(request);
    const chapter = getDb().prepare("select id from chapters where project_id = ? order by chapter_number desc limit 1").get(id) as { id: number } | undefined;
    if (!chapter) return json({ graphFacts: [], vectorChunks: [], keywordChunks: [], characterStates: [], timelineEvents: [] });
    const result = new HybridRetrievalService(getDb()).search({
      projectId: id,
      chapterId: Number(body.chapterId || chapter.id),
      query: String(body.query || ""),
      maxResults: Number(body.maxResults || 10)
    });
    return json(result);
  } catch (error) {
    return errorResponse(error);
  }
}

