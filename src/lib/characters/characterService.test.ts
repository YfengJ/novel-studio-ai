import Database from "better-sqlite3";
import { describe, expect, it } from "vitest";
import { runMigrations } from "@/lib/db/database";
import { promoteCharacterIfNeeded, seedCharactersFromStoryBible } from "./characterService";

describe("promoteCharacterIfNeeded", () => {
  it("promotes repeated or plot-relevant minor characters", () => {
    const db = new Database(":memory:");
    runMigrations(db);
    const project = db.prepare("insert into projects (title) values (?) returning id").get("测试书") as { id: number };
    const character = db
      .prepare("insert into characters (project_id, name, tier, last_seen_chapter, description, is_active) values (?, ?, 'D', 1, ?, 1) returning id")
      .get(project.id, "卖灯少年", "递出线索的少年") as { id: number };

    const promoted = promoteCharacterIfNeeded(db, {
      projectId: project.id,
      characterId: character.id,
      mentionCount: 3,
      plotRelevant: true,
      chapterNumber: 2
    });

    expect(promoted.tier).toBe("B");
  });
});

describe("seedCharactersFromStoryBible", () => {
  it("creates protagonist and main cast with initial states", () => {
    const db = new Database(":memory:");
    runMigrations(db);
    const project = db.prepare("insert into projects (title) values (?) returning id").get("测试书") as { id: number };

    seedCharactersFromStoryBible(db, project.id, {
      protagonist: { name: "宇智波启", description: "穿越者" },
      main_cast: [
        { name: "宇智波止水", role: "挚友" },
        { name: "宇智波鼬", role: "宿命队友" }
      ]
    });

    const characters = db.prepare("select name, tier from characters where project_id = ? order by tier desc, name").all(project.id) as Array<{ name: string; tier: string }>;
    const states = db.prepare("select count(*) as count from character_states where project_id = ? and chapter_number = 0").get(project.id) as { count: number };

    expect(characters).toContainEqual({ name: "宇智波启", tier: "S" });
    expect(characters).toContainEqual({ name: "宇智波止水", tier: "A" });
    expect(states.count).toBe(3);
  });
});
