import type { Segment } from './timeline';

/**
 * One spoken word as it is laid out when its reading (pinyin, romanization) sits over it: the word, the punctuation
 * glued to it, and whether a space follows. A unit never breaks across lines, so a mark never starts a line and
 * the reading stays over its word.
 */
export interface ReadingUnit {
  /** Index of the word in its sentence. */
  word: number;
  text: string;
  /** An opening mark or text before the first word ("“", "— "). */
  before: string;
  /** The marks right after the word ("，", "。”"). */
  after: string;
  /** A space follows (languages that write spaces between words). */
  space: boolean;
}

const OPENING = /[\p{Ps}\p{Pi}]+$/u;

/** A space inside a unit: a plain one would vanish at the edge of the word's column. */
const NBSP = '\u00a0';

/** Groups a sentence's segments into units: every piece of text between words goes to the word it belongs to. */
export function readingUnits(segments: readonly Segment[]): ReadingUnit[] {
  const units: ReadingUnit[] = [];
  let pending = '';
  for (const segment of segments) {
    if (segment.word >= 0) {
      units.push({
        word: segment.word,
        text: segment.text,
        before: pending.replace(/\s+$/u, NBSP),
        after: '',
        space: false,
      });
      pending = '';
      continue;
    }
    const last = units.at(-1);
    if (!last) {
      pending += segment.text;
      continue;
    }
    // Marks up to the first space close the previous word; an opening mark at their end opens the next one.
    const [, marks, space, rest] = /^(\S*)(\s*)([\s\S]*)$/u.exec(segment.text) ?? [
      '',
      segment.text,
      '',
      '',
    ];
    const opening = space || rest ? '' : (OPENING.exec(marks)?.[0] ?? '');
    last.after += marks.slice(0, marks.length - opening.length);
    last.space ||= space.length > 0;
    pending += opening + rest;
  }
  // Text after the last word (a number the voice did not report) keeps the space before it.
  const last = units.at(-1);
  if (last && pending.trim()) {
    last.after += (last.space ? NBSP : '') + pending.trimEnd();
    last.space = false;
  }
  return units;
}
