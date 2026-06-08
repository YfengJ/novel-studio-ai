import { generateStyleBible } from "@/lib/ai/generateBible";
import { apiKeyFromRequest, errorResponse, json, numberParam } from "@/lib/api/route";
import { getDb } from "@/lib/db/database";
import { getLatestStoryBible } from "@/lib/db/repositories";

export const runtime = "nodejs";
type Ctx = { params: Promise<{ projectId: string }> };

export async function POST(request: Request, { params }: Ctx) {
  try {
    const { projectId } = await params;
    const id = numberParam(projectId, "projectId");
    const storyBible = getLatestStoryBible(getDb(), id);
    if (!storyBible) throw new Error("请先生成 Story Bible，再生成 Style Bible。");
    const styleBible = await generateStyleBible(getDb(), id, storyBible.content, apiKeyFromRequest(request));
    return json({ styleBible });
  } catch (error) {
    return errorResponse(error);
  }
}
