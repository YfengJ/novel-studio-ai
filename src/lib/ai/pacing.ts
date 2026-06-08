export type PacingWarning = {
  code: "volume_too_short" | "macro_event_overload" | "chapter_scope_overload" | "information_overload";
  severity: "low" | "medium" | "high";
  message: string;
};

export type PacingEvaluation = {
  passed: boolean;
  warnings: PacingWarning[];
};

export const LONG_SERIAL_PACING_RULES = `慢热连载节奏：
- 五章只解决一个局部问题，不得把卷级转折压缩进五章。
- 每一章只推进一个明确目标；最多揭示一个新信息点，最多造成一个小状态变化。
- 训练、调查、试探、误会、后果、复盘都要展开，不要用总结跳过过程。
- 五章包的 payoff 只能是局部收益，例如获得一次信任、掌握一个基础技巧、确认一条线索。
- 不要在同一个五章包内连续完成：加入核心组织、远征/边境任务、获得称号、高层破格提拔、击败大型敌对组织、力量体系突破、核心道具转移。
- 重大事件必须拆成铺垫、误判、行动、代价、余波，至少跨多个五章包推进。`;

const macroEventPatterns = [
  /加入暗部|加入核心组织|进入权力核心|破格|高层|三代火影|火影召见/,
  /边境任务|远征|前线|跨国|出村任务/,
  /称号|成名|扬名|名震|一战成名/,
  /歼灭|全歼|击杀.*集团|摧毁.*组织|攻入|决战/,
  /根部|团藏|别天神|夺眼|政变|灭族/,
  /写轮眼.*进化|万花筒|须佐|轮回眼|大筒木|晓组织/,
  /系统.*解锁|认知上限|力量体系突破|突破至|觉醒.*高阶/,
  /betray|betrayal|war|assassination|council|artifact|ancient temple/i
];

function stringify(value: unknown) {
  return JSON.stringify(value ?? "", null, 2);
}

function countArrayItems(value: unknown) {
  return Array.isArray(value) ? value.length : value ? 1 : 0;
}

export function evaluateVolumeOutlinePacing(outline: unknown): PacingEvaluation {
  const record = outline && typeof outline === "object" && !Array.isArray(outline) ? (outline as Record<string, unknown>) : {};
  const chaptersEstimate = Number(record.chapters_estimate ?? 0);
  const warnings: PacingWarning[] = [];

  if (chaptersEstimate > 0 && chaptersEstimate < 40) {
    warnings.push({
      code: "volume_too_short",
      severity: "high",
      message: `卷大纲 chapters_estimate=${chaptersEstimate} 太短，长篇连载的一卷建议至少 40 章，优先 60-120 章。`
    });
  }

  return { passed: !warnings.some((warning) => warning.severity === "high"), warnings };
}

export function evaluateArcPackPacing(arcPack: unknown): PacingEvaluation {
  const record = arcPack && typeof arcPack === "object" && !Array.isArray(arcPack) ? (arcPack as Record<string, unknown>) : {};
  const chapters = Array.isArray(record.chapters) ? (record.chapters as Array<Record<string, unknown>>) : [];
  const text = stringify(record);
  const warnings: PacingWarning[] = [];

  const macroHits = macroEventPatterns.filter((pattern) => pattern.test(text)).length;
  if (macroHits >= 4) {
    warnings.push({
      code: "macro_event_overload",
      severity: "high",
      message: `五章包包含 ${macroHits} 类宏观事件，节奏会像把几十章压成五章。请缩小为一个局部目标。`
    });
  }

  const overloadedChapters = chapters.filter((chapter) => countArrayItems(chapter.key_scenes) > 4 || countArrayItems(chapter.state_changes_expected) > 3);
  if (overloadedChapters.length >= 2) {
    warnings.push({
      code: "chapter_scope_overload",
      severity: "medium",
      message: "多章包含过多关键场景或状态变化，建议每章只处理一个主要动作和一个情绪转折。"
    });
  }

  const totalInformation = chapters.reduce((sum, chapter) => sum + countArrayItems(chapter.new_information), 0);
  if (totalInformation > 8) {
    warnings.push({
      code: "information_overload",
      severity: "medium",
      message: `五章包新信息点达到 ${totalInformation} 个，建议控制在 3-6 个。`
    });
  }

  return { passed: !warnings.some((warning) => warning.severity === "high"), warnings };
}

export function formatPacingWarnings(warnings: PacingWarning[]) {
  return warnings.map((warning) => `${warning.code}: ${warning.message}`).join("\n");
}
