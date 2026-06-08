"use client";

export async function apiFetch<T>(url: string, init: RequestInit = {}): Promise<T> {
  const apiKey = typeof window !== "undefined" ? window.sessionStorage.getItem("openai_api_key") : null;
  const headers = new Headers(init.headers);
  if (apiKey) headers.set("x-openai-api-key", apiKey);
  if (!headers.has("content-type") && init.body) headers.set("content-type", "application/json");
  const response = await fetch(url, { ...init, headers });
  const contentType = response.headers.get("content-type") ?? "";
  const data = contentType.includes("application/json") ? await response.json() : await response.text();
  if (!response.ok) {
    if (typeof data === "string") throw new Error(data);
    const details = Array.isArray(data.details)
      ? `\n${data.details.map((item: any) => `${item.path ? `${item.path}: ` : ""}${item.message ?? item}`).join("\n")}`
      : "";
    throw new Error(`${data.error ?? "Request failed"}${details}`);
  }
  return data as T;
}
