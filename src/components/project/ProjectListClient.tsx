"use client";

import Link from "next/link";
import { ArrowRight, BookMarked, Database, Download, FileSearch, Layers3, Plus, ShieldCheck, Sparkles, Trash2 } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { apiFetch } from "@/components/client/api";
import { runTrackedOperation } from "@/components/client/operationStore";
import { StatusLine } from "@/components/ui/Status";

type Project = {
  id: number;
  title: string;
  genre: string;
  premise: string;
  target_word_count: number;
  pov: string;
  tone: string;
};

export function ProjectListClient() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [form, setForm] = useState({ title: "", genre: "", premise: "", target_word_count: 800000, pov: "第三人称有限视角", tone: "" });
  const [ideaBrief, setIdeaBrief] = useState("");
  const [idea, setIdea] = useState<Record<string, any> | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function load() {
    setError("");
    const data = await apiFetch<{ projects: Project[] }>("/api/projects");
    setProjects(data.projects);
  }

  useEffect(() => {
    load().catch((err) => setError(err.message));
  }, []);

  async function createProject() {
    setLoading(true);
    setError("");
    try {
      await apiFetch("/api/projects", { method: "POST", body: JSON.stringify(form) });
      setForm({ ...form, title: "", premise: "" });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  async function ideateProject() {
    const brief = ideaBrief.trim() || form.premise.trim();
    if (!brief) {
      setError("请先写几句 AI 构思提示词，比如类型、主角、世界观、金手指、爽点或禁忌。");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const data = await runTrackedOperation(
        {
          title: "AI 构思项目",
          detail: "生成标题、主角、世界观、角色和项目种子",
          successMessage: "构思完成，已填入创建表单"
        },
        () =>
          apiFetch<{ idea: Record<string, any> }>("/api/projects/ideate", {
            method: "POST",
            body: JSON.stringify({
              brief,
              preferredGenre: form.genre,
              targetWordCount: form.target_word_count
            })
          })
      );
      setIdea(data.idea);
      setForm({
        title: String(data.idea.title ?? form.title),
        genre: String(data.idea.genre ?? form.genre),
        premise: String(data.idea.project_seed ?? data.idea.premise ?? form.premise),
        target_word_count: Number(data.idea.target_word_count ?? form.target_word_count),
        pov: String(data.idea.pov ?? form.pov),
        tone: String(data.idea.tone ?? form.tone)
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  async function remove(projectId: number) {
    setLoading(true);
    setError("");
    try {
      await apiFetch(`/api/projects/${projectId}`, { method: "DELETE" });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen px-4 py-6 sm:px-6 lg:py-8">
      <div className="mx-auto max-w-7xl">
        <section className="relative overflow-hidden rounded-lg border border-line bg-ink text-white shadow-soft">
          <div className="absolute inset-x-0 top-0 h-1 bg-[linear-gradient(90deg,#0f766e,#c0842d,#9a3412)]" />
          <div className="grid gap-8 p-6 lg:grid-cols-[1fr_360px] lg:p-8">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-white/[0.15] bg-white/[0.08] px-3 py-1 text-xs font-medium text-white/75">
                <ShieldCheck size={14} /> Local-first · API key 不入库
              </div>
              <h1 className="mt-5 max-w-3xl text-3xl font-semibold leading-tight sm:text-4xl">
                AI 长篇小说创作工作台
              </h1>
              <p className="mt-4 max-w-2xl text-sm leading-7 text-white/72">
                从一个模糊想法开始，逐步生成设定圣经、文风圣经、卷大纲、五章剧情包、章节细纲、Context Pack 和正文。每章接受后再抽取记忆，下一章自动复用。
              </p>
              <div className="mt-6 grid gap-3 sm:grid-cols-3">
                <HeroFact icon={BookMarked} label="设定先行" body="Story / Style Bible 固定世界与文风" />
                <HeroFact icon={Layers3} label="分层大纲" body="卷、五章包、章节、场景节拍逐层拆解" />
                <HeroFact icon={Database} label="确认后入库" body="角色状态、图谱事实和记忆只在接受章节后写入" />
              </div>
            </div>
            <div className="rounded-lg border border-white/[0.12] bg-white/[0.08] p-4">
              <div className="text-sm font-semibold text-white">第一次使用顺序</div>
              <ol className="mt-4 grid gap-3 text-sm text-white/76">
                <li className="flex gap-3"><span className="step-dot">1</span><span>先写提示词，点 AI 构思并填入。</span></li>
                <li className="flex gap-3"><span className="step-dot">2</span><span>创建项目后进入 Dashboard，看系统给出的下一步。</span></li>
                <li className="flex gap-3"><span className="step-dot">3</span><span>生成 Story Bible、Style Bible，再拆大纲。</span></li>
                <li className="flex gap-3"><span className="step-dot">4</span><span>到 Chapter Studio 按 Context Pack、正文、检查、接受章节循环写下去。</span></li>
              </ol>
            </div>
          </div>
        </section>

        <div className="mt-6 grid gap-6 lg:grid-cols-[420px_1fr]">
          <section className="tool-panel p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-xl font-semibold">创建新小说</h2>
                <p className="mt-1 text-sm leading-6 text-ink/62">可以先让 AI 根据你的提示构思，再手动改成你想要的版本。</p>
              </div>
              <Sparkles className="text-accent" size={22} />
            </div>
            <div className="mt-5 grid gap-3">
            <label className="grid gap-1 text-sm font-medium text-ink">
              <span>AI 构思提示词</span>
              <textarea
                className="focus-ring min-h-24 rounded border border-line px-3 py-2 font-normal"
                placeholder="先写你的想法再点 AI 构思：如废土修仙、女主机械师、失忆神明、黑市学院、复仇爽点、冷峻悬疑文风、不要系统流..."
                value={ideaBrief}
                onChange={(e) => setIdeaBrief(e.target.value)}
              />
            </label>
            <input className="focus-ring rounded border border-line px-3 py-2" placeholder="小说标题" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            <input className="focus-ring rounded border border-line px-3 py-2" placeholder="类型，如玄幻/科幻/悬疑" value={form.genre} onChange={(e) => setForm({ ...form, genre: e.target.value })} />
            <textarea className="focus-ring min-h-28 rounded border border-line px-3 py-2" placeholder="项目种子设定：AI 构思后会回填；也可以手动修改主角、世界观、爽点、文风、目标字数..." value={form.premise} onChange={(e) => setForm({ ...form, premise: e.target.value })} />
            <div className="grid grid-cols-2 gap-3">
              <input className="focus-ring rounded border border-line px-3 py-2" type="number" value={form.target_word_count} onChange={(e) => setForm({ ...form, target_word_count: Number(e.target.value) })} />
              <input className="focus-ring rounded border border-line px-3 py-2" placeholder="基调" value={form.tone} onChange={(e) => setForm({ ...form, tone: e.target.value })} />
            </div>
            <button className="focus-ring inline-flex items-center justify-center gap-2 rounded border border-line bg-white px-4 py-2 disabled:opacity-50" disabled={loading} onClick={ideateProject}>
              <Sparkles size={18} /> AI 构思并填入
            </button>
            <button className="focus-ring inline-flex items-center justify-center gap-2 rounded bg-accent px-4 py-2 text-white disabled:opacity-50" disabled={!form.title || loading} onClick={createProject}>
              <Plus size={18} /> 创建项目并进入工作台
            </button>
            <StatusLine loading={loading} error={error} />
            {idea && (
              <div className="max-h-64 overflow-auto rounded border border-line bg-paper p-3 text-xs leading-5 text-ink/75">
                <div className="mb-1 font-semibold text-ink">AI 构思预览</div>
                <pre>{JSON.stringify(idea, null, 2)}</pre>
              </div>
            )}
          </div>
        </section>

        <section>
          <div className="mb-3 flex items-end justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold">项目列表</h2>
              <p className="mt-1 text-sm text-ink/58">打开项目后，Dashboard 会根据数据库状态告诉你下一步该做什么。</p>
            </div>
            <span className="text-sm text-ink/60">{projects.length} 个项目</span>
          </div>
          <div className="grid gap-3">
            {projects.map((project) => (
              <article key={project.id} className="tool-panel p-4 transition hover:-translate-y-0.5 hover:border-accent/45">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <Link className="group" href={`/projects/${project.id}`}>
                    <h3 className="text-xl font-semibold group-hover:text-accent">{project.title}</h3>
                    <p className="mt-1 text-sm text-ink/65">{project.genre || "未设置类型"} · {project.pov || "未设置视角"}</p>
                  </Link>
                  <div className="flex gap-2">
                    <a className="focus-ring rounded border border-line p-2 hover:bg-paper" href={`/api/projects/${project.id}/export?type=backup`} title="导出项目 JSON">
                      <Download size={18} />
                    </a>
                    <button className="focus-ring rounded border border-line p-2 hover:bg-red-50" onClick={() => remove(project.id)} title="删除项目">
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
                <p className="mt-3 line-clamp-3 text-sm leading-6 text-ink/75">{project.premise || "暂无种子设定"}</p>
                <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-3 text-xs text-ink/55">
                  <div className="inline-flex items-center gap-2">
                    <FileSearch size={14} /> 目标 {formatWords(project.target_word_count)} 字
                  </div>
                  <Link className="inline-flex items-center gap-1 font-medium text-accent hover:underline" href={`/projects/${project.id}`}>
                    打开工作台 <ArrowRight size={14} />
                  </Link>
                </div>
              </article>
            ))}
            {!projects.length && (
              <div className="tool-panel p-8 text-center">
                <Sparkles className="mx-auto text-accent" size={28} />
                <h3 className="mt-3 font-semibold">还没有小说项目</h3>
                <p className="mt-2 text-sm leading-6 text-ink/62">先在左侧写一个创意提示词，让系统帮你生成标题、类型、主角、世界观和项目种子。</p>
              </div>
            )}
          </div>
        </section>
      </div>
      </div>
    </main>
  );
}

function HeroFact({ icon: Icon, label, body }: { icon: LucideIcon; label: string; body: string }) {
  return (
    <div className="rounded-lg border border-white/[0.12] bg-white/[0.07] p-3">
      <Icon size={18} className="text-[#e7b95d]" />
      <div className="mt-2 text-sm font-semibold text-white">{label}</div>
      <p className="mt-1 text-xs leading-5 text-white/62">{body}</p>
    </div>
  );
}

function formatWords(value: number) {
  if (!value) return "未设置";
  return new Intl.NumberFormat("zh-CN").format(value);
}
