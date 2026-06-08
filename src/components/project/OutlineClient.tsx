"use client";

import { Trash2, Wand2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { apiFetch } from "@/components/client/api";
import { runTrackedOperation } from "@/components/client/operationStore";
import { StatusLine } from "@/components/ui/Status";
import { WorkflowGuide } from "@/components/project/WorkflowGuide";

type OutlineData = {
  volumes: any[];
  arcPacks: any[];
  chapters: any[];
};

function prettyJson(value: string | null | undefined, fallback: "{}" | "[]" = "{}") {
  try {
    return JSON.stringify(JSON.parse(value || fallback), null, 2);
  } catch {
    return fallback;
  }
}

function parseEditorJson(value: string) {
  return JSON.stringify(JSON.parse(value));
}

export function OutlineClient() {
  const params = useParams<{ projectId: string }>();
  const [data, setData] = useState<OutlineData>({ volumes: [], arcPacks: [], chapters: [] });
  const [selectedVolumeId, setSelectedVolumeId] = useState<number | null>(null);
  const [selectedArcPackId, setSelectedArcPackId] = useState<number | null>(null);
  const [selectedChapterId, setSelectedChapterId] = useState<number | null>(null);
  const [volumeEditor, setVolumeEditor] = useState("{}");
  const [arcEditor, setArcEditor] = useState("{}");
  const [chapterEditor, setChapterEditor] = useState("{}");
  const [sceneEditor, setSceneEditor] = useState("[]");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const selectedVolume = useMemo(() => data.volumes.find((volume) => volume.id === selectedVolumeId) ?? null, [data.volumes, selectedVolumeId]);
  const selectedArcPack = useMemo(() => {
    const arcPack = data.arcPacks.find((item) => item.id === selectedArcPackId) ?? null;
    if (!arcPack) return null;
    return selectedVolume && arcPack.volume_id !== selectedVolume.id ? null : arcPack;
  }, [data.arcPacks, selectedArcPackId, selectedVolume]);
  const selectedChapter = useMemo(() => {
    const chapter = data.chapters.find((item) => item.id === selectedChapterId) ?? null;
    if (!chapter) return null;
    if (selectedArcPack && chapter.arc_pack_id !== selectedArcPack.id) return null;
    if (!selectedArcPack && selectedVolume && chapter.volume_id !== selectedVolume.id) return null;
    return chapter;
  }, [data.chapters, selectedChapterId, selectedArcPack, selectedVolume]);

  async function load() {
    const res = await apiFetch<OutlineData>(`/api/projects/${params.projectId}/outline`);
    setData(res);

    const nextVolumeId = res.volumes.some((volume) => volume.id === selectedVolumeId) ? selectedVolumeId : (res.volumes.at(-1)?.id ?? null);
    const nextArcPackId = res.arcPacks.some((arcPack) => arcPack.id === selectedArcPackId && (!nextVolumeId || arcPack.volume_id === nextVolumeId))
      ? selectedArcPackId
      : (res.arcPacks.find((arcPack) => arcPack.volume_id === nextVolumeId)?.id ?? null);
    const nextChapterId = res.chapters.some((chapter) => chapter.id === selectedChapterId && (!nextArcPackId || chapter.arc_pack_id === nextArcPackId))
      ? selectedChapterId
      : (res.chapters.find((chapter) => nextArcPackId ? chapter.arc_pack_id === nextArcPackId : !nextVolumeId || chapter.volume_id === nextVolumeId)?.id ?? null);

    setSelectedVolumeId(nextVolumeId);
    setSelectedArcPackId(nextArcPackId);
    setSelectedChapterId(nextChapterId);
  }

  useEffect(() => {
    load().catch((err) => setError(err.message));
  }, [params.projectId]);

  useEffect(() => {
    setVolumeEditor(prettyJson(selectedVolume?.outline_json));
  }, [selectedVolume]);

  useEffect(() => {
    setArcEditor(prettyJson(selectedArcPack?.outline_json));
  }, [selectedArcPack]);

  useEffect(() => {
    setChapterEditor(prettyJson(selectedChapter?.outline_json));
    setSceneEditor(prettyJson(selectedChapter?.scene_beats_json, "[]"));
  }, [selectedChapter]);

  async function generate(type: string, extra: Record<string, unknown> = {}) {
    setLoading(true);
    setError("");
    setMessage("");
    try {
      const labels: Record<string, string> = {
        volume: "生成卷大纲",
        arc: "生成五章剧情包",
        chapter: "生成章节细纲",
        sceneBeats: "生成场景节拍"
      };
      await runTrackedOperation(
        {
          title: labels[type] ?? "生成大纲",
          detail: "调用模型生成结构化大纲数据",
          projectId: params.projectId,
          successMessage: "生成完成，已写入本地数据库"
        },
        () => apiFetch(`/api/projects/${params.projectId}/outline/generate`, { method: "POST", body: JSON.stringify({ type, ...extra }) })
      );
      setMessage("生成完成。");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  async function saveVolume() {
    if (!selectedVolume) return;
    await saveOutline("volume", selectedVolume.id, volumeEditor, "卷大纲已保存。");
  }

  async function saveArcPack() {
    if (!selectedArcPack) return;
    await saveOutline("arc", selectedArcPack.id, arcEditor, "五章剧情包已保存。");
  }

  async function saveChapter() {
    if (!selectedChapter) return;
    setLoading(true);
    setError("");
    try {
      await apiFetch(`/api/projects/${params.projectId}/outline`, {
        method: "PATCH",
        body: JSON.stringify({
          kind: "chapter",
          id: selectedChapter.id,
          outline_json: parseEditorJson(chapterEditor),
          scene_beats_json: parseEditorJson(sceneEditor)
        })
      });
      setMessage("章节细纲与场景节拍已保存。");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  async function saveOutline(kind: "volume" | "arc", id: number, editorValue: string, successMessage: string) {
    setLoading(true);
    setError("");
    try {
      const parsed = JSON.parse(editorValue);
      await apiFetch(`/api/projects/${params.projectId}/outline`, {
        method: "PATCH",
        body: JSON.stringify({
          kind,
          id,
          outline_json: JSON.stringify(parsed),
          title: kind === "volume" ? parsed.title : undefined
        })
      });
      setMessage(successMessage);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  async function removeOutline(kind: "volume" | "arc" | "chapter", id: number) {
    setLoading(true);
    setError("");
    try {
      await apiFetch(`/api/projects/${params.projectId}/outline`, {
        method: "DELETE",
        body: JSON.stringify({ kind, id })
      });
      setMessage("已删除。");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  function selectVolume(volumeId: number) {
    setSelectedVolumeId(volumeId);
    const firstArcForVolume = data.arcPacks.find((arcPack) => arcPack.volume_id === volumeId);
    setSelectedArcPackId(firstArcForVolume?.id ?? null);
    const firstChapterForArc = firstArcForVolume ? data.chapters.find((chapter) => chapter.arc_pack_id === firstArcForVolume.id) : null;
    setSelectedChapterId(firstChapterForArc?.id ?? null);
  }

  function selectArcPack(arcPackId: number) {
    setSelectedArcPackId(arcPackId);
    const arcPack = data.arcPacks.find((item) => item.id === arcPackId);
    if (arcPack) setSelectedVolumeId(arcPack.volume_id);
    const firstChapterForArc = data.chapters.find((chapter) => chapter.arc_pack_id === arcPackId);
    if (firstChapterForArc) setSelectedChapterId(firstChapterForArc.id);
  }

  const targetVolume = selectedVolume ?? data.volumes.at(-1) ?? null;
  const arcPacksForTargetVolume = targetVolume ? data.arcPacks.filter((arcPack) => arcPack.volume_id === targetVolume.id) : [];
  const nextArcStart = arcPacksForTargetVolume.length ? Math.max(...arcPacksForTargetVolume.map((arcPack) => Number(arcPack.end_chapter_number))) + 1 : 1;
  const targetArcPack = selectedArcPack?.volume_id === targetVolume?.id ? selectedArcPack : arcPacksForTargetVolume.at(-1) ?? null;
  const nextChapterNumber = targetArcPack ? getNextChapterNumber(targetArcPack, data.chapters) : 1;
  const visibleChapters = targetArcPack
    ? data.chapters.filter((chapter) => chapter.arc_pack_id === targetArcPack.id)
    : targetVolume
      ? data.chapters.filter((chapter) => chapter.volume_id === targetVolume.id)
      : data.chapters;

  return (
    <main className="mx-auto max-w-7xl p-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">大纲系统</h1>
        <div className="flex flex-wrap gap-2">
          <button className="focus-ring inline-flex items-center gap-2 rounded border border-line bg-white px-3 py-2" disabled={loading} onClick={() => generate("volume")}>
            <Wand2 size={16} /> 生成卷大纲
          </button>
          <button
            className="focus-ring rounded border border-line bg-white px-3 py-2 disabled:opacity-40"
            disabled={!targetVolume || loading}
            onClick={() => targetVolume && generate("arc", { volumeId: targetVolume.id, startChapterNumber: nextArcStart, endChapterNumber: nextArcStart + 4 })}
          >
            生成五章包
          </button>
          <button
            className="focus-ring rounded border border-line bg-white px-3 py-2 disabled:opacity-40"
            disabled={!targetArcPack || loading}
            onClick={() => targetArcPack && generate("chapter", { arcPackId: targetArcPack.id, chapterNumber: nextChapterNumber })}
          >
            生成下一章细纲
          </button>
          <button className="focus-ring rounded border border-line bg-white px-3 py-2 disabled:opacity-40" disabled={!selectedChapter || loading} onClick={() => generate("sceneBeats", { chapterId: selectedChapter?.id })}>
            生成场景节拍
          </button>
        </div>
      </div>
      <StatusLine loading={loading} error={error} message={message} />
      <div className="mt-4">
        <WorkflowGuide projectId={params.projectId} compact />
      </div>
      <div className="mt-5 grid gap-4 xl:grid-cols-[320px_1fr]">
        <aside className="grid content-start gap-4">
          <Panel title="卷大纲" items={data.volumes} selectedId={selectedVolumeId} onSelect={selectVolume} onDelete={(id) => removeOutline("volume", id)} label={(item) => `${item.volume_number}. ${item.title}`} />
          <Panel title="五章剧情包" items={arcPacksForTargetVolume} selectedId={selectedArcPackId} onSelect={selectArcPack} onDelete={(id) => removeOutline("arc", id)} label={(item) => `第 ${item.start_chapter_number}-${item.end_chapter_number} 章`} />
          <Panel title="章节" items={visibleChapters} selectedId={selectedChapterId} onSelect={setSelectedChapterId} onDelete={(id) => removeOutline("chapter", id)} label={(item) => `第 ${item.chapter_number} 章 ${item.title || "未命名"} · ${item.status}`} />
        </aside>
        <section className="grid gap-4">
          <JsonEditor title="卷大纲 JSON" description="这一卷的承诺、开局、中点、高潮、结尾钩子和关键伏笔。" value={volumeEditor} onChange={setVolumeEditor} onSave={saveVolume} disabled={!selectedVolume || loading} />
          <JsonEditor title="五章剧情包 JSON" description="每 5 章的短期路线图，用来控制节奏、升级、伏笔和状态变化预期。" value={arcEditor} onChange={setArcEditor} onSave={saveArcPack} disabled={!selectedArcPack || loading} />
          <JsonEditor title="章节细纲 JSON" description="单章目标、场景列表、冲突节拍、揭示点、结尾钩子和必需事实。" value={chapterEditor} onChange={setChapterEditor} onSave={saveChapter} disabled={!selectedChapter || loading} />
          <JsonEditor title="Scene Beats JSON" description="真正写正文前的场景节拍。Chapter Studio 会把它放进 Context Pack。" value={sceneEditor} onChange={setSceneEditor} onSave={saveChapter} disabled={!selectedChapter || loading} minHeight="min-h-48" />
        </section>
      </div>
    </main>
  );
}

function getNextChapterNumber(arcPack: any, chapters: any[]) {
  const existing = new Set(chapters.map((chapter) => Number(chapter.chapter_number)));
  const outline = JSON.parse(arcPack.outline_json || "{}");
  const planned = Array.isArray(outline.chapters) ? outline.chapters.map((chapter: any) => Number(chapter.chapter_number)).filter(Boolean) : [];
  return planned.find((chapterNumber: number) => !existing.has(chapterNumber)) ?? Number(arcPack.start_chapter_number ?? 1);
}

function Panel({
  title,
  items,
  selectedId,
  onSelect,
  onDelete,
  label
}: {
  title: string;
  items: any[];
  selectedId: number | null;
  onSelect: (id: number) => void;
  onDelete: (id: number) => void;
  label: (item: any) => string;
}) {
  return (
    <section className="tool-panel p-4">
      <h2 className="font-semibold">{title}</h2>
      <div className="mt-3 grid gap-2">
        {items.map((item) => {
          const selected = item.id === selectedId;
          return (
            <div
              key={item.id}
              className={`group flex items-center gap-2 rounded border px-3 py-2 text-sm hover:bg-paper ${selected ? "border-accent bg-accent/10 text-accent" : "border-line"}`}
            >
              <button className="min-w-0 flex-1 text-left" onClick={() => onSelect(item.id)}>
                {label(item)}
              </button>
              <button className="rounded p-1 text-ink/35 opacity-0 hover:bg-white hover:text-red-700 group-hover:opacity-100" title="删除" onClick={() => onDelete(item.id)}>
                <Trash2 size={14} />
              </button>
            </div>
          );
        })}
        {!items.length && <p className="text-sm text-ink/55">暂无数据</p>}
      </div>
    </section>
  );
}

function JsonEditor({
  title,
  description,
  value,
  onChange,
  onSave,
  disabled,
  minHeight = "min-h-64"
}: {
  title: string;
  description: string;
  value: string;
  onChange: (value: string) => void;
  onSave: () => void;
  disabled: boolean;
  minHeight?: string;
}) {
  return (
    <section className="tool-panel p-4">
      <div className="mb-2 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-semibold">{title}</h2>
          <p className="mt-1 text-xs leading-5 text-ink/60">{description}</p>
        </div>
        <button className="focus-ring rounded bg-accent px-3 py-1.5 text-sm text-white disabled:opacity-40" disabled={disabled} onClick={onSave}>
          保存
        </button>
      </div>
      <textarea className={`focus-ring ${minHeight} w-full rounded border border-line p-3 font-mono text-sm`} value={value} onChange={(event) => onChange(event.target.value)} />
    </section>
  );
}
