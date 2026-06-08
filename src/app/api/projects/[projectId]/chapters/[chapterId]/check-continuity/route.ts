import { checkContinuity } from "@/lib/ai/checkContinuity";
import { apiKeyFromRequest, errorResponse, json, numberParam, readJson } from "@/lib/api/route";
import { getDb } from "@/lib/db/database";

export const runtime = "nodejs";
type Ctx = { params: Promise<{ projectId: string; chapterId: string }> };

export async function POST(request: Request, { params }: Ctx) {
  try {
    const { projectId, chapterId } = await params;
    const body = await readJson<Record<string, unknown>>(request);
    const report = await checkContinuity(getDb(), {
      projectId: numberParam(projectId, "projectId"),
      chapterId: numberParam(chapterId, "chapterId"),
      draftText: body.draftText ? String(body.draftText) : undefined,
      apiKey: apiKeyFromRequest(request)
    });
    return json({ report });
  } catch (error) {
    return errorResponse(error);
  }
}

