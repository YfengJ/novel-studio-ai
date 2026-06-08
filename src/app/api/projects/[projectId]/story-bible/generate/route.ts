import { generateStoryBible } from "@/lib/ai/generateBible";
import { apiKeyFromRequest, errorResponse, json, numberParam } from "@/lib/api/route";
import { getDb } from "@/lib/db/database";

export const runtime = "nodejs";
type Ctx = { params: Promise<{ projectId: string }> };

export async function POST(request: Request, { params }: Ctx) {
  try {
    const { projectId } = await params;
    const bible = await generateStoryBible(getDb(), numberParam(projectId, "projectId"), apiKeyFromRequest(request));
    return json({ storyBible: bible });
  } catch (error) {
    return errorResponse(error);
  }
}

