"use client";

import Link from "next/link";
import { ArrowRight, BookOpenCheck, CircleAlert, Database, FileText, Gauge, Route, Users } from "lucide-react";
import type { LucideIcon } from "lucide-react";
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
  const acceptedCount = Number(data.readiness?.acceptedChapters ?? 0);
  const targetWords = Number(data.project.target_word_count ?? 0);
  const completedWords = Number(data.completedWords ?? 0);
  const wordProgress = targetWords > 0 ? Math.min(100, Math.round((completedWords / targetWords) * 100)) : 0;
  return (
    <main className="mx-auto max-w-7xl p-4 sm:p-6">
      <section className="relative overflow-hidden rounded-lg border border-line bg-white shadow-soft">
        <div className="absolute inset-x-0 top-0 h-1 bg-[linear-gradient(90deg,#0f766e,#c0842d,#9a3412)]" />
        <div className="grid gap-6 p-5 lg:grid-cols-[1fr_340px] lg:p-6">
          <div>
            <div className="flex flex-wrap items-center gap-2 text-xs font-medium uppercase tracking-[0.18em] text-accent">
              <BookOpenCheck size={16} /> Novel Command Center
            </div>
            <h1 className="mt-3 text-3xl font-semibold leading-tight">{data.project.title}</h1>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-ink/68">{data.project.premise || "暂无项目种子设定。"}</p>
            <div className="mt-5 grid gap-3 sm:grid-cols-4">
              <Metric icon={FileText} label="类型" value={data.project.genre || "未设置"} />
              <Metric icon={Route} label="当前卷" value={data.currentVolume?.title ?? "未生成"} />
              <Metric icon={Gauge} label="当前章节" value={data.currentChapter ? `第 ${data.currentChapter.chapter_number} 章` : "未规划"} />
              <Metric icon={Database} label="已入库章节" value={`${acceptedCount} 章`} />
            </div>
          </div>
          <div className="rounded-lg border border-line bg-paper p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-xs text-ink/55">目标字数进度</div>
                <div className="mt-1 text-2xl font-semibold">{formatNumber(completedWords)}</div>
              </div>
              <div className="rounded-full border border-line bg-white px-3 py-1 text-sm font-medium text-accent">{wordProgress}%</div>
            </div>
            <div className="mt-4 h-2 overflow-hidden rounded-full bg-white">
              <div className="h-full rounded-full bg-accent" style={{ width: `${wordProgress}%` }} />
            </div>
            <div className="mt-2 text-xs leading-5 text-ink/55">
              目标 {targetWords ? formatNumber(targetWords) : "未设置"} 字。只有接受章节后才计入完成字数。
            </div>
          </div>
        </div>
      </section>
      <div className="mt-6">
        <ReadinessPanel projectId={params.projectId} readiness={data.readiness ?? {}} workflow={data.workflow} />
      </div>
      <div className="mt-6">
        <WorkflowGuide projectId={params.projectId} />
      </div>
      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <section className="tool-panel p-4">
          <div className="flex items-center gap-2">
            <Users size={18} className="text-accent" />
            <h2 className="font-semibold">主要角色</h2>
          </div>
          <div className="mt-3 grid gap-2">
            {(data.mainCharacters ?? []).map((character: any) => (
              <div key={character.id} className="rounded border border-line px-3 py-2 text-sm">
                <span className="font-medium">{character.name}</span>
                <span className="ml-2 text-xs text-ink/55">{character.tier} · {character.role}</span>
              </div>
            ))}
            {!(data.mainCharacters ?? []).length && <p className="text-sm text-ink/55">Story Bible 生成后会初始化主要角色。</p>}
          </div>
        </section>
        <section className="tool-panel p-4">
          <div className="flex items-center gap-2">
            <FileText size={18} className="text-accent" />
            <h2 className="font-semibold">最近三章</h2>
          </div>
          <div className="mt-3 grid gap-2">
            {(data.recentChapters ?? []).map((chapter: any) => (
              <div key={chapter.id} className="rounded border border-line px-3 py-2 text-sm">
                <div className="font-medium">第 {chapter.chapter_number} 章 {chapter.title}</div>
                <p className="mt-1 text-ink/65">{chapter.summary || chapter.status}</p>
              </div>
            ))}
            {!(data.recentChapters ?? []).length && <p className="text-sm text-ink/55">接受章节后，这里会显示最近三章摘要。</p>}
          </div>
        </section>
        <section className="tool-panel p-4">
          <div className="flex items-center gap-2">
            <CircleAlert size={18} className="text-ember" />
            <h2 className="font-semibold">待处理一致性问题</h2>
          </div>
          <div className="mt-3">
            {(data.issues ?? []).length ? <JsonBlock value={data.issues} /> : <p className="text-sm text-ink/60">暂无阻塞问题。</p>}
          </div>
        </section>
      </div>
    </main>
  );
}

function Metric({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: string }) {
  return (
    <div className="rounded border border-line bg-paper px-3 py-3">
      <div className="flex items-center gap-2 text-xs text-ink/55">
        <Icon size={15} className="text-accent" /> {label}
      </div>
      <div className="mt-2 truncate text-base font-semibold">{value}</div>
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
  const readyCount = items.filter((item: any) => item.ready).length;
  const progress = items.length ? Math.round((readyCount / items.length) * 100) : 0;
  const stageLabel: Record<string, string> = {
    planning: "设定阶段",
    outlining: "大纲阶段",
    drafting: "正文阶段",
    memory: "记忆入库阶段",
    complete: "完结或扩展阶段"
  };

  return (
    <section className="tool-panel overflow-hidden">
      <div className="grid gap-5 p-5 lg:grid-cols-[1fr_300px]">
        <div>
          <div className="text-xs font-medium uppercase tracking-[0.18em] text-ink/45">{stageLabel[String(workflow?.stage ?? "outlining")] ?? "创作流程"}</div>
          <h2 className="mt-2 text-xl font-semibold">下一步：{next.label}</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-ink/65">{next.description}</p>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <Link className="inline-flex items-center gap-2 rounded bg-accent px-4 py-2 text-sm font-medium text-white" href={nextHref}>
              {next.action} <ArrowRight size={16} />
            </Link>
            <span className="text-sm text-ink/55">{readyCount}/{items.length} 个检查点就绪</span>
          </div>
        </div>
        <div className="rounded-lg border border-line bg-paper p-4">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium">结构化上下文完整度</span>
            <span className="text-accent">{progress}%</span>
          </div>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-white">
            <div className="h-full rounded-full bg-accent" style={{ width: `${progress}%` }} />
          </div>
          <p className="mt-3 text-xs leading-5 text-ink/55">正文生成会读取已就绪的设定、大纲、角色状态、图谱和检索记忆。</p>
        </div>
      </div>
      <div className="border-t border-line bg-[#fbfcfa] px-5 py-4">
        <div className="grid gap-2 md:grid-cols-4 xl:grid-cols-7">
          {items.map((item: any, index: number) => (
            <div key={item.key ?? item.label} className={`rounded border px-3 py-3 text-sm ${item.ready ? "border-accent/30 bg-accent/5 text-accent" : "border-line bg-white text-ink/60"}`}>
              <div className="flex items-center justify-between gap-2">
                <span className="font-medium">{item.label}</span>
                <span className={`grid h-6 w-6 place-items-center rounded-full text-xs ${item.ready ? "bg-accent text-white" : "bg-paper text-ink/45"}`}>{index + 1}</span>
              </div>
              <div className="mt-2 text-xs opacity-75">{item.ready ? "已就绪" : "待处理"}</div>
              <div className="mt-1 text-xs leading-5 opacity-70">{item.detail}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("zh-CN").format(value);
}
