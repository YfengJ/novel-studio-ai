"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { apiFetch } from "@/components/client/api";
import { JsonBlock, StatusLine } from "@/components/ui/Status";
import { WorkflowGuide } from "@/components/project/WorkflowGuide";

export function DashboardClient() {
  const params = useParams<{ projectId: string }>();
  const [data, setData] = useState<Record<string, any> | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    apiFetch<{ dashboard: Record<string, any> }>(`/api/projects/${params.projectId}`)
      .then((res) => setData(res.dashboard))
      .catch((err) => setError(err.message));
  }, [params.projectId]);

  if (!data) return <main className="p-6"><StatusLine loading={!error} error={error} /></main>;
  return (
    <main className="mx-auto max-w-7xl p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold">{data.project.title}</h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-ink/70">{data.project.premise}</p>
      </div>
      <div className="grid gap-4 md:grid-cols-4">
        <Metric label="类型" value={data.project.genre || "未设置"} />
        <Metric label="当前卷" value={data.currentVolume?.title ?? "未生成"} />
        <Metric label="当前章节" value={data.currentChapter ? `第 ${data.currentChapter.chapter_number} 章` : "未规划"} />
        <Metric label="已完成字数" value={String(data.completedWords ?? 0)} />
      </div>
      <div className="mt-6">
        <WorkflowGuide projectId={params.projectId} />
      </div>
      <div className="mt-6">
        <ReadinessPanel projectId={params.projectId} readiness={data.readiness ?? {}} workflow={data.workflow} />
      </div>
      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <section className="tool-panel p-4">
          <h2 className="font-semibold">主要角色</h2>
          <div className="mt-3 grid gap-2">
            {(data.mainCharacters ?? []).map((character: any) => (
              <div key={character.id} className="rounded border border-line px-3 py-2 text-sm">
                <span className="font-medium">{character.name}</span>
                <span className="ml-2 text-xs text-ink/55">{character.tier} · {character.role}</span>
              </div>
            ))}
          </div>
        </section>
        <section className="tool-panel p-4">
          <h2 className="font-semibold">最近三章</h2>
          <div className="mt-3 grid gap-2">
            {(data.recentChapters ?? []).map((chapter: any) => (
              <div key={chapter.id} className="rounded border border-line px-3 py-2 text-sm">
                <div className="font-medium">第 {chapter.chapter_number} 章 {chapter.title}</div>
                <p className="mt-1 text-ink/65">{chapter.summary || chapter.status}</p>
              </div>
            ))}
          </div>
        </section>
        <section className="tool-panel p-4">
          <h2 className="font-semibold">待处理一致性问题</h2>
          <div className="mt-3">
            {(data.issues ?? []).length ? <JsonBlock value={data.issues} /> : <p className="text-sm text-ink/60">暂无阻塞问题。</p>}
          </div>
        </section>
      </div>
    </main>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="tool-panel p-4">
      <div className="text-xs text-ink/55">{label}</div>
      <div className="mt-2 text-lg font-semibold">{value}</div>
    </div>
  );
}

function ReadinessPanel({ projectId, readiness, workflow }: { projectId: string; readiness: Record<string, any>; workflow?: Record<string, any> }) {
  const fallbackItems = [
    { label: "Story Bible", ready: readiness.storyBible, detail: "全书设定" },
    { label: "Style Bible", ready: readiness.styleBible, detail: "文风圣经" },
    { label: "卷大纲", ready: Number(readiness.volumes ?? 0) > 0, detail: `${Number(readiness.volumes ?? 0)} 个卷` },
    { label: "五章剧情包", ready: Number(readiness.arcPacks ?? 0) > 0, detail: `${Number(readiness.arcPacks ?? 0)} 个五章包` },
    { label: "章节细纲", ready: Number(readiness.chapters ?? 0) > 0, detail: `${Number(readiness.chapters ?? 0)} 个章节` },
    { label: "Scene Beats", ready: Number(readiness.chaptersWithSceneBeats ?? 0) > 0, detail: `${Number(readiness.chaptersWithSceneBeats ?? 0)} 章可写` },
    { label: "章节记忆", ready: Number(readiness.acceptedChapters ?? 0) > 0, detail: `${Number(readiness.acceptedChapters ?? 0)} 章已入库` }
  ];
  const items = Array.isArray(workflow?.checkpoints) ? workflow.checkpoints : fallbackItems;
  const next = workflow?.nextStep ?? { action: "继续写作", href: "outline", label: "继续写作", description: "按顺序补齐结构化上下文。" };
  const nextHref = next.href ? `/projects/${projectId}/${next.href}` : `/projects/${projectId}`;

  return (
    <section className="tool-panel p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-semibold">当前项目进度</h2>
          <p className="mt-1 text-sm leading-6 text-ink/65">{next.description}</p>
          <div className="mt-2 text-sm font-medium text-accent">下一步：{next.label}</div>
        </div>
        <Link className="rounded bg-accent px-3 py-2 text-sm font-medium text-white" href={nextHref}>
          {next.action}
        </Link>
      </div>
      <div className="mt-4 grid gap-2 md:grid-cols-4">
        {items.map((item: any) => (
          <div key={item.key ?? item.label} className={`rounded border px-3 py-2 text-sm ${item.ready ? "border-accent/30 bg-accent/5 text-accent" : "border-line bg-paper text-ink/60"}`}>
            <span className="font-medium">{item.ready ? "已就绪" : "待处理"}</span>
            <span className="ml-2">{item.label}</span>
            <div className="mt-1 text-xs opacity-70">{item.detail}</div>
          </div>
        ))}
      </div>
    </section>
  );
}
