"use client";

import { Search } from "lucide-react";
import { useState } from "react";
import { useParams } from "next/navigation";
import { apiFetch } from "@/components/client/api";
import { JsonBlock, StatusLine } from "@/components/ui/Status";

export function MemorySearchClient() {
  const params = useParams<{ projectId: string }>();
  const [query, setQuery] = useState("");
  const [result, setResult] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function search() {
    setLoading(true);
    setError("");
    try {
      const res = await apiFetch(`/api/projects/${params.projectId}/memory/search`, {
        method: "POST",
        body: JSON.stringify({ query, maxResults: 10 })
      });
      setResult(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto max-w-7xl p-6">
      <h1 className="text-2xl font-semibold">记忆检索</h1>
      <div className="mt-4 flex gap-2">
        <input className="focus-ring min-w-0 flex-1 rounded border border-line bg-white px-3 py-2" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="输入关键词、人物、地点、道具或问题" />
        <button className="focus-ring inline-flex items-center gap-2 rounded bg-accent px-4 py-2 text-white" onClick={search}><Search size={16} /> 检索</button>
      </div>
      <div className="mt-3"><StatusLine loading={loading} error={error} /></div>
      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        <Section title="向量检索结果" value={result?.vectorChunks} />
        <Section title="关键词检索结果" value={result?.keywordChunks} />
        <Section title="三元组检索结果" value={result?.graphFacts} />
        <Section title="角色状态结果" value={result?.characterStates} />
        <Section title="近期时间线" value={result?.timelineEvents} />
      </div>
    </main>
  );
}

function Section({ title, value }: { title: string; value: unknown }) {
  return (
    <section className="rounded border border-line bg-white p-4">
      <h2 className="mb-2 font-semibold">{title}</h2>
      {value ? <JsonBlock value={value} /> : <p className="text-sm text-ink/55">暂无结果</p>}
    </section>
  );
}

