import { acceptChapter } from "@/lib/memory/memoryService";
import { apiKeyFromRequest, errorResponse, json, numberParam, readJson } from "@/lib/api/route";
import { getDb } from "@/lib/db/database";

export const runtime = "nodejs";
type Ctx = { params: Promise<{ projectId: string; chapterId: string }> };

export async function POST(request: Request, { params }: Ctx) {
  try {
    const { projectId, chapterId } = await params;
    const body = await readJson<Record<string, unknown>>(request);
    const extraction = await acceptChapter(getDb(), {
      projectId: numberParam(projectId, "projectId"),
      chapterId: numberParam(chapterId, "chapterId"),
      finalText: body.finalText ? String(body.finalText) : undefined,
      apiKey: apiKeyFromRequest(request)
    });
    return json({ extraction });
  } catch (error) {
    return errorResponse(
      error,
      error instanceof Error && (error.message.includes("不能接受") || error.message.includes("正文为空") || error.message.includes("一致性检查")) ? 409 : 500
    );
  }
}
