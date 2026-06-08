import { getDb } from "@/lib/db/database";
import { errorResponse, numberParam } from "@/lib/api/route";
import { exportBookMarkdown, exportCharacterBibleJson, exportChapterMarkdown, exportGraphTriplesJson, exportProjectBackup, exportStoryBibleJson } from "@/lib/export/exportProject";

export const runtime = "nodejs";
type Ctx = { params: Promise<{ projectId: string }> };

function fileResponse(content: string, filename: string, contentType: string) {
  return new Response(content, {
    headers: {
      "content-type": `${contentType}; charset=utf-8`,
      "content-disposition": `attachment; filename="${filename}"`
    }
  });
}

export async function GET(request: Request, { params }: Ctx) {
  try {
    const { projectId } = await params;
    const id = numberParam(projectId, "projectId");
    const type = new URL(request.url).searchParams.get("type") ?? "backup";
    const chapterId = new URL(request.url).searchParams.get("chapterId");
    const db = getDb();
    if (type === "chapter" && chapterId) return fileResponse(exportChapterMarkdown(db, id, Number(chapterId)), "chapter.md", "text/markdown");
    if (type === "book") return fileResponse(exportBookMarkdown(db, id), "book.md", "text/markdown");
    if (type === "story-bible") return fileResponse(JSON.stringify(exportStoryBibleJson(db, id), null, 2), "story-bible.json", "application/json");
    if (type === "characters") return fileResponse(JSON.stringify(exportCharacterBibleJson(db, id), null, 2), "characters.json", "application/json");
    if (type === "graph") return fileResponse(JSON.stringify(exportGraphTriplesJson(db, id), null, 2), "graph-triples.json", "application/json");
    return fileResponse(JSON.stringify(exportProjectBackup(db, id), null, 2), "project-backup.json", "application/json");
  } catch (error) {
    return errorResponse(error);
  }
}

