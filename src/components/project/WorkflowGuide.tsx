"use client";

import Link from "next/link";

const steps = [
  {
    title: "1. 先定总设定",
    body: "在 Story Bible 生成全书设定，再到 Style Bible 生成文风规则。这里决定世界观、禁忌、人物基调和文风。",
    href: "story-bible",
    action: "去 Story Bible"
  },
  {
    title: "2. 再拆大纲",
    body: "在大纲页依次生成卷大纲、五章剧情包、章节细纲、场景节拍。五章包只处理一个局部目标，用来防止剧情推进过快。",
    href: "outline",
    action: "去大纲"
  },
  {
    title: "3. 写正文",
    body: "到 Chapter Studio 选择章节，先查看 Context Pack，再生成正文草稿。润色或手动改稿后，需要重新做一致性检查。",
    href: "studio",
    action: "去 Chapter Studio"
  },
  {
    title: "4. 接受章节",
    body: "只有最新一致性检查通过后才能接受章节。接受后系统会抽取摘要、角色状态、图谱事实和记忆片段。",
    href: "memory",
    action: "看记忆"
  }
];

export function WorkflowGuide({ projectId, compact = false }: { projectId: string; compact?: boolean }) {
  return (
    <section className="rounded border border-line bg-white p-4">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 className="font-semibold">写作路线</h2>
          <p className="mt-1 text-sm leading-6 text-ink/65">这个系统不是聊天框，它按“规划 → 写作 → 检查 → 入库 → 复用记忆”的流水线工作。</p>
        </div>
      </div>
      <div className={`mt-4 grid gap-3 ${compact ? "md:grid-cols-2" : "lg:grid-cols-4"}`}>
        {steps.map((step) => (
          <div key={step.title} className="rounded border border-line bg-paper p-3">
            <h3 className="text-sm font-semibold">{step.title}</h3>
            <p className="mt-2 text-sm leading-6 text-ink/70">{step.body}</p>
            <Link className="mt-3 inline-flex text-sm font-medium text-accent hover:underline" href={`/projects/${projectId}/${step.href}`}>
              {step.action}
            </Link>
          </div>
        ))}
      </div>
      <div className="mt-4 rounded border border-line bg-paper p-3">
        <h3 className="text-sm font-semibold">角色状态和事实怎么同步</h3>
        <p className="mt-2 text-sm leading-6 text-ink/70">
          草稿不会直接改数据库。只有点击“接受章节”后，系统才会抽取章节摘要、角色状态变化、三元组事实、时间线事件和记忆片段并入库。下一章生成前，Context Pack 会重新读取最新角色状态、有效三元组、最近三章摘要、上一章结尾和检索记忆。
        </p>
      </div>
    </section>
  );
}
