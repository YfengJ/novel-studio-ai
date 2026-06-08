"use client";

import clsx from "clsx";

export function StatusLine({ loading, error, message }: { loading?: boolean; error?: string; message?: string }) {
  if (!loading && !error && !message) return null;
  return (
    <div
      className={clsx(
        "rounded border px-3 py-2 text-sm",
        error ? "border-red-300 bg-red-50 text-red-800" : "border-line bg-white/70 text-ink"
      )}
    >
      {loading ? "处理中..." : error ?? message}
    </div>
  );
}

export function JsonBlock({ value }: { value: unknown }) {
  return <pre className="max-h-[520px] overflow-auto rounded border border-line bg-white p-4 text-xs leading-5">{JSON.stringify(value, null, 2)}</pre>;
}

