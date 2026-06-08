import Database from "better-sqlite3";
import { describe, expect, it } from "vitest";
import { runMigrations } from "@/lib/db/database";
import { getChapterAcceptanceGate } from "./memoryService";

function createChapter(db: Database.Database) {
  const project = db.prepare("insert into projects (title) values (?) returning id").get("测试书") as { id: number };
  db.prepare("insert into project_settings (project_id) values (?)").run(project.id);
  const chapter = db
    .prepare("insert into chapters (project_id, chapter_number, title, draft_text, status) values (?, 1, ?, ?, 'drafted') returning id")
    .get(project.id, "第一章", "正文") as { id: number };
  return { projectId: project.id, chapterId: chapter.id };
}

describe("chapter acceptance gate", () => {
  it("blocks accepting a chapter before a continuity check exists", () => {
    const db = new Database(":memory:");
    runMigrations(db);
    const ids = createChapter(db);

    const gate = getChapterAcceptanceGate(db, ids.chapterId);

    expect(gate.canAccept).toBe(false);
    expect(gate.reason).toContain("一致性检查");
  });

  it("blocks accepting a chapter when the latest continuity report has high severity issues", () => {
    const db = new Database(":memory:");
    runMigrations(db);
    const ids = createChapter(db);
    db.prepare("update chapters set status = 'checked' where id = ?").run(ids.chapterId);
    db.prepare("insert into continuity_reports (project_id, chapter_id, pass, issues_json) values (?, ?, 0, ?)")
      .run(ids.projectId, ids.chapterId, JSON.stringify([{ severity: "high", type: "timeline_conflict" }]));

    const gate = getChapterAcceptanceGate(db, ids.chapterId);

    expect(gate.canAccept).toBe(false);
    expect(gate.reason).toContain("high");
  });

  it("blocks accepting a chapter when the latest continuity report did not pass", () => {
    const db = new Database(":memory:");
    runMigrations(db);
    const ids = createChapter(db);
    db.prepare("update chapters set status = 'checked' where id = ?").run(ids.chapterId);
    db.prepare("insert into continuity_reports (project_id, chapter_id, pass, issues_json) values (?, ?, 0, ?)")
      .run(ids.projectId, ids.chapterId, JSON.stringify([{ severity: "medium", type: "outline_deviation" }]));

    const gate = getChapterAcceptanceGate(db, ids.chapterId);

    expect(gate.canAccept).toBe(false);
    expect(gate.reason).toContain("未通过");
  });

  it("allows accepting when the latest continuity report passes without high severity issues", () => {
    const db = new Database(":memory:");
    runMigrations(db);
    const ids = createChapter(db);
    db.prepare("update chapters set status = 'checked' where id = ?").run(ids.chapterId);
    db.prepare("insert into continuity_reports (project_id, chapter_id, pass, issues_json) values (?, ?, 1, ?)")
      .run(ids.projectId, ids.chapterId, JSON.stringify([{ severity: "low", type: "style_drift" }]));

    const gate = getChapterAcceptanceGate(db, ids.chapterId);

    expect(gate.canAccept).toBe(true);
  });
});
