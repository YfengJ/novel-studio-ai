import { generateChapterDraft } from "@/lib/ai/generateChapter";
import { apiKeyFromRequest, errorResponse, json, numberParam } from "@/lib/api/route";
import { getDb } from "@/lib/db/database";

export const runtime = "nodejs";
type Ctx = { params: Promise<{ projectId: string; chapterId: string }> };

export async function POST(request: Request, { params }: Ctx) {
  try {
    const { projectId, chapterId } = await params;
    return json(await generateChapterDraft(getDb(), { projectId: numberParam(projectId, "projectId"), chapterId: numberParam(chapterId, "chapterId"), apiKey: apiKeyFromRequest(request) }));
  } catch (error) {
    return errorResponse(error);
  }
}

