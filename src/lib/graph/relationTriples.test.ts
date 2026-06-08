import Database from "better-sqlite3";
import { describe, expect, it } from "vitest";
import { runMigrations } from "@/lib/db/database";
import { getValidRelationTriples } from "./relationTriples";

describe("getValidRelationTriples", () => {
  it("returns only triples valid for the target chapter", () => {
    const db = new Database(":memory:");
    runMigrations(db);
    const project = db.prepare("insert into projects (title) values (?) returning id").get("测试书") as { id: number };
    db.prepare(
      "insert into relation_triples (project_id, subject_type, predicate, object_type, object_value, valid_from_chapter, valid_to_chapter, confidence, importance) values (?, 'character', ?, 'entity', ?, 1, 3, 0.9, 'high')"
    ).run(project.id, "possesses", "青铜灯");
    db.prepare(
      "insert into relation_triples (project_id, subject_type, predicate, object_type, object_value, valid_from_chapter, valid_to_chapter, confidence, importance) values (?, 'character', ?, 'entity', ?, 4, null, 0.9, 'high')"
    ).run(project.id, "possesses", "碎星剑");

    const chapter2 = getValidRelationTriples(db, project.id, 2);
    const chapter5 = getValidRelationTriples(db, project.id, 5);

    expect(chapter2.map((triple) => triple.object_value)).toEqual(["青铜灯"]);
    expect(chapter5.map((triple) => triple.object_value)).toEqual(["碎星剑"]);
  });
});

