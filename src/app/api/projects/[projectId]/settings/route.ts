import { getDb } from "@/lib/db/database";
import { getSettings, updateSettings } from "@/lib/db/repositories";
import { errorResponse, json, numberParam, readJson } from "@/lib/api/route";

export const runtime = "nodejs";
type Ctx = { params: Promise<{ projectId: string }> };

export async function GET(_request: Request, { params }: Ctx) {
  try {
    const { projectId } = await params;
    return json({ settings: getSettings(getDb(), numberParam(projectId, "projectId")) });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PATCH(request: Request, { params }: Ctx) {
  try {
    const { projectId } = await params;
    return json({ settings: updateSettings(getDb(), numberParam(projectId, "projectId"), await readJson(request)) });
  } catch (error) {
    return errorResponse(error);
  }
}

