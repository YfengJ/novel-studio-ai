import { ideateProject } from "@/lib/ai/ideateProject";
import { apiKeyFromRequest, errorResponse, json, readJson } from "@/lib/api/route";
import { getDb } from "@/lib/db/database";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = await readJson<Record<string, unknown>>(request);
    const idea = await ideateProject(getDb(), {
      brief: String(body.brief ?? ""),
      preferredGenre: body.preferredGenre ? String(body.preferredGenre) : undefined,
      targetWordCount: body.targetWordCount ? Number(body.targetWordCount) : undefined,
      apiKey: apiKeyFromRequest(request)
    });
    return json({ idea });
  } catch (error) {
    return errorResponse(error);
  }
}

