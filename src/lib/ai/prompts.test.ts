import { describe, expect, it } from "vitest";
import { arcPackPrompt, chapterOutlinePrompt } from "./prompts";

describe("outline prompts", () => {
  it("includes continuity context when generating an arc pack", () => {
    const prompt = arcPackPrompt({
      startChapterNumber: 6,
      endChapterNumber: 10,
      volumeOutline: { title: "暗流涌动" },
      continuityContext: {
        storyBible: { logline: "宇智波启阻止灭族" },
        styleBible: { narration_style: "轻松热血" },
        existingVolumes: [{ title: "暗流涌动" }],
        existingArcPacks: [{ start_chapter_number: 1, end_chapter_number: 5, mini_arc_goal: "结识止水" }],
        existingChapters: [{ chapter_number: 1, title: "满级替身术" }],
        characterStates: [{ name: "宇智波启", alive_status: "alive", location: "木叶" }],
        timelineEvents: [{ chapter_number: 1, title: "系统觉醒" }],
        graphFacts: [{ predicate: "knows", object_value: "未来不能泄露" }]
      }
    });

    expect(prompt).toContain("宇智波启阻止灭族");
    expect(prompt).toContain("结识止水");
    expect(prompt).toContain("未来不能泄露");
    expect(prompt).toContain("只能生成第 6-10 章");
    expect(prompt).toContain("慢热连载节奏");
    expect(prompt).toContain("五章只解决一个局部问题");
    expect(prompt).toContain("不得把卷级转折压缩进五章");
  });

  it("includes selected volume and arc pack when generating a chapter outline", () => {
    const prompt = chapterOutlinePrompt({
      chapterNumber: 2,
      volumeOutline: { title: "暗流涌动" },
      arcPack: { mini_arc_goal: "阻止别天神落入团藏之手" },
      continuityContext: {
        storyBible: { logline: "守护宇智波" },
        styleBible: { narration_style: "腹黑吐槽" },
        existingChapters: [{ chapter_number: 1, title: "系统觉醒" }],
        characterStates: [{ name: "止水", alive_status: "alive" }],
        graphFacts: [{ predicate: "does_not_know", object_value: "鼬不知道系统存在" }]
      }
    });

    expect(prompt).toContain("暗流涌动");
    expect(prompt).toContain("阻止别天神落入团藏之手");
    expect(prompt).toContain("鼬不知道系统存在");
    expect(prompt).toContain("不要用总结跳过过程");
  });
});
