import { getDb } from "@/lib/db/database";
import { deleteProject, getDashboard, getProject, updateProject } from "@/lib/db/repositories";
import { errorResponse, json, numberParam, readJson } from "@/lib/api/route";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ projectId: string }> };

export async function GET(_request: Request, { params }: Ctx) {
  try {
    const { projectId } = await params;
    const id = numberParam(projectId, "projectId");
    return json({ project: getProject(getDb(), id), dashboard: getDashboard(getDb(), id) });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PATCH(request: Request, { params }: Ctx) {
  try {
    const { projectId } = await params;
    const id = numberParam(projectId, "projectId");
    return json({ project: updateProject(getDb(), id, await readJson(request)) });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function DELETE(_request: Request, { params }: Ctx) {
  try {
    const { projectId } = await params;
    deleteProject(getDb(), numberParam(projectId, "projectId"));
    return json({ ok: true });
  } catch (error) {
    return errorResponse(error);
  }
}

