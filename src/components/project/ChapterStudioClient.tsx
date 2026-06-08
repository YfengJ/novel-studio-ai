"use client";

import { CheckCircle2, FileSearch, PenTool, RefreshCw, Wand2 } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { apiFetch } from "@/components/client/api";
import { runTrackedOperation } from "@/components/client/operationStore";
import { JsonBlock, StatusLine } from "@/components/ui/Status";

function parseArray(value: string | null | undefined) {
  try {
    const parsed = JSON.parse(value || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function parseObject(value: string | null | undefined) {
  try {
    const parsed = JSON.parse(value || "{}");
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

export function ChapterStudioClient() {
  const params = useParams<{ projectId: string }>();
  const [chapters, setChapters] = useState<any[]>([]);
  const [chapterId, setChapterId] = useState<number | null>(null);
  const [chapter, setChapter] = useState<any | null>(null);
  const [contextPack, setContextPack] = useState<any | null>(null);
  const [draft, setDraft] = useState("");
  const [report, setReport] = useState<any | null>(null);
  const [extraction, setExtraction] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const selected = useMemo(() => chapters.find((item) => item.id === chapterId), [chapters, chapterId]);
  const hasSceneBeats = selected ? parseArray(selected.scene_beats_json).length > 0 : false;

  async function loadChapters() {
    const res = await apiFetch<{ chapters: any[] }>(`/api/projects/${params.projectId}/chapters`);
    setChapters(res.chapters);
    if (!chapterId && res.chapters[0]) setChapterId(res.chapters[0].id);
  }

  async function loadChapter(id: number) {
    const res = await apiFetch<{ chapter: any }>(`/api/projects/${params.projectId}/chapters/${id}`);
    setChapter(res.chapter);
    setDraft(res.chapter?.draft_text ?? res.chapter?.final_text ?? "");
  }

  useEffect(() => {
    loadChapters().catch((err) => setError(err.message));
  }, [params.projectId]);

  useEffect(() => {
    if (chapterId) loadChapter(chapterId).catch((err) => setError(err.message));
  }, [chapterId]);

  async function withLoading(fn: () => Promise<void>) {
    setLoading(true);
    setError("");
    try {
      await fn();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  async function loadContext() {
    if (!chapterId) return;
    const res = await apiFetch<{ contextPack: any }>(`/api/projects/${params.projectId}/chapters/${chapterId}/context`);
    setContextPack(res.contextPack);
  }

  async function generateDraft() {
    if (!chapterId) return;
    const res = await runTrackedOperation(
      {
        title: "生成正文草稿",
        detail: selected ? `第 ${selected.chapter_number} 章 ${selected.title}` : "章节正文",
        projectId: params.projectId,
        successMessage: "正文草稿已生成"
      },
      () => apiFetch<{ draft: string; contextPack: any }>(`/api/projects/${params.projectId}/chapters/${chapterId}/generate-draft`, { method: "POST" })
    );
    setDraft(res.draft);
    setContextPack(res.contextPack);
    await loadChapter(chapterId);
  }

  async function check() {
    if (!chapterId) return;
    await apiFetch(`/api/projects/${params.projectId}/chapters/${chapterId}`, { method: "PATCH", body: JSON.stringify({ draft_text: draft }) });
    const res = await runTrackedOperation(
      {
        title: "一致性检查",
        detail: selected ? `第 ${selected.chapter_number} 章 ${selected.title}` : "章节检查",
        projectId: params.projectId,
        successMessage: "检查完成"
      },
      () =>
        apiFetch<{ report: any }>(`/api/projects/${params.projectId}/chapters/${chapterId}/check-continuity`, {
          method: "POST",
          body: JSON.stringify({ draftText: draft })
        })
    );
    setReport(res.report);
  }

  async function revise() {
    if (!chapterId) return;
    const res = await runTrackedOperation(
      {
        title: "文风润色",
        detail: selected ? `第 ${selected.chapter_number} 章 ${selected.title}` : "章节润色",
        projectId: params.projectId,
        successMessage: "润色完成"
      },
      () =>
        apiFetch<{ revised: string }>(`/api/projects/${params.projectId}/chapters/${chapterId}/style-revise`, {
          method: "POST",
          body: JSON.stringify({ draftText: draft, continuityReport: report })
        })
    );
    setDraft(res.revised);
  }

  async function accept() {
    if (!chapterId) return;
    const res = await runTrackedOperation(
      {
        title: "接受章节并抽取记忆",
        detail: selected ? `第 ${selected.chapter_number} 章 ${selected.title}` : "章节入库",
        projectId: params.projectId,
        successMessage: "章节已接受，记忆已入库"
      },
      () =>
        apiFetch<{ extraction: any }>(`/api/projects/${params.projectId}/chapters/${chapterId}/accept`, {
          method: "POST",
          body: JSON.stringify({ finalText: draft })
        })
    );
    setExtraction(res.extraction);
    await loadChapter(chapterId);
  }

  return (
    <main className="mx-auto max-w-7xl p-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Chapter Studio</h1>
          <p className="mt-1 text-sm text-ink/60">写正文前先组装 Context Pack；润色或手动改稿后要重新检查，通过后才能接受入库。</p>
        </div>
        <select className="focus-ring rounded border border-line bg-white px-3 py-2" value={chapterId ?? ""} onChange={(e) => setChapterId(Number(e.target.value))}>
          {!chapters.length && <option value="">暂无章节</option>}
          {chapters.map((item) => <option key={item.id} value={item.id}>第 {item.chapter_number} 章 {item.title || "未命名"} · {item.status}</option>)}
        </select>
      </div>
      {!chapters.length && (
        <section className="tool-panel mb-4 p-5">
          <h2 className="font-semibold">还没有可写章节</h2>
          <p className="mt-2 text-sm leading-6 text-ink/65">请先到大纲页生成五章剧情包、章节细纲和场景节拍。正文生成依赖这些结构化上下文。</p>
          <Link className="mt-3 inline-flex rounded bg-accent px-3 py-2 text-sm font-medium text-white" href={`/projects/${params.projectId}/outline`}>去大纲页</Link>
        </section>
      )}
      <section className="tool-panel mb-4 p-3">
        <div className="flex flex-wrap gap-2">
          <button className="focus-ring inline-flex items-center gap-2 rounded border border-line bg-white px-3 py-2" disabled={!selected || loading} onClick={() => withLoading(loadContext)}><FileSearch size={16} /> 1. 查看 Context Pack</button>
          <button className="focus-ring inline-flex items-center gap-2 rounded bg-accent px-3 py-2 text-white disabled:opacity-40" disabled={!selected || !hasSceneBeats || loading} onClick={() => withLoading(generateDraft)}><Wand2 size={16} /> 2. 生成正文草稿</button>
          <button className="focus-ring inline-flex items-center gap-2 rounded border border-line bg-white px-3 py-2" disabled={!draft || loading} onClick={() => withLoading(check)}><RefreshCw size={16} /> 3. 一致性检查</button>
          <button className="focus-ring inline-flex items-center gap-2 rounded border border-line bg-white px-3 py-2" disabled={!draft || loading} onClick={() => withLoading(revise)}><PenTool size={16} /> 4. 文风润色</button>
          <button className="focus-ring inline-flex items-center gap-2 rounded border border-line bg-white px-3 py-2" disabled={!draft || loading} onClick={() => withLoading(accept)}><CheckCircle2 size={16} /> 5. 接受章节入库</button>
        </div>
        {selected && !hasSceneBeats && <p className="mt-2 text-sm text-ember">当前章节还没有 Scene Beats，先去大纲页生成场景节拍。</p>}
      </section>
      <StatusLine loading={loading} error={error} />
      <div className="mt-5 grid gap-4 xl:grid-cols-[1fr_430px]">
        <section className="grid gap-4">
          <div className="tool-panel p-4">
            <h2 className="mb-2 font-semibold">当前章节细纲</h2>
            <JsonBlock value={chapter ? parseObject(chapter.outline_json) : {}} />
          </div>
          <div className="tool-panel p-4">
            <h2 className="mb-2 font-semibold">正文编辑区</h2>
            <textarea className="focus-ring min-h-[620px] w-full rounded border border-line p-4 text-base leading-8" value={draft} onChange={(e) => setDraft(e.target.value)} />
          </div>
        </section>
        <aside className="grid content-start gap-4">
          <Panel title="Context Pack" value={contextPack} />
          <Panel title="一致性检查报告" value={report} />
          <Panel title="记忆抽取结果" value={extraction} />
        </aside>
      </div>
    </main>
  );
}

function Panel({ title, value }: { title: string; value: unknown }) {
  return (
    <section className="tool-panel p-4">
      <h2 className="mb-2 font-semibold">{title}</h2>
      {value ? <JsonBlock value={value} /> : <p className="text-sm text-ink/55">暂无</p>}
    </section>
  );
}
