"use client";

const storageKey = "story-maker:operations";
const eventName = "story-maker:operations-updated";

export type OperationState = "running" | "success" | "error";

export type OperationRecord = {
  id: string;
  title: string;
  detail?: string;
  projectId?: string;
  state: OperationState;
  startedAt: number;
  updatedAt: number;
  finishedAt?: number;
  message?: string;
  error?: string;
};

function readOperations(): OperationRecord[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(window.localStorage.getItem(storageKey) ?? "[]") as OperationRecord[];
  } catch {
    return [];
  }
}

function writeOperations(operations: OperationRecord[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(storageKey, JSON.stringify(operations.slice(0, 20)));
  window.dispatchEvent(new CustomEvent(eventName));
}

export function getOperations() {
  return readOperations();
}

export function subscribeOperations(callback: () => void) {
  window.addEventListener(eventName, callback);
  window.addEventListener("storage", callback);
  return () => {
    window.removeEventListener(eventName, callback);
    window.removeEventListener("storage", callback);
  };
}

export function startOperation(input: { title: string; detail?: string; projectId?: string }) {
  const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const operation: OperationRecord = {
    id,
    title: input.title,
    detail: input.detail,
    projectId: input.projectId,
    state: "running",
    startedAt: Date.now(),
    updatedAt: Date.now(),
    message: "处理中..."
  };
  writeOperations([operation, ...readOperations()]);
  return id;
}

export function updateOperation(id: string, patch: Partial<OperationRecord>) {
  const operations = readOperations();
  const next = operations.map((operation) => (operation.id === id ? { ...operation, ...patch, updatedAt: Date.now() } : operation));
  writeOperations(next);
}

export function clearCompletedOperations() {
  writeOperations(readOperations().filter((operation) => operation.state === "running"));
}

export async function runTrackedOperation<T>(
  input: { title: string; detail?: string; projectId?: string; successMessage?: string },
  fn: (operationId: string) => Promise<T>
) {
  const id = startOperation(input);
  try {
    const result = await fn(id);
    updateOperation(id, {
      state: "success",
      finishedAt: Date.now(),
      message: input.successMessage ?? "已完成"
    });
    return result;
  } catch (error) {
    updateOperation(id, {
      state: "error",
      finishedAt: Date.now(),
      error: error instanceof Error ? error.message : String(error),
      message: "失败"
    });
    throw error;
  }
}

