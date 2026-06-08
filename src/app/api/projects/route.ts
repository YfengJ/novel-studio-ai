import { getDb } from "@/lib/db/database";
import { createProject, listProjects } from "@/lib/db/repositories";
import { errorResponse, json, readJson } from "@/lib/api/route";

export const runtime = "nodejs";

export async function GET() {
  try {
    return json({ projects: listProjects(getDb()) });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const body = await readJson<Record<string, unknown>>(request);
    const project = createProject(getDb(), {
      title: String(body.title || "未命名小说"),
      genre: String(body.genre || ""),
      premise: String(body.premise || ""),
      target_word_count: Number(body.target_word_count || 0),
      pov: String(body.pov || "第三人称有限视角"),
      tone: String(body.tone || "")
    });
    return json({ project });
  } catch (error) {
    return errorResponse(error);
  }
}

