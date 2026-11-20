import { describe, expect, it } from 'vitest';
import type { SentenceDraft } from '../domain/sentences';
import type { SpeechSynthesizer, SynthesizedSentence } from './speech-synthesizer';
import { SynthesisFailedError, voiceSentences } from './voice-sentences';

/** Two Edge TTS frames: 48 ms of audio. */
const audio = () =>
  new Uint8Array([0xff, 0xf3, 0x64, 0xc4, ...new Array<number>(140).fill(0), 0xff, 0xf3, 0x64, 0xc4, ...new Array<number>(140).fill(0)]);

const drafts = (...texts: string[]): SentenceDraft[] => texts.map((text) => ({ text, paragraph: 0 }));

class FakeSynthesizer implements SpeechSynthesizer {
  active = 0;
  maxActive = 0;
  calls: string[] = [];
  failuresLeft = new Map<string, number>();

  async synthesize(text: string): Promise<SynthesizedSentence> {
    this.calls.push(text);
    this.active += 1;
    this.maxActive = Math.max(this.maxActive, this.active);
    await new Promise((resolve) => setTimeout(resolve, text.length));
    this.active -= 1;
    const failures = this.failuresLeft.get(text) ?? 0;
    if (failures > 0) {
      this.failuresLeft.set(text, failures - 1);
      throw new Error('network down');
    }
    return { audio: audio(), words: [{ text: text.split(' ')[0], offsetMs: 10, durationMs: 20 }] };
  }
}

const noWait = () => Promise.resolve();

describe('voiceSentences', () => {
  it('voices every sentence and keeps them in the text order, whatever order they finish in', async () => {
    const synthesizer = new FakeSynthesizer();

    const result = await voiceSentences(drafts('a long first sentence', 'b', 'c c'), 'de-DE-KatjaNeural', synthesizer, {
      wait: noWait,
    });

    expect(result.voiced.map((sentence) => sentence.draft.text)).toEqual(['a long first sentence', 'b', 'c c']);
    expect(result.voiced.every((sentence) => Math.abs(sentence.audioSeconds - 0.048) < 1e-9)).toBe(true);
    expect(result.voiced[0].words).toEqual([{ text: 'a', offsetMs: 10, durationMs: 20 }]);
    expect(result.audio).toHaveLength(3);
  });

  it('runs at most three requests at once', async () => {
    const synthesizer = new FakeSynthesizer();

    await voiceSentences(drafts('one', 'two', 'three', 'four', 'five', 'six', 'seven'), 'v', synthesizer, {
      wait: noWait,
    });

    expect(synthesizer.maxActive).toBe(3);
    expect(synthesizer.calls).toHaveLength(7);
  });

  it('reports progress after each sentence', async () => {
    const progress: number[] = [];

    await voiceSentences(drafts('a', 'b', 'c'), 'v', new FakeSynthesizer(), {
      wait: noWait,
      onProgress: (done) => progress.push(done),
    });

    expect(progress).toEqual([1, 2, 3]);
  });

  it('retries a failed sentence twice before giving up', async () => {
    const synthesizer = new FakeSynthesizer();
    synthesizer.failuresLeft.set('b', 2);

    const result = await voiceSentences(drafts('a', 'b'), 'v', synthesizer, { wait: noWait });

    expect(result.voiced).toHaveLength(2);
    expect(synthesizer.calls.filter((text) => text === 'b')).toHaveLength(3);
  });

  it('fails with a typed error when a sentence keeps failing', async () => {
    const synthesizer = new FakeSynthesizer();
    synthesizer.failuresLeft.set('b', 3);

    await expect(voiceSentences(drafts('a', 'b'), 'v', synthesizer, { wait: noWait })).rejects.toBeInstanceOf(
      SynthesisFailedError,
    );
  });
});
