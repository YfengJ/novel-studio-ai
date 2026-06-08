import type { ContextPack } from "@/lib/context/contextPack";
import type { ContinuityReport } from "@/lib/ai/schemas";

function storyAllowsResurrection(contextPack: ContextPack) {
  const text = JSON.stringify(contextPack.storyBible);
  return /复活|亡者|死而复生|undead|resurrection/i.test(text);
}

function outlineRequiresResurrection(contextPack: ContextPack) {
  const text = `${JSON.stringify(contextPack.chapterOutline)} ${JSON.stringify(contextPack.sceneBeats)}`;
  return /复活|亡者归来|死而复生|undead|resurrection/i.test(text);
}

export function runHardRuleChecks(contextPack: ContextPack, draftText: string): ContinuityReport["issues"] {
  const issues: ContinuityReport["issues"] = [];
  const canUseDead = storyAllowsResurrection(contextPack) && outlineRequiresResurrection(contextPack);

  for (const state of contextPack.activeCharacterStates) {
    const alive = String(state.alive_status ?? "");
    const name = String(state.name ?? "");
    if (!name || alive !== "dead" || !draftText.includes(name) || canUseDead) continue;
    issues.push({
      severity: "critical",
      type: "dead_character_appears",
      description: `角色 ${name} 当前状态为 dead，但草稿中出现了可能的正常行动或出场。`,
      evidence: name,
      suggested_fix: "删除该角色正常行动，改为回忆/幻象/尸体线索，或在章节细纲与设定圣经中明确复活机制。"
    });
  }

  for (const forbidden of contextPack.forbiddenContradictions) {
    if (forbidden && draftText.includes(forbidden)) {
      issues.push({
        severity: "critical",
        type: "forbidden_contradiction",
        description: `草稿触碰 Story Bible 禁止违背事项：${forbidden}`,
        evidence: forbidden,
        suggested_fix: "按 Story Bible 最高优先级重写相关段落。"
      });
    }
  }

  return issues;
}

export function mergeContinuityReports(modelReport: ContinuityReport, hardIssues: ContinuityReport["issues"]): ContinuityReport {
  const issues = [...modelReport.issues, ...hardIssues];
  return {
    pass: issues.every((issue) => issue.severity !== "high" && issue.severity !== "critical") && modelReport.pass,
    issues
  };
}

