import type { Db } from "@/lib/db/database";
import { parseJson } from "@/lib/db/json";

export type WorkflowStepKey =
  | "story_bible"
  | "style_bible"
  | "volume_outline"
  | "arc_pack"
  | "chapter_outline"
  | "scene_beats"
  | "draft_chapter"
  | "continuity_check"
  | "fix_continuity"
  | "accept_chapter"
  | "complete";

export type ProjectWorkflowStep = {
  key: WorkflowStepKey;
  label: string;
  action: string;
  href: string;
  description: string;
  chapterId?: number;
  chapterNumber?: number;
  volumeId?: number;
  arcPackId?: number;
};

export type ProjectWorkflow = {
  stage: "planning" | "outlining" | "drafting" | "memory" | "complete";
  nextStep: ProjectWorkflowStep;
  checkpoints: Array<{ key: string; label: string; ready: boolean; detail: string }>;
};

type ChapterRow = {
  id: number;
  chapter_number: number;
  title: string;
  outline_json: string;
  scene_beats_json: string;
  draft_text: string | null;
  final_text: string | null;
  status: string;
};

type ArcPackRow = {
  id: number;
  volume_id: number;
  start_chapter_number: number;
  end_chapter_number: number;
};

function step(input: ProjectWorkflowStep): ProjectWorkflowStep {
  return input;
}

function hasObjectJson(value: string | null | undefined) {
  const parsed = parseJson<Record<string, unknown>>(value, {});
  return Boolean(parsed && typeof parsed === "object" && !Array.isArray(parsed) && Object.keys(parsed).length > 0);
}

function hasArrayJson(value: string | null | undefined) {
  const parsed = parseJson<unknown[]>(value, []);
  return Array.isArray(parsed) && parsed.length > 0;
}

function latestContinuityGate(db: Db, chapterId: number) {
  const row = db
    .prepare("select pass, issues_json from continuity_reports where chapter_id = ? order by created_at desc, id desc limit 1")
    .get(chapterId) as { pass: number; issues_json: string } | undefined;
  if (!row) return { exists: false, pass: false, blocking: false };
  const issues = parseJson<Array<{ severity: string }>>(row.issues_json, []);
  return {
    exists: true,
    pass: Boolean(row.pass),
    blocking: issues.some((issue) => issue.severity === "high" || issue.severity === "critical")
  };
}

function firstMissingChapterNumber(arcPack: ArcPackRow, chapters: ChapterRow[]) {
  const existing = new Set(chapters.map((chapter) => Number(chapter.chapter_number)));
  for (let chapterNumber = arcPack.start_chapter_number; chapterNumber <= arcPack.end_chapter_number; chapterNumber += 1) {
    if (!existing.has(chapterNumber)) return chapterNumber;
  }
  return null;
}

export function getProjectWorkflow(db: Db, projectId: number): ProjectWorkflow {
  const storyBibleReady = Boolean(db.prepare("select id from story_bibles where project_id = ? limit 1").get(projectId));
  const styleBibleReady = Boolean(db.prepare("select id from style_bibles where project_id = ? limit 1").get(projectId));
  const volumes = db.prepare("select id, volume_number, title from volumes where project_id = ? order by volume_number").all(projectId) as Array<{ id: number; volume_number: number; title: string }>;
  const arcPacks = db
    .prepare("select id, volume_id, start_chapter_number, end_chapter_number from arc_packs where project_id = ? order by start_chapter_number")
    .all(projectId) as ArcPackRow[];
  const chapters = db
    .prepare("select id, chapter_number, title, outline_json, scene_beats_json, draft_text, final_text, status from chapters where project_id = ? order by chapter_number")
    .all(projectId) as ChapterRow[];
  const acceptedChapters = chapters.filter((chapter) => chapter.status === "accepted");
  const completedWords = Number((db.prepare("select coalesce(sum(word_count), 0) as words from chapters where project_id = ? and status = 'accepted'").get(projectId) as { words: number }).words);
  const project = db.prepare("select target_word_count from projects where id = ?").get(projectId) as { target_word_count: number } | undefined;
  const targetWords = Number(project?.target_word_count ?? 0);

  const checkpoints = [
    { key: "story_bible", label: "Story Bible", ready: storyBibleReady, detail: storyBibleReady ? "全书设定已存在" : "先固定世界观、主角、禁忌事实" },
    { key: "style_bible", label: "Style Bible", ready: styleBibleReady, detail: styleBibleReady ? "文风圣经已存在" : "再固定文风、节奏和禁用表达" },
    { key: "volume_outline", label: "卷大纲", ready: volumes.length > 0, detail: `${volumes.length} 个卷大纲` },
    { key: "arc_pack", label: "五章剧情包", ready: arcPacks.length > 0, detail: `${arcPacks.length} 个五章包` },
    { key: "chapter_outline", label: "章节细纲", ready: chapters.length > 0, detail: `${chapters.length} 个章节` },
    { key: "scene_beats", label: "Scene Beats", ready: chapters.some((chapter) => hasArrayJson(chapter.scene_beats_json)), detail: "正文前的场景节拍" },
    { key: "accepted_memory", label: "章节记忆", ready: acceptedChapters.length > 0, detail: `${acceptedChapters.length} 章已接受入库` }
  ];

  if (!storyBibleReady) {
    return {
      stage: "planning",
      checkpoints,
      nextStep: step({
        key: "story_bible",
        label: "生成 Story Bible",
        action: "去生成全书设定",
        href: "story-bible",
        description: "先把世界观、主角、力量体系、禁忌事实固定下来。"
      })
    };
  }

  if (!styleBibleReady) {
    return {
      stage: "planning",
      checkpoints,
      nextStep: step({
        key: "style_bible",
        label: "生成 Style Bible",
        action: "去生成文风圣经",
        href: "style-bible",
        description: "文风圣经会约束章节正文，避免越写越跑调。"
      })
    };
  }

  if (!volumes.length) {
    return {
      stage: "outlining",
      checkpoints,
      nextStep: step({
        key: "volume_outline",
        label: "生成卷大纲",
        action: "去大纲页生成卷大纲",
        href: "outline",
        description: "先生成一卷 60-120 章级别的慢热路线。"
      })
    };
  }

  const latestVolume = volumes.at(-1)!;
  if (!arcPacks.length) {
    return {
      stage: "outlining",
      checkpoints,
      nextStep: step({
        key: "arc_pack",
        label: "生成五章剧情包",
        action: "去生成五章包",
        href: "outline",
        description: "五章包只处理一个局部目标，用来控制连载节奏。",
        volumeId: latestVolume.id,
        chapterNumber: 1
      })
    };
  }

  const activeChapter = chapters.find((chapter) => chapter.status !== "accepted");
  if (activeChapter) {
    const chapterLabel = `第 ${activeChapter.chapter_number} 章`;
    if (!hasObjectJson(activeChapter.outline_json)) {
      return {
        stage: "outlining",
        checkpoints,
        nextStep: step({
          key: "chapter_outline",
          label: `补 ${chapterLabel}细纲`,
          action: "去生成章节细纲",
          href: "outline",
          description: "当前章节缺少可写的章节细纲。",
          chapterId: activeChapter.id,
          chapterNumber: activeChapter.chapter_number
        })
      };
    }
    if (!hasArrayJson(activeChapter.scene_beats_json)) {
      return {
        stage: "outlining",
        checkpoints,
        nextStep: step({
          key: "scene_beats",
          label: `生成 ${chapterLabel} Scene Beats`,
          action: "去生成场景节拍",
          href: "outline",
          description: "正文生成必须先有场景节拍，否则容易跳剧情或写散。",
          chapterId: activeChapter.id,
          chapterNumber: activeChapter.chapter_number
        })
      };
    }
    if (!activeChapter.draft_text?.trim() && !activeChapter.final_text?.trim()) {
      return {
        stage: "drafting",
        checkpoints,
        nextStep: step({
          key: "draft_chapter",
          label: `生成 ${chapterLabel}正文`,
          action: "去 Chapter Studio",
          href: "studio",
          description: "先查看 Context Pack，再生成正文草稿。",
          chapterId: activeChapter.id,
          chapterNumber: activeChapter.chapter_number
        })
      };
    }

    const gate = latestContinuityGate(db, activeChapter.id);
    if (!gate.exists || activeChapter.status !== "checked") {
      return {
        stage: "drafting",
        checkpoints,
        nextStep: step({
          key: "continuity_check",
          label: `检查 ${chapterLabel}`,
          action: "去做一致性检查",
          href: "studio",
          description: "接受章节前必须有一次通过的一致性检查；润色或手动改正文后需要重新检查。",
          chapterId: activeChapter.id,
          chapterNumber: activeChapter.chapter_number
        })
      };
    }
    if (!gate.pass || gate.blocking) {
      return {
        stage: "drafting",
        checkpoints,
        nextStep: step({
          key: "fix_continuity",
          label: `修复 ${chapterLabel}一致性问题`,
          action: "回到 Chapter Studio 修稿",
          href: "studio",
          description: "最新检查仍有阻塞问题，先修正文稿并重新检查。",
          chapterId: activeChapter.id,
          chapterNumber: activeChapter.chapter_number
        })
      };
    }
    return {
      stage: "memory",
      checkpoints,
      nextStep: step({
        key: "accept_chapter",
        label: `接受 ${chapterLabel}并入库`,
        action: "去接受章节",
        href: "studio",
        description: "接受后才会抽取摘要、角色状态、三元组、时间线和记忆块。",
        chapterId: activeChapter.id,
        chapterNumber: activeChapter.chapter_number
      })
    };
  }

  if (targetWords > 0 && completedWords >= targetWords) {
    return {
      stage: "complete",
      checkpoints,
      nextStep: step({
        key: "complete",
        label: "目标字数已达成",
        action: "导出全书",
        href: "",
        description: "已达到项目目标字数，可以导出全书 Markdown 或继续追加新卷。"
      })
    };
  }

  const latestArcPack = arcPacks.at(-1)!;
  const missingNumber = firstMissingChapterNumber(latestArcPack, chapters);
  if (missingNumber !== null) {
    return {
      stage: "outlining",
      checkpoints,
      nextStep: step({
        key: "chapter_outline",
        label: `生成第 ${missingNumber} 章细纲`,
        action: "去生成下一章细纲",
        href: "outline",
        description: "上一章已入库，继续生成当前五章包内的下一章。",
        chapterNumber: missingNumber,
        arcPackId: latestArcPack.id,
        volumeId: latestArcPack.volume_id
      })
    };
  }

  return {
    stage: "outlining",
    checkpoints,
    nextStep: step({
      key: "arc_pack",
      label: `生成第 ${latestArcPack.end_chapter_number + 1}-${latestArcPack.end_chapter_number + 5} 章五章包`,
      action: "去生成下一个五章包",
      href: "outline",
      description: "当前五章包已完成，先生成下一组局部剧情包再继续写。",
      chapterNumber: latestArcPack.end_chapter_number + 1,
      volumeId: latestArcPack.volume_id
    })
  };
}
