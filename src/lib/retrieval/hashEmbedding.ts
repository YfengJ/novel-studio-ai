export function hashTextEmbedding(text: string, dimensions = 64) {
  const vector = new Array<number>(dimensions).fill(0);
  const tokens = text.toLowerCase().match(/[\p{L}\p{N}_]+/gu) ?? [];
  for (const token of tokens) {
    let hash = 2166136261;
    for (let index = 0; index < token.length; index += 1) {
      hash ^= token.charCodeAt(index);
      hash = Math.imul(hash, 16777619);
    }
    const slot = Math.abs(hash) % dimensions;
    vector[slot] += 1;
  }
  return vector;
}

