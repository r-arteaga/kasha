import { locate, type Sentence } from './timeline';

export interface PracticeOptions {
  /** Play the same sentence again and again. */
  repeat: boolean;
  /** Stop after each sentence for as long as it takes to say it back. */
  pauseToRepeat: boolean;
  /** Playback speed, 1 = as generated. */
  rate: number;
}

/** What the player does when the sentence it is playing reaches its end. */
export type SentenceEndAction =
  | { kind: 'next' }
  | { kind: 'end' }
  | { kind: 'restart' }
  | { kind: 'turn'; ms: number; then: 'next' | 'end' | 'restart' };

/** Head start before she begins speaking, on top of the sentence's own length. */
const TURN_MARGIN_MS = 500;
/** "Previous" restarts the current sentence once it has been heard for this long (real time). */
const RESTART_THRESHOLD_S = 1;

/** Her turn lasts as long as the sentence took to hear at the current speed, plus a moment to start. */
export function turnLengthMs(sentence: Sentence, rate: number): number {
  return Math.round(((sentence.end - sentence.start) / rate) * 1000) + TURN_MARGIN_MS;
}

export function sentenceEndAction(sentences: Sentence[], index: number, options: PracticeOptions): SentenceEndAction {
  const isLast = index === sentences.length - 1;
  const then = options.repeat ? 'restart' : isLast ? 'end' : 'next';
  if (options.pauseToRepeat) return { kind: 'turn', ms: turnLengthMs(sentences[index], options.rate), then };
  if (options.repeat) return { kind: 'restart' };
  return isLast ? { kind: 'end' } : { kind: 'next' };
}

/**
 * Where "previous" goes, as music players do: the start of the current sentence once it has been playing for a
 * second, otherwise the start of the one before.
 */
export function previousSentenceStart(sentences: Sentence[], time: number, rate: number): number {
  const { sentence } = locate(sentences, time);
  if (sentence < 0) return 0;
  const current = sentences[sentence];
  if ((time - current.start) / rate > RESTART_THRESHOLD_S) return current.start;
  return sentences[Math.max(0, sentence - 1)].start;
}

/** Where "next" goes, or null on the last sentence. */
export function nextSentenceStart(sentences: Sentence[], time: number): number | null {
  const { sentence } = locate(sentences, time);
  return sentences[sentence + 1]?.start ?? null;
}
