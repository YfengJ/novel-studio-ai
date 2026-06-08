import Database from "better-sqlite3";
import { describe, expect, it } from "vitest";
import { runMigrations } from "@/lib/db/database";
import { buildContextPack } from "./contextPack";

describe("buildContextPack", () => {
  it("includes summaries from the latest three accepted chapters", async () => {
    const db = new Database(":memory:");
    runMigrations(db);
    const project = db
      .prepare("insert into projects (title, genre, premise, target_word_count, pov, tone) values (?, ?, ?, ?, ?, ?) returning id")
      .get("天灯纪", "玄幻", "少年修补碎裂天幕", 800000, "第三人称", "热血克制") as { id: number };
    db.prepare("insert into project_settings (project_id) values (?)").run(project.id);
    db.prepare("insert into story_bibles (project_id, content_json, version) values (?, ?, 1)").run(project.id, JSON.stringify({ forbidden_contradictions: [] }));
    db.prepare("insert into style_bibles (project_id, content_json, style_fingerprint, version) values (?, ?, ?, 1)").run(project.id, JSON.stringify({}), "plain");
    const volume = db.prepare("insert into volumes (project_id, volume_number, title, outline_json, status) values (?, 1, ?, ?, 'planned') returning id").get(project.id, "第一卷", "{}") as { id: number };
    const arc = db.prepare("insert into arc_packs (project_id, volume_id, start_chapter_number, end_chapter_number, outline_json, status) values (?, ?, 1, 5, ?, 'planned') returning id").get(project.id, volume.id, "{}") as { id: number };
    const insertChapter = db.prepare("insert into chapters (project_id, volume_id, arc_pack_id, chapter_number, title, outline_json, final_text, summary, status, word_count) values (?, ?, ?, ?, ?, ?, ?, ?, 'accepted', 100)");
    insertChapter.run(project.id, volume.id, arc.id, 1, "第一章", "{}", "一章正文", "摘要一");
    insertChapter.run(project.id, volume.id, arc.id, 2, "第二章", "{}", "二章正文", "摘要二");
    insertChapter.run(project.id, volume.id, arc.id, 3, "第三章", "{}", "三章正文", "摘要三");
    insertChapter.run(project.id, volume.id, arc.id, 4, "第四章", "{}", "四章正文最后一段", "摘要四");
    const current = db.prepare("insert into chapters (project_id, volume_id, arc_pack_id, chapter_number, title, outline_json, status) values (?, ?, ?, 5, ?, ?, 'planned') returning id").get(project.id, volume.id, arc.id, "第五章", "{}") as { id: number };

    const pack = await buildContextPack(db, project.id, current.id);

    expect(pack.lastThreeSummaries.map((item) => item.summary)).toEqual(["摘要二", "摘要三", "摘要四"]);
    expect(pack.previousChapterEndingExcerpt).toContain("四章正文");
  });

  it("prioritizes current scene character states in the context pack", async () => {
    const db = new Database(":memory:");
    runMigrations(db);
    const project = db
      .prepare("insert into projects (title, genre, premise, target_word_count, pov, tone) values (?, ?, ?, ?, ?, ?) returning id")
      .get("天灯纪", "玄幻", "少年修补碎裂天幕", 800000, "第三人称", "热血克制") as { id: number };
    db.prepare("insert into project_settings (project_id) values (?)").run(project.id);
    db.prepare("insert into story_bibles (project_id, content_json, version) values (?, ?, 1)").run(project.id, JSON.stringify({ forbidden_contradictions: [] }));
    db.prepare("insert into style_bibles (project_id, content_json, style_fingerprint, version) values (?, ?, ?, 1)").run(project.id, JSON.stringify({}), "plain");
    const volume = db.prepare("insert into volumes (project_id, volume_number, title, outline_json, status) values (?, 1, ?, ?, 'planned') returning id").get(project.id, "第一卷", "{}") as { id: number };
    const arc = db.prepare("insert into arc_packs (project_id, volume_id, start_chapter_number, end_chapter_number, outline_json, status) values (?, ?, 1, 5, ?, 'planned') returning id").get(project.id, volume.id, "{}") as { id: number };
    const protagonist = db.prepare("insert into characters (project_id, name, tier, role) values (?, ?, 'S', '主角') returning id").get(project.id, "林澈") as { id: number };
    const mentor = db.prepare("insert into characters (project_id, name, tier, role) values (?, ?, 'B', '师父') returning id").get(project.id, "顾灯") as { id: number };
    db.prepare("insert into character_states (project_id, character_id, chapter_number, alive_status, location, current_goal, source_chapter) values (?, ?, 4, 'alive', '破灯坊', '寻找碎片', 4)").run(project.id, protagonist.id);
    db.prepare("insert into character_states (project_id, character_id, chapter_number, alive_status, location, current_goal, source_chapter) values (?, ?, 4, 'sealed', '旧祠堂', '守住禁术', 4)").run(project.id, mentor.id);
    const outline = { scene_list: [{ scene_number: 1, involved_character_names: ["林澈"], pov: "林澈" }] };
    const beats = [{ scene_number: 1, involved_character_names: ["林澈"], pov: "林澈", summary: "林澈进入灯坊" }];
    const current = db
      .prepare("insert into chapters (project_id, volume_id, arc_pack_id, chapter_number, title, outline_json, scene_beats_json, status) values (?, ?, ?, 5, ?, ?, ?, 'planned') returning id")
      .get(project.id, volume.id, arc.id, "第五章", JSON.stringify(outline), JSON.stringify(beats)) as { id: number };

    const pack = await buildContextPack(db, project.id, current.id);

    expect(pack.activeCharacterNames).toContain("林澈");
    expect(pack.activeCharacterStates.map((state) => state.name)).toEqual(["林澈"]);
  });
});
