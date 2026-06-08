import { getDb } from "@/lib/db/database";
import { getLatestStoryBible, saveStoryBibleVersion } from "@/lib/db/repositories";
import { errorResponse, json, numberParam, readJson } from "@/lib/api/route";

export const runtime = "nodejs";
type Ctx = { params: Promise<{ projectId: string }> };

export async function GET(_request: Request, { params }: Ctx) {
  try {
    const { projectId } = await params;
    return json({ storyBible: getLatestStoryBible(getDb(), numberParam(projectId, "projectId")) });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PUT(request: Request, { params }: Ctx) {
  try {
    const { projectId } = await params;
    const body = await readJson<Record<string, unknown>>(request);
    return json({ storyBible: saveStoryBibleVersion(getDb(), numberParam(projectId, "projectId"), body.content ?? body) });
  } catch (error) {
    return errorResponse(error);
  }
}

