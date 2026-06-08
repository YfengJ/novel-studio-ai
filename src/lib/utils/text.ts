export function countWords(text: string) {
  const cjk = text.match(/[\u4e00-\u9fff]/g)?.length ?? 0;
  const latin = text.replace(/[\u4e00-\u9fff]/g, " ").match(/[A-Za-z0-9_]+/g)?.length ?? 0;
  return cjk + latin;
}

export function truncateText(text: string, maxChars: number) {
  if (text.length <= maxChars) return text;
  return `${text.slice(0, maxChars)}...`;
}

export function endingExcerpt(text: string, maxChars = 1800) {
  if (text.length <= maxChars) return text;
  return text.slice(text.length - maxChars);
}

export function safeJsonText(value: unknown) {
  return JSON.stringify(value, null, 2);
}

