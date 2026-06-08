"use client";

import { RotateCcw, Save } from "lucide-react";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { apiFetch } from "@/components/client/api";
import { runTrackedOperation } from "@/components/client/operationStore";
import { StatusLine } from "@/components/ui/Status";

export function JsonDocumentClient({
  title,
  endpoint,
  generateEndpoint,
  rootKey
}: {
  title: string;
  endpoint: string;
  generateEndpoint: string;
  rootKey: string;
}) {
  const params = useParams<{ projectId: string }>();
  const [text, setText] = useState("{}");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const url = `/api/projects/${params.projectId}/${endpoint}`;

  async function load() {
    const res = await apiFetch<Record<string, any>>(url);
    setText(JSON.stringify(res[rootKey]?.content ?? res[rootKey] ?? {}, null, 2));
  }

  useEffect(() => {
    load().catch((err) => setError(err.message));
  }, [url]);

  async function generate() {
    setLoading(true);
    setError("");
    setMessage("");
    try {
      const res = await runTrackedOperation(
        {
          title: `生成 ${title}`,
          detail: "调用模型生成结构化 JSON，并保存为新版本",
          projectId: params.projectId,
          successMessage: `${title} 已生成`
        },
        () => apiFetch<Record<string, any>>(`/api/projects/${params.projectId}/${generateEndpoint}`, { method: "POST" })
      );
      setText(JSON.stringify(res[rootKey] ?? {}, null, 2));
      setMessage("已生成并保存新版本。");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  async function save() {
    setLoading(true);
    setError("");
    setMessage("");
    try {
      await apiFetch(url, { method: "PUT", body: JSON.stringify({ content: JSON.parse(text) }) });
      setMessage("已保存新版本。");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto max-w-5xl p-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">{title}</h1>
        <div className="flex gap-2">
          <button className="focus-ring inline-flex items-center gap-2 rounded border border-line bg-white px-3 py-2" onClick={generate} disabled={loading}>
            <RotateCcw size={16} /> 重新生成
          </button>
          <button className="focus-ring inline-flex items-center gap-2 rounded bg-accent px-3 py-2 text-white" onClick={save} disabled={loading}>
            <Save size={16} /> 保存版本
          </button>
        </div>
      </div>
      <textarea className="focus-ring min-h-[650px] w-full rounded border border-line bg-white p-4 font-mono text-sm leading-6" value={text} onChange={(e) => setText(e.target.value)} />
      <div className="mt-3"><StatusLine loading={loading} error={error} message={message} /></div>
    </main>
  );
}
