import { describe, expect, it } from "vitest";
import { ArcPackSchema, ContinuityReportSchema, MemoryExtractionSchema, ProjectIdeaSchema } from "./schemas";

describe("AI schemas", () => {
  it("expresses dead character conflicts as high severity continuity issues", () => {
    const parsed = ContinuityReportSchema.parse({
      pass: false,
      issues: [
        {
          severity: "high",
          type: "dead_character_appears",
          description: "已死亡角色正常行动",
          evidence: "亡者提剑走入殿中",
          suggested_fix: "改为回忆、幻象或删除行动"
        }
      ]
    });

    expect(parsed.issues[0]?.type).toBe("dead_character_appears");
  });

  it("validates memory extraction output", () => {
    const parsed = MemoryExtractionSchema.parse({
      chapter_summary: "主角进入天灯坊，得到第一枚残片。",
      scene_summaries: [
        {
          scene_number: 1,
          summary: "主角遇见铸灯老人。",
          location: "天灯坊",
          involved_character_names: ["林澈"],
          emotional_turn: "疑惧转为决心",
          plot_function: "开启主线",
          evidence_text: "老人把残片推到他面前。",
          confidence: 0.9
        }
      ],
      new_characters: [],
      character_state_updates: [],
      new_entities: [],
      relation_triples: [],
      timeline_events: [],
      foreshadowing_added: [],
      foreshadowing_resolved: [],
      new_rules_or_lore: [],
      style_samples: ["雨声敲在青瓦上，像天幕深处断裂的回音。"]
    });

    expect(parsed.chapter_summary).toContain("残片");
  });

  it("normalizes loose project ideation JSON from compatible providers", () => {
    const parsed = ProjectIdeaSchema.parse({
      title: "霜灯问骨",
      genre: "玄幻",
      premise: "少年在雪夜捡到一盏会说话的骨灯。",
      target_word_count: 600000,
      tone: "冷峻、悬疑、热血",
      protagonist: {
        name: "沈照夜",
        description: "边城灯匠之子",
        goal: "查清母亲失踪真相"
      },
      main_characters: [
        { name: "闻青" },
        "白鹿书院的叛逃女先生",
        { name: "陆沉", role: "反派" }
      ],
      world_setup: {
        power: "灯火照骨，骨相显命",
        taboo: "死人之灯不可点第二次"
      },
      core_hooks: "骨灯、失踪母亲、边城雪夜",
      style_keywords: "冷峻, 悬疑, 东方幻想",
      project_seed: "少年沈照夜在边城雪夜捡到骨灯，卷入白鹿书院与死人灯禁术的争夺。"
    });

    expect(parsed.main_characters[0]).toEqual({ name: "闻青", role: "", hook: "" });
    expect(parsed.main_characters[1]?.name).toContain("白鹿书院");
    expect(parsed.world_setup).toContain("灯火照骨，骨相显命");
    expect(parsed.style_keywords).toEqual(["冷峻", "悬疑", "东方幻想"]);
  });

  it("normalizes loose arc pack chapter arrays from compatible providers", () => {
    const parsed = ArcPackSchema.parse({
      mini_arc_goal: "让主角离村并第一次接触忍界权力结构",
      escalation: "从族内边缘人到被暗部注意",
      payoff: "主角用满级忍术救下关键角色",
      transition_to_next_pack: "木叶高层开始调查系统异常",
      chapters: [
        {
          chapter_number: 1,
          title: "满级的第一道火遁",
          plot_goal: "主角发现系统",
          conflict: "查克拉低下与族内轻视",
          key_scenes: ["训练场失败", "系统觉醒"],
          character_focus: "宇智波启、宇智波止水",
          new_information: "系统会自动补全忍术理解",
          foreshadowing: "系统界面出现斑的旧徽记",
          cliffhanger: "火遁在雨夜失控",
          state_changes_expected: "主角从自卑转向谨慎兴奋"
        }
      ]
    });

    expect(parsed.chapters[0]?.character_focus).toEqual(["宇智波启", "宇智波止水"]);
    expect(parsed.chapters[0]?.new_information).toEqual(["系统会自动补全忍术理解"]);
    expect(parsed.chapters[0]?.state_changes_expected).toEqual(["主角从自卑转向谨慎兴奋"]);
  });
});
