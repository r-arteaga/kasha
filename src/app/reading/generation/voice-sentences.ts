import { mp3DurationSeconds } from '../domain/mp3-duration';
import type { SentenceDraft } from '../domain/sentences';
import type { VoicedSentence } from '../domain/timeline';
import type { SpeechSynthesizer } from './speech-synthesizer';

export class SynthesisFailedError extends Error {
  constructor(readonly sentence: string, options?: { cause?: unknown }) {
    super(`Could not voice the sentence "${sentence.slice(0, 40)}"`, options);
    this.name = 'SynthesisFailedError';
  }
}

export interface VoiceOptions {
  /** Requests at the same time; a few keep a long text quick without flooding the free endpoint. */
  concurrency?: number;
  /** Extra attempts per sentence after the first one fails. */
  retries?: number;
  onProgress?: (done: number, total: number) => void;
  signal?: AbortSignal;
  /** Pause before a retry; replaced in tests. */
  wait?: (ms: number) => Promise<void>;
}

export interface VoicedText {
  voiced: VoicedSentence[];
  /** Each sentence's MP3, in text order, ready to be joined into one file. */
  audio: Uint8Array[];
}

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/** Voices every sentence (a few at a time, retrying failures) and returns them in the order of the text. */
export async function voiceSentences(
  drafts: SentenceDraft[],
  voice: string,
  synthesizer: SpeechSynthesizer,
  { concurrency = 3, retries = 2, onProgress, signal, wait = sleep }: VoiceOptions = {},
): Promise<VoicedText> {
  const voiced: VoicedSentence[] = new Array(drafts.length);
  const audio: Uint8Array[] = new Array(drafts.length);
  let next = 0;
  let done = 0;

  async function voiceOne(index: number): Promise<void> {
    const draft = drafts[index];
    for (let attempt = 0; ; attempt += 1) {
      signal?.throwIfAborted();
      try {
        const result = await synthesizer.synthesize(draft.text, voice, signal);
        voiced[index] = { draft, words: result.words, audioSeconds: mp3DurationSeconds(result.audio) };
        audio[index] = result.audio;
        return;
      } catch (error) {
        if (signal?.aborted) throw error;
        if (attempt >= retries) throw new SynthesisFailedError(draft.text, { cause: error });
        await wait(500 * (attempt + 1));
      }
    }
  }

  async function worker(): Promise<void> {
    while (next < drafts.length) {
      const index = next;
      next += 1;
      await voiceOne(index);
      done += 1;
      onProgress?.(done, drafts.length);
    }
  }

  await Promise.all(Array.from({ length: Math.min(concurrency, drafts.length) }, worker));
  return { voiced, audio };
}
