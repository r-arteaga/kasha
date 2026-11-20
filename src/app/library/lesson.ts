import type { Track } from '../reading/track';

/** A text she keeps to practise from, like a note: a conversation, an article, her own notes. */
export interface Lesson {
  id: string;
  title: string;
  text: string;
  createdAt: number;
  updatedAt: number;
}

/**
 * A voiced passage of a lesson: the part she wants to practise, with its voice, audio and timeline.
 * It keeps its own copy of the passage, so editing the lesson later never breaks it.
 */
export interface Kasha extends Omit<Track, 'audio'> {
  lessonId: string;
  /** Where the passage was in the lesson's text when the kasha was made (characters). */
  start: number;
  end: number;
}

/** A kasha ready to play: its data, its audio and the lesson it belongs to. */
export type KashaTrack = Track & Pick<Kasha, 'lessonId'>;

/** A part of a lesson's text, in characters: `text.slice(start, end)`. */
export interface Passage {
  start: number;
  end: number;
}

const TITLE_LENGTH = 60;

/** The first line of a text, cut at a word near 60 characters: what a lesson is called when she names nothing. */
export function titleFrom(text: string): string {
  const line =
    text
      .split(/\r?\n/)
      .map((l) => l.trim())
      .find((l) => l !== '') ?? '';
  if (line.length <= TITLE_LENGTH) return line;
  const cut = line.slice(0, TITLE_LENGTH - 1);
  const space = cut.lastIndexOf(' ');
  return `${(space > TITLE_LENGTH / 2 ? cut.slice(0, space) : cut).trimEnd()}…`;
}

/** The beginning of a lesson's text for the list, on one line, without the line that already is its title. */
export function previewOf(lesson: Pick<Lesson, 'title' | 'text'>): string {
  const text = lesson.text.trim();
  const rest = text.startsWith(lesson.title) ? text.slice(lesson.title.length) : text;
  return rest.replace(/\s+/g, ' ').trim().slice(0, 200);
}

/** The translation key that says how many kashas there are ("Sin kashas", "1 kasha", "3 kashas"). */
export function kashaCountKey(count: number): 'kashasNone' | 'kashasOne' | 'kashasMany' {
  return count === 0 ? 'kashasNone' : count === 1 ? 'kashasOne' : 'kashasMany';
}

/** Whether the kasha's passage is still where it was in the lesson (it is not after the lesson is edited there). */
export function passageStillThere(lesson: Lesson, kasha: Kasha): boolean {
  return lesson.text.slice(kasha.start, kasha.end) === kasha.text;
}

/** A run of a lesson's text, marked when it belongs to at least one kasha. */
export interface TextRun {
  text: string;
  marked: boolean;
}

/** Cuts the text into runs, marking the passages (which may overlap or touch) so they show as one highlight. */
export function markPassages(text: string, passages: readonly Passage[]): TextRun[] {
  const sorted = passages
    .map((p) => ({ start: Math.max(0, p.start), end: Math.min(text.length, p.end) }))
    .filter((p) => p.start < p.end)
    .sort((a, b) => a.start - b.start);
  const merged: Passage[] = [];
  for (const passage of sorted) {
    const last = merged.at(-1);
    if (last && passage.start <= last.end) last.end = Math.max(last.end, passage.end);
    else merged.push({ ...passage });
  }
  const runs: TextRun[] = [];
  let at = 0;
  for (const { start, end } of merged) {
    if (start > at) runs.push({ text: text.slice(at, start), marked: false });
    runs.push({ text: text.slice(start, end), marked: true });
    at = end;
  }
  if (at < text.length) runs.push({ text: text.slice(at), marked: false });
  return runs;
}

/** "de-DE-KatjaNeural" → "Katja": the voice's name without its language or kind. */
export function speakerOf(voice: string, locale: string): string {
  const name = voice.startsWith(`${locale}-`) ? voice.slice(locale.length + 1) : voice;
  return name.replace(/Neural$/, '').replace(/Multilingual$/, '');
}

/** The passage trimmed of the blank space around it, or null when nothing is left. */
export function trimPassage(text: string, { start, end }: Passage): Passage | null {
  let from = Math.max(0, Math.min(start, end));
  let to = Math.min(text.length, Math.max(start, end));
  while (from < to && /\s/.test(text[from])) from++;
  while (to > from && /\s/.test(text[to - 1])) to--;
  return from < to ? { start: from, end: to } : null;
}
