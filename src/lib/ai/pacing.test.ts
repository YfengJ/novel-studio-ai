import { describe, expect, it } from "vitest";
import { evaluateArcPackPacing, evaluateVolumeOutlinePacing } from "./pacing";

describe("outline pacing guardrails", () => {
  it("flags five-chapter packs that compress volume-scale progression", () => {
    const result = evaluateArcPackPacing({
      mini_arc_goal: "主角觉醒系统并展示潜力，通过暗部选拔和边境任务证明自己，与卡卡西组队，踏入木叶权力漩涡。",
      escalation: "从个人觉醒到族内怀疑，再到高层考验，暗部任务中遭遇强敌，以战略级忍术扭转战局。",
      payoff: "在边境以满级火遁歼灭叛忍集团，获瞬火称号并被三代火影破格调入暗部直属，与卡卡西组队，发现根部监视，系统认知上限首次解锁。",
      transition_to_next_pack: "下一阶段与止水调查团藏，别天神计划浮出水面。",
      chapters: [
        { chapter_number: 1, title: "觉醒", plot_goal: "系统觉醒", conflict: "被族人怀疑", key_scenes: ["觉醒", "训练场暴露"], character_focus: ["主角"], new_information: ["系统"], foreshadowing: [], cliffhanger: "止水敲门", state_changes_expected: ["成为话题中心"] },
        { chapter_number: 2, title: "止水", plot_goal: "结识止水", conflict: "解释力量", key_scenes: ["谈话"], character_focus: ["止水"], new_information: ["和平理念"], foreshadowing: [], cliffhanger: "暗部邀请", state_changes_expected: [] },
        { chapter_number: 3, title: "暗部", plot_goal: "加入暗部", conflict: "选拔", key_scenes: ["暗部考试"], character_focus: ["卡卡西"], new_information: ["暗部"], foreshadowing: [], cliffhanger: "边境任务", state_changes_expected: ["加入暗部"] },
        { chapter_number: 4, title: "边境", plot_goal: "边境成名", conflict: "强敌", key_scenes: ["歼灭叛忍"], character_focus: ["卡卡西"], new_information: ["根部监视"], foreshadowing: [], cliffhanger: "三代召见", state_changes_expected: ["获得称号"] },
        { chapter_number: 5, title: "根部", plot_goal: "揭露根部", conflict: "权力斗争", key_scenes: ["系统解锁"], character_focus: ["团藏"], new_information: ["根部计划"], foreshadowing: [], cliffhanger: "别天神", state_changes_expected: ["进入权力核心"] }
      ]
    });

    expect(result.passed).toBe(false);
    expect(result.warnings.map((warning) => warning.code)).toContain("macro_event_overload");
  });

  it("allows a slow local five-chapter micro arc", () => {
    const result = evaluateArcPackPacing({
      mini_arc_goal: "主角隐藏系统异常，尝试在族地训练场找到不暴露的练习方式，并与止水建立第一次试探性的信任。",
      escalation: "从个人慌乱、一次小规模训练失误，到止水私下询问，冲突停留在族地内部。",
      payoff: "主角学会用普通解释掩饰满级替身术，暂时稳住族人怀疑，并约定下次与止水切磋。",
      transition_to_next_pack: "止水开始观察主角，主角准备继续学习基础三身术。",
      chapters: [
        { chapter_number: 1, title: "醒来", plot_goal: "确认处境", conflict: "不能暴露未来", key_scenes: ["醒来", "系统规则"], character_focus: ["主角"], new_information: ["系统限制"], foreshadowing: [], cliffhanger: "训练场传来喊声", state_changes_expected: ["主角立下短期目标"] },
        { chapter_number: 2, title: "替身", plot_goal: "测试替身术", conflict: "满级动作太显眼", key_scenes: ["训练场"], character_focus: ["主角"], new_information: [], foreshadowing: [], cliffhanger: "有人注意到他", state_changes_expected: [] },
        { chapter_number: 3, title: "问话", plot_goal: "解释异常", conflict: "族人怀疑", key_scenes: ["集会所问话"], character_focus: ["族人"], new_information: [], foreshadowing: [], cliffhanger: "止水出现", state_changes_expected: [] },
        { chapter_number: 4, title: "止水", plot_goal: "初次试探", conflict: "彼此不完全信任", key_scenes: ["短谈"], character_focus: ["止水"], new_information: ["止水重视和平"], foreshadowing: [], cliffhanger: "约定切磋", state_changes_expected: [] },
        { chapter_number: 5, title: "藏锋", plot_goal: "制定低调练习法", conflict: "能力强但查克拉少", key_scenes: ["夜间规划"], character_focus: ["主角"], new_information: [], foreshadowing: [], cliffhanger: "下一门基础术", state_changes_expected: [] }
      ]
    });

    expect(result.passed).toBe(true);
  });

  it("flags volume outlines with too few chapters for long serialization", () => {
    const result = evaluateVolumeOutlinePacing({ title: "第一卷", chapters_estimate: 12 });

    expect(result.passed).toBe(false);
    expect(result.warnings[0].code).toBe("volume_too_short");
  });
});
