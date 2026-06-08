import { reviseStyle } from "@/lib/ai/styleRevision";
import { apiKeyFromRequest, errorResponse, json, numberParam, readJson } from "@/lib/api/route";
import { getDb } from "@/lib/db/database";

export const runtime = "nodejs";
type Ctx = { params: Promise<{ projectId: string; chapterId: string }> };

export async function POST(request: Request, { params }: Ctx) {
  try {
    const { projectId, chapterId } = await params;
    const body = await readJson<Record<string, unknown>>(request);
    const revised = await reviseStyle(getDb(), {
      projectId: numberParam(projectId, "projectId"),
      chapterId: numberParam(chapterId, "chapterId"),
      draftText: body.draftText ? String(body.draftText) : undefined,
      continuityReport: body.continuityReport,
      apiKey: apiKeyFromRequest(request)
    });
    return json({ revised });
  } catch (error) {
    return errorResponse(error);
  }
}

