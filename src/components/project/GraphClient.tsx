"use client";

import { Search } from "lucide-react";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { apiFetch } from "@/components/client/api";
import { StatusLine } from "@/components/ui/Status";

export function GraphClient() {
  const params = useParams<{ projectId: string }>();
  const [q, setQ] = useState("");
  const [importance, setImportance] = useState("");
  const [triples, setTriples] = useState<any[]>([]);
  const [error, setError] = useState("");

  async function load() {
    const query = new URLSearchParams();
    if (q) query.set("q", q);
    if (importance) query.set("importance", importance);
    const res = await apiFetch<{ triples: any[] }>(`/api/projects/${params.projectId}/graph?${query}`);
    setTriples(res.triples);
  }

  useEffect(() => {
    load().catch((err) => setError(err.message));
  }, [params.projectId, importance]);

  return (
    <main className="mx-auto max-w-7xl p-6">
      <h1 className="text-2xl font-semibold">三元组图谱</h1>
      <div className="mt-4 flex flex-wrap gap-2">
        <input className="focus-ring min-w-72 rounded border border-line px-3 py-2" placeholder="subject / predicate / object / evidence" value={q} onChange={(e) => setQ(e.target.value)} />
        <select className="focus-ring rounded border border-line px-3 py-2" value={importance} onChange={(e) => setImportance(e.target.value)}>
          <option value="">全部重要度</option>
          <option value="low">low</option>
          <option value="medium">medium</option>
          <option value="high">high</option>
          <option value="critical">critical</option>
        </select>
        <button className="focus-ring inline-flex items-center gap-2 rounded bg-accent px-3 py-2 text-white" onClick={load}><Search size={16} /> 搜索</button>
      </div>
      <div className="mt-3"><StatusLine error={error} /></div>
      <div className="mt-5 overflow-auto rounded border border-line bg-white">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-line bg-paper">
            <tr>
              <th className="px-3 py-2">章节</th>
              <th className="px-3 py-2">Subject</th>
              <th className="px-3 py-2">Predicate</th>
              <th className="px-3 py-2">Object</th>
              <th className="px-3 py-2">Importance</th>
              <th className="px-3 py-2">Evidence</th>
            </tr>
          </thead>
          <tbody>
            {triples.map((triple) => (
              <tr key={triple.id} className="border-b border-line/70">
                <td className="px-3 py-2">{triple.source_chapter}</td>
                <td className="px-3 py-2">{triple.subject_type}:{triple.subject_id ?? ""}</td>
                <td className="px-3 py-2 font-medium">{triple.predicate}</td>
                <td className="px-3 py-2">{triple.object_type}:{triple.object_value ?? triple.object_id}</td>
                <td className="px-3 py-2">{triple.importance}</td>
                <td className="px-3 py-2 text-ink/70">{triple.evidence_text}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}

