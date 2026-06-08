import { getDb } from "../src/lib/db/database";
import { createProject } from "../src/lib/db/repositories";

const db = getDb();

const existing = db.prepare("select id from projects where title = ?").get("天灯纪") as { id: number } | undefined;
if (existing) {
  console.log(`Seed project already exists: ${existing.id}`);
  process.exit(0);
}

const project = createProject(db, {
  title: "天灯纪",
  genre: "东方玄幻 / 长篇连载",
  premise: "少年林澈在破败灯坊中发现能修补天幕裂痕的古灯残片，被卷入宗门、王朝与天外灾厄的争夺。",
  target_word_count: 800000,
  pov: "第三人称有限视角",
  tone: "热血、克制、带悬疑感"
});

db.prepare("insert into story_bibles (project_id, content_json, version) values (?, ?, 1)").run(
  project.id,
  JSON.stringify({
    logline: "灯坊少年以残灯补天，揭开天外裂痕与人间王朝的千年谎言。",
    core_promise: "升级、探秘、团队羁绊、伏笔回收、世界观层层展开。",
    world_rules: ["天幕裂痕会引发灵潮失序", "灯师能以命火炼器，但命火不可凭空复原"],
    power_system: { levels: ["引火", "凝焰", "铸灯", "照墟", "补天"], cost: "命火消耗与记忆残缺" },
    factions: [{ name: "玄灯司", goal: "垄断补天法" }, { name: "北阙王朝", goal: "维系天幕谎言" }],
    locations: [{ name: "天灯坊", description: "旧城尽头的破败灯坊" }],
    protagonist: { name: "林澈", tier: "S", goal: "修补天幕并查清父亲失踪真相" },
    main_cast: [{ name: "沈微霜", tier: "A", role: "剑修盟友" }],
    antagonist_forces: [{ name: "无昼会", method: "诱发裂痕" }],
    major_conflicts: ["补天与揭露真相之间的选择", "命火代价与力量成长的冲突"],
    forbidden_contradictions: ["命火不可无代价复原", "天幕裂痕不能被低阶术法直接修复"],
    terminology: { 命火: "灯师的生命与记忆之焰", 天灯: "可照见裂痕的古器" }
  })
);

db.prepare("insert into style_bibles (project_id, content_json, style_fingerprint, version) values (?, ?, ?, 1)").run(
  project.id,
  JSON.stringify({
    narration_style: "第三人称有限视角，贴近主角感知，克制但有画面感。",
    sentence_rhythm: "短句推进动作，中长句承接情绪和世界观信息。",
    emotional_texture: "热血中带压抑，悬疑中保留温度。",
    imagery: ["灯火", "雨声", "裂纹", "青铜", "旧城"],
    dialogue_style: "少解释，多用试探、留白和角色习惯表达立场。",
    pacing_rules: ["每章至少一次信息推进", "结尾保留具体钩子"],
    forbidden_style: ["网络梗", "现代口语过重", "大段设定讲解"],
    sample_paragraphs: ["雨声敲在青瓦上，像天幕深处传来的碎裂回音。林澈抬头时，灯坊最后一盏青灯忽然亮了。"],
    style_fingerprint: "克制玄幻、灯火意象、悬疑推进、热血底色"
  }),
  "克制玄幻、灯火意象、悬疑推进、热血底色"
);

const volume = db
  .prepare("insert into volumes (project_id, volume_number, title, outline_json, status) values (?, 1, ?, ?, 'planned') returning id")
  .get(
    project.id,
    "第一卷：残灯照雨",
    JSON.stringify({
      title: "第一卷：残灯照雨",
      promise: "主角获得残灯，发现父亲失踪与天幕裂痕有关。",
      chapters_estimate: 20
    })
  ) as { id: number };

const arc = db
  .prepare(
    "insert into arc_packs (project_id, volume_id, start_chapter_number, end_chapter_number, outline_json, status) values (?, ?, 1, 5, ?, 'planned') returning id"
  )
  .get(
    project.id,
    volume.id,
    JSON.stringify({
      mini_arc_goal: "让林澈得到残灯并第一次看见天幕裂痕。",
      chapters: [
        { chapter_number: 1, title: "雨夜残灯", plot_goal: "发现残灯", conflict: "玄灯司追查旧坊", key_scenes: ["灯坊雨夜", "残灯苏醒"] }
      ]
    })
  ) as { id: number };

db.prepare(
  "insert into chapters (project_id, volume_id, arc_pack_id, chapter_number, title, outline_json, scene_beats_json, status) values (?, ?, ?, 1, ?, ?, ?, 'planned')"
).run(
  project.id,
  volume.id,
  arc.id,
  "雨夜残灯",
  JSON.stringify({
    chapter_goal: "林澈在雨夜发现父亲留下的残灯。",
    pov: "林澈",
    ending_hook: "残灯映出天幕第一道裂纹。"
  }),
  JSON.stringify([
    {
      scene_number: 1,
      summary: "林澈守着破败灯坊，玄灯司的人逼问父亲去向。",
      location: "天灯坊",
      pov: "林澈",
      involved_character_names: ["林澈"]
    }
  ])
);

const lin = db
  .prepare("insert into characters (project_id, name, tier, role, first_chapter, last_seen_chapter, description, personality_json, tags_json) values (?, ?, 'S', ?, 1, 1, ?, ?, ?) returning id")
  .get(project.id, "林澈", "主角", "旧灯坊少年，执拗、重情、擅长修灯。", JSON.stringify(["执拗", "克制", "重情"]), JSON.stringify(["灯师"])) as { id: number };

db.prepare(
  "insert into character_states (project_id, character_id, chapter_number, alive_status, location, physical_state, emotional_state, current_goal, faction, relationship_to_protagonist, source_chapter) values (?, ?, 1, 'alive', ?, ?, ?, ?, ?, ?, 1)"
).run(project.id, lin.id, "天灯坊", "疲惫但无伤", "戒备", "守住父亲留下的灯坊", "无", "本人");

console.log(`Seeded project ${project.id}: 天灯纪`);

