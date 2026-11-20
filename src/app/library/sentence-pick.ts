import type { Passage } from './lesson';

/** Picked sentences, by their index among the text's sentences; `from === to` is a single sentence. */
export interface SentenceRange {
  from: number;
  to: number;
}

const SPEAKABLE = /[\p{L}\p{N}]/u;

/**
 * Where each sentence of the text is, line by line, as the browser's sentence segmenter finds them. The spans are
 * on the text exactly as written, so the passage she picks is a slice of the lesson.
 */
export function sentenceSpans(text: string): Passage[] {
  const segmenter = new Intl.Segmenter(undefined, { granularity: 'sentence' });
  const spans: Passage[] = [];
  let lineStart = 0;
  for (const line of text.split('\n')) {
    for (const { segment, index } of segmenter.segment(line)) {
      if (!SPEAKABLE.test(segment)) continue;
      const lead = segment.length - segment.trimStart().length;
      const start = lineStart + index + lead;
      spans.push({ start, end: start + segment.trim().length });
    }
    lineStart += line.length + 1;
  }
  return spans;
}

/**
 * The picked sentences are always one block. A tap outside it grows it up to that sentence (so tapping the first and
 * the last works, and so does tapping one after another); a tap on an end lets that sentence go; a tap inside makes
 * the block end there.
 */
export function pickSentence(range: SentenceRange | null, tapped: number): SentenceRange | null {
  if (!range) return { from: tapped, to: tapped };
  const { from, to } = range;
  if (tapped < from) return { from: tapped, to };
  if (tapped > to) return { from, to: tapped };
  if (from === to) return null;
  if (tapped === from) return { from: from + 1, to };
  if (tapped === to) return { from, to: to - 1 };
  return { from, to: tapped };
}

/** Every sentence of a text with `count` sentences. */
export function allSentences(count: number): SentenceRange | null {
  return count > 0 ? { from: 0, to: count - 1 } : null;
}

export function spanOf(spans: readonly Passage[], range: SentenceRange): Passage {
  return { start: spans[range.from].start, end: spans[range.to].end };
}
