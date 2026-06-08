import { generateArcPack, generateChapterOutline, generateSceneBeats, generateVolumeOutline } from "@/lib/ai/generateOutline";
import { apiKeyFromRequest, errorResponse, json, numberParam, readJson } from "@/lib/api/route";
import { getDb } from "@/lib/db/database";

export const runtime = "nodejs";
type Ctx = { params: Promise<{ projectId: string }> };

export async function POST(request: Request, { params }: Ctx) {
  try {
    const { projectId } = await params;
    const id = numberParam(projectId, "projectId");
    const body = await readJson<Record<string, unknown>>(request);
    const apiKey = apiKeyFromRequest(request);
    if (body.type === "volume") return json({ volume: await generateVolumeOutline(getDb(), id, apiKey) });
    if (body.type === "arc") {
      return json({
        arcPack: await generateArcPack(getDb(), {
          projectId: id,
          volumeId: Number(body.volumeId),
          startChapterNumber: Number(body.startChapterNumber ?? 1),
          endChapterNumber: Number(body.endChapterNumber ?? 5),
          apiKey
        })
      });
    }
    if (body.type === "chapter") {
      return json({
        chapter: await generateChapterOutline(getDb(), {
          projectId: id,
          arcPackId: Number(body.arcPackId),
          chapterNumber: Number(body.chapterNumber),
          apiKey
        })
      });
    }
    if (body.type === "sceneBeats") {
      return json({ sceneBeats: await generateSceneBeats(getDb(), { projectId: id, chapterId: Number(body.chapterId), apiKey }) });
    }
    throw new Error("Unknown outline generation type");
  } catch (error) {
    return errorResponse(error);
  }
}

