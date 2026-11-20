import type { SentenceDraft } from './sentences';

/** One spoken word as the TTS function reports it, in milliseconds from the start of its sentence's audio. */
export interface BoundaryWord {
  text: string;
  offsetMs: number;
  durationMs: number;
}

/** A word on the track's timeline (seconds) and its place in the sentence's text (characters). */
export interface Word {
  text: string;
  start: number;
  end: number;
  charStart: number;
  charEnd: number;
}

export interface Sentence {
  index: number;
  paragraph: number;
  text: string;
  start: number;
  end: number;
  words: Word[];
}

export interface Timeline {
  sentences: Sentence[];
  duration: number;
}

export interface VoicedSentence {
  draft: SentenceDraft;
  words: BoundaryWord[];
  audioSeconds: number;
}

export interface Position {
  sentence: number;
  word: number;
}

export interface Segment {
  text: string;
  /** Index of the word in its sentence, or -1 for the text between words. */
  word: number;
}

/** Times are kept to the millisecond, so sums of sentence lengths do not drift. */
const toMs = (seconds: number) => Math.round(seconds * 1000) / 1000;

/**
 * Finds every reported word in the sentence, in order. Edge TTS gives no character positions, so each word is
 * searched from where the previous one ended; a word that cannot be found (a number read out, for instance) is
 * dropped. A word stays lit until the next one starts, and the last one until the sentence ends.
 */
export function alignWords(sentence: string, boundaries: BoundaryWord[], start: number, end: number): Word[] {
  const lower = sentence.toLowerCase();
  const found: Omit<Word, 'end'>[] = [];
  let cursor = 0;

  for (const boundary of boundaries) {
    let at = sentence.indexOf(boundary.text, cursor);
    if (at < 0) at = lower.indexOf(boundary.text.toLowerCase(), cursor);
    if (at < 0) continue;
    const charEnd = at + boundary.text.length;
    found.push({
      text: sentence.slice(at, charEnd),
      start: toMs(start + boundary.offsetMs / 1000),
      charStart: at,
      charEnd,
    });
    cursor = charEnd;
  }

  return found.map((word, i) => ({ ...word, end: i + 1 < found.length ? found[i + 1].start : toMs(end) }));
}

/** Lays the voiced sentences one after another, as their audio is joined into one file. */
export function buildTimeline(voiced: VoicedSentence[]): Timeline {
  let cursor = 0;
  const sentences = voiced.map(({ draft, words, audioSeconds }, index) => {
    const start = cursor;
    const end = toMs(start + audioSeconds);
    cursor = end;
    return { index, paragraph: draft.paragraph, text: draft.text, start, end, words: alignWords(draft.text, words, start, end) };
  });
  return { sentences, duration: cursor };
}

/** Index of the last item whose start is at or before `time`, or -1. */
function lastStartedAt<T extends { start: number }>(items: T[], time: number): number {
  let low = 0;
  let high = items.length - 1;
  let found = -1;
  while (low <= high) {
    const middle = (low + high) >> 1;
    if (items[middle].start <= time) {
      found = middle;
      low = middle + 1;
    } else {
      high = middle - 1;
    }
  }
  return found;
}

/** The sentence and the word being spoken at `time`; the word is -1 in the silence before a sentence's first word. */
export function locate(sentences: Sentence[], time: number): Position {
  if (sentences.length === 0) return { sentence: -1, word: -1 };
  const sentence = Math.max(0, lastStartedAt(sentences, time));
  return { sentence, word: lastStartedAt(sentences[sentence].words, time) };
}

/** The sentence cut into words and the text between them, so every character is shown. */
export function sentenceSegments(sentence: Sentence): Segment[] {
  const segments: Segment[] = [];
  let cursor = 0;
  sentence.words.forEach((word, index) => {
    if (word.charStart > cursor) segments.push({ text: sentence.text.slice(cursor, word.charStart), word: -1 });
    segments.push({ text: sentence.text.slice(word.charStart, word.charEnd), word: index });
    cursor = word.charEnd;
  });
  if (cursor < sentence.text.length) segments.push({ text: sentence.text.slice(cursor), word: -1 });
  return segments;
}
