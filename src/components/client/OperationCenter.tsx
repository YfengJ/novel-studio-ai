"use client";

import { AlertCircle, CheckCircle2, Loader2, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { clearCompletedOperations, getOperations, subscribeOperations, type OperationRecord } from "./operationStore";

function formatAge(operation: OperationRecord) {
  const end = operation.finishedAt ?? Date.now();
  const seconds = Math.max(0, Math.floor((end - operation.startedAt) / 1000));
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  return `${minutes}m ${rest}s`;
}

export function OperationCenter() {
  const [operations, setOperations] = useState<OperationRecord[]>([]);

  useEffect(() => {
    const refresh = () => setOperations(getOperations());
    refresh();
    const unsubscribe = subscribeOperations(refresh);
    const timer = window.setInterval(refresh, 1000);
    return () => {
      unsubscribe();
      window.clearInterval(timer);
    };
  }, []);

  const visible = useMemo(() => operations.filter((operation) => operation.state === "running" || Date.now() - operation.updatedAt < 10 * 60 * 1000).slice(0, 4), [operations]);

  if (!visible.length) return null;

  return (
    <aside className="fixed bottom-4 right-4 z-50 w-[min(420px,calc(100vw-32px))] rounded border border-line bg-white shadow-soft">
      <div className="flex items-center justify-between border-b border-line px-3 py-2">
        <div className="text-sm font-semibold">任务状态</div>
        <button className="rounded p-1 text-ink/60 hover:bg-paper" onClick={clearCompletedOperations} title="清除已完成任务">
          <X size={16} />
        </button>
      </div>
      <div className="grid max-h-80 gap-2 overflow-auto p-3">
        {visible.map((operation) => (
          <div key={operation.id} className="rounded border border-line bg-paper/50 px-3 py-2 text-sm">
            <div className="flex items-start gap-2">
              {operation.state === "running" && <Loader2 className="mt-0.5 animate-spin text-accent" size={16} />}
              {operation.state === "success" && <CheckCircle2 className="mt-0.5 text-green-700" size={16} />}
              {operation.state === "error" && <AlertCircle className="mt-0.5 text-red-700" size={16} />}
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium">{operation.title}</span>
                  <span className="text-xs text-ink/50">{formatAge(operation)}</span>
                </div>
                {operation.detail && <div className="mt-1 text-xs text-ink/60">{operation.detail}</div>}
                {operation.error ? <div className="mt-1 text-xs text-red-700">{operation.error}</div> : <div className="mt-1 text-xs text-ink/60">{operation.message}</div>}
              </div>
            </div>
          </div>
        ))}
      </div>
    </aside>
  );
}

