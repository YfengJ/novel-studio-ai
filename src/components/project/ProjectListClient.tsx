"use client";

import Link from "next/link";
import { Download, Plus, Sparkles, Trash2 } from "lucide-react";
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
    <main className="min-h-screen px-6 py-8">
      <div className="mx-auto grid max-w-7xl gap-6 lg:grid-cols-[380px_1fr]">
        <section className="rounded border border-line bg-white p-5 shadow-soft">
          <h1 className="text-2xl font-semibold">AI 长篇小说创作工作台</h1>
          <p className="mt-2 text-sm text-ink/70">本地 SQLite 保存项目、设定、大纲、角色状态、图谱事实和检索记忆。</p>
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
              <Plus size={18} /> 创建项目
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
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-semibold">项目列表</h2>
            <span className="text-sm text-ink/60">{projects.length} 个项目</span>
          </div>
          <div className="grid gap-3">
            {projects.map((project) => (
              <article key={project.id} className="rounded border border-line bg-white p-4">
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
              </article>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
