import Database from "better-sqlite3";
import { describe, expect, it } from "vitest";
import { runMigrations } from "@/lib/db/database";
import { getProjectWorkflow } from "./projectWorkflow";

function createProject(db: Database.Database) {
  const project = db.prepare("insert into projects (title) values (?) returning id").get("流程测试") as { id: number };
  db.prepare("insert into project_settings (project_id) values (?)").run(project.id);
  return project.id;
}

describe("getProjectWorkflow", () => {
  it("points to Story Bible first for a new project", () => {
    const db = new Database(":memory:");
    runMigrations(db);
    const projectId = createProject(db);

    const workflow = getProjectWorkflow(db, projectId);

    expect(workflow.nextStep.key).toBe("story_bible");
    expect(workflow.nextStep.href).toBe("story-bible");
  });

  it("requires Style Bible before outline generation", () => {
    const db = new Database(":memory:");
    runMigrations(db);
    const projectId = createProject(db);
    db.prepare("insert into story_bibles (project_id, content_json, version) values (?, '{}', 1)").run(projectId);

    const workflow = getProjectWorkflow(db, projectId);

    expect(workflow.nextStep.key).toBe("style_bible");
    expect(workflow.stage).toBe("planning");
  });

  it("moves through outline, scene beats, draft, check and accept steps", () => {
    const db = new Database(":memory:");
    runMigrations(db);
    const projectId = createProject(db);
    db.prepare("insert into story_bibles (project_id, content_json, version) values (?, '{}', 1)").run(projectId);
    db.prepare("insert into style_bibles (project_id, content_json, style_fingerprint, version) values (?, '{}', 'fp', 1)").run(projectId);

    expect(getProjectWorkflow(db, projectId).nextStep.key).toBe("volume_outline");

    const volume = db.prepare("insert into volumes (project_id, volume_number, title, outline_json, status) values (?, 1, '第一卷', '{}', 'planned') returning id").get(projectId) as { id: number };
    expect(getProjectWorkflow(db, projectId).nextStep.key).toBe("arc_pack");

    const arc = db.prepare("insert into arc_packs (project_id, volume_id, start_chapter_number, end_chapter_number, outline_json, status) values (?, ?, 1, 5, '{}', 'planned') returning id").get(projectId, volume.id) as { id: number };
    expect(getProjectWorkflow(db, projectId).nextStep.key).toBe("chapter_outline");

    const chapter = db.prepare("insert into chapters (project_id, volume_id, arc_pack_id, chapter_number, title, outline_json, status) values (?, ?, ?, 1, '第一章', ?, 'planned') returning id")
      .get(projectId, volume.id, arc.id, JSON.stringify({ chapter_goal: "完成一次局部试探" })) as { id: number };
    expect(getProjectWorkflow(db, projectId).nextStep.key).toBe("scene_beats");

    db.prepare("update chapters set scene_beats_json = ? where id = ?").run(JSON.stringify([{ scene_number: 1 }]), chapter.id);
    expect(getProjectWorkflow(db, projectId).nextStep.key).toBe("draft_chapter");

    db.prepare("update chapters set draft_text = ?, status = 'drafted' where id = ?").run("正文", chapter.id);
    expect(getProjectWorkflow(db, projectId).nextStep.key).toBe("continuity_check");

    db.prepare("update chapters set status = 'checked' where id = ?").run(chapter.id);
    db.prepare("insert into continuity_reports (project_id, chapter_id, pass, issues_json) values (?, ?, 1, '[]')").run(projectId, chapter.id);
    expect(getProjectWorkflow(db, projectId).nextStep.key).toBe("accept_chapter");

    db.prepare("update chapters set final_text = ?, summary = ?, status = 'accepted' where id = ?").run("正文", "摘要", chapter.id);
    expect(getProjectWorkflow(db, projectId).nextStep.key).toBe("chapter_outline");
    expect(getProjectWorkflow(db, projectId).nextStep.chapterNumber).toBe(2);
  });
});
