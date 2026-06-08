"use client";

import { Skull, UserPlus } from "lucide-react";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { apiFetch } from "@/components/client/api";
import { JsonBlock, StatusLine } from "@/components/ui/Status";

const tiers = ["S", "A", "B", "C", "D"];

export function CharactersClient() {
  const params = useParams<{ projectId: string }>();
  const [tier, setTier] = useState("");
  const [characters, setCharacters] = useState<any[]>([]);
  const [selected, setSelected] = useState<any | null>(null);
  const [states, setStates] = useState<any[]>([]);
  const [error, setError] = useState("");

  async function load() {
    const res = await apiFetch<{ characters: any[] }>(`/api/projects/${params.projectId}/characters${tier ? `?tier=${tier}` : ""}`);
    setCharacters(res.characters);
  }

  useEffect(() => {
    load().catch((err) => setError(err.message));
  }, [params.projectId, tier]);

  async function open(character: any) {
    setSelected(character);
    const res = await apiFetch<{ states: any[] }>(`/api/projects/${params.projectId}/characters/${character.id}/state`);
    setStates(res.states);
  }

  async function mark(status: string) {
    if (!selected) return;
    await apiFetch(`/api/projects/${params.projectId}/characters/${selected.id}/state`, {
      method: "POST",
      body: JSON.stringify({ chapter_number: selected.last_seen_chapter ?? 1, alive_status: status, notes: `手动标记为 ${status}` })
    });
    await open(selected);
  }

  return (
    <main className="mx-auto max-w-7xl p-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">角色状态表</h1>
        <div className="flex gap-2">
          <button className={`rounded border border-line px-3 py-2 text-sm ${!tier ? "bg-accent text-white" : "bg-white"}`} onClick={() => setTier("")}>全部</button>
          {tiers.map((item) => <button key={item} className={`rounded border border-line px-3 py-2 text-sm ${tier === item ? "bg-accent text-white" : "bg-white"}`} onClick={() => setTier(item)}>{item}</button>)}
        </div>
      </div>
      <StatusLine error={error} />
      <div className="grid gap-4 lg:grid-cols-[420px_1fr]">
        <section className="rounded border border-line bg-white p-4">
          <h2 className="mb-3 font-semibold">角色列表</h2>
          <div className="grid gap-2">
            {characters.map((character) => (
              <button key={character.id} className="focus-ring rounded border border-line px-3 py-2 text-left text-sm hover:bg-paper" onClick={() => open(character)}>
                <span className="font-medium">{character.name}</span>
                <span className="ml-2 text-xs text-ink/55">{character.tier} · {character.role || "未设定"}</span>
                <p className="mt-1 text-ink/60">{character.description}</p>
              </button>
            ))}
          </div>
        </section>
        <section className="rounded border border-line bg-white p-4">
          {selected ? (
            <>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-xl font-semibold">{selected.name}</h2>
                <div className="flex flex-wrap gap-2">
                  <button className="focus-ring inline-flex items-center gap-2 rounded border border-line px-3 py-2 text-sm" onClick={() => mark("dead")}><Skull size={16} /> 死亡</button>
                  <button className="focus-ring rounded border border-line px-3 py-2 text-sm" onClick={() => mark("missing")}>失踪</button>
                  <button className="focus-ring rounded border border-line px-3 py-2 text-sm" onClick={() => mark("alive")}>复活/存活</button>
                  <button className="focus-ring inline-flex items-center gap-2 rounded border border-line px-3 py-2 text-sm" onClick={() => mark("unknown")}><UserPlus size={16} /> 背叛备注</button>
                </div>
              </div>
              <div className="mt-4"><JsonBlock value={states} /></div>
            </>
          ) : (
            <p className="text-sm text-ink/60">选择一个角色查看当前与历史状态。</p>
          )}
        </section>
      </div>
    </main>
  );
}

