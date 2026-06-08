"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { apiFetch } from "@/components/client/api";
import { StatusLine } from "@/components/ui/Status";

export function SettingsClient() {
  const params = useParams<{ projectId: string }>();
  const [settings, setSettings] = useState<Record<string, any>>({});
  const [apiKey, setApiKey] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    setApiKey(sessionStorage.getItem("openai_api_key") ?? "");
    apiFetch<{ settings: Record<string, any> }>(`/api/projects/${params.projectId}/settings`)
      .then((res) => setSettings(res.settings))
      .catch((err) => setError(err.message));
  }, [params.projectId]);

  async function save() {
    setError("");
    setMessage("");
    try {
      sessionStorage.setItem("openai_api_key", apiKey);
      const res = await apiFetch<{ settings: Record<string, any> }>(`/api/projects/${params.projectId}/settings`, {
        method: "PATCH",
        body: JSON.stringify(settings)
      });
      setSettings(res.settings);
      setMessage("设置已保存。API key 仅保存在当前浏览器 sessionStorage。");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  return (
    <main className="mx-auto max-w-3xl p-6">
      <h1 className="text-2xl font-semibold">设置</h1>
      <div className="mt-5 grid gap-4 rounded border border-line bg-white p-5">
        <Field label="临时 API key（OpenAI / DeepSeek 兼容）">
          <input className="focus-ring w-full rounded border border-line px-3 py-2" type="password" value={apiKey} onChange={(e) => setApiKey(e.target.value)} placeholder="只保存到 sessionStorage" />
        </Field>
        <Field label="默认模型">
          <input className="focus-ring w-full rounded border border-line px-3 py-2" value={settings.default_model ?? ""} onChange={(e) => setSettings({ ...settings, default_model: e.target.value })} />
        </Field>
        <Field label="Embedding 模型">
          <input className="focus-ring w-full rounded border border-line px-3 py-2" value={settings.embedding_model ?? ""} onChange={(e) => setSettings({ ...settings, embedding_model: e.target.value })} />
        </Field>
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="每章目标字数">
            <input className="focus-ring w-full rounded border border-line px-3 py-2" type="number" value={settings.chapter_target_words ?? 2500} onChange={(e) => setSettings({ ...settings, chapter_target_words: Number(e.target.value) })} />
          </Field>
          <Field label="上下文预算">
            <input className="focus-ring w-full rounded border border-line px-3 py-2" type="number" value={settings.context_token_budget ?? 12000} onChange={(e) => setSettings({ ...settings, context_token_budget: Number(e.target.value) })} />
          </Field>
          <Field label="文风强度">
            <input className="focus-ring w-full" type="range" min="0" max="1" step="0.05" value={settings.style_strength ?? 0.7} onChange={(e) => setSettings({ ...settings, style_strength: Number(e.target.value) })} />
          </Field>
          <Field label="一致性严格度">
            <input className="focus-ring w-full" type="range" min="0" max="1" step="0.05" value={settings.continuity_strictness ?? 0.8} onChange={(e) => setSettings({ ...settings, continuity_strictness: Number(e.target.value) })} />
          </Field>
        </div>
        <button className="focus-ring rounded bg-accent px-4 py-2 text-white" onClick={save}>保存设置</button>
        <StatusLine error={error} message={message} />
      </div>
    </main>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="grid gap-1 text-sm font-medium"><span>{label}</span>{children}</label>;
}
