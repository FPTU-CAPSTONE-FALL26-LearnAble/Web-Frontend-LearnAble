export type NarrationSentence = { text: string; start: number; end: number; weight: number };

export function splitNarration(text: string): NarrationSentence[] {
  const sentences: NarrationSentence[] = [];
  let start = 0;
  const add = (end: number) => {
    const raw = text.slice(start, end);
    const leading = raw.length - raw.trimStart().length;
    const trimmed = raw.trim();
    if (trimmed) sentences.push({ text: trimmed, start: start + leading, end: start + leading + trimmed.length, weight: Math.max(1, trimmed.replace(/\s/g, "").length) });
    start = end;
  };

  for (let index = 0; index < text.length; index += 1) {
    if (/[.!?。！？\n]/u.test(text[index])) add(index + 1);
    else if (index - start >= 220 && /\s/u.test(text[index])) add(index + 1);
  }
  if (start < text.length) add(text.length);
  return sentences;
}

export function sentenceAtTime(sentences: NarrationSentence[], currentTime: number, duration: number): number {
  if (!sentences.length || !Number.isFinite(duration) || duration <= 0) return -1;
  const totalWeight = sentences.reduce((sum, sentence) => sum + sentence.weight, 0);
  const position = Math.min(Math.max(currentTime / duration, 0), 1) * totalWeight;
  let elapsedWeight = 0;
  for (let index = 0; index < sentences.length; index += 1) {
    elapsedWeight += sentences[index].weight;
    if (position < elapsedWeight) return index;
  }
  return sentences.length - 1;
}
