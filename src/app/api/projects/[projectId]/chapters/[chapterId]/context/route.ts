import { buildContextPack } from "@/lib/context/contextPack";
import { getDb } from "@/lib/db/database";
import { errorResponse, json, numberParam } from "@/lib/api/route";

export const runtime = "nodejs";
type Ctx = { params: Promise<{ projectId: string; chapterId: string }> };

export async function GET(_request: Request, { params }: Ctx) {
  try {
    const { projectId, chapterId } = await params;
    return json({ contextPack: await buildContextPack(getDb(), numberParam(projectId, "projectId"), numberParam(chapterId, "chapterId")) });
  } catch (error) {
    return errorResponse(error);
  }
}

