import { describe, expect, it } from 'vitest';
import { nextSentenceStart, previousSentenceStart, sentenceEndAction, turnLengthMs } from './shadowing';
import { buildTimeline } from './timeline';

// Three sentences: 0–2 s, 2–5 s, 5–6 s.
const { sentences } = buildTimeline(
  [2, 3, 1].map((audioSeconds, i) => ({
    draft: { text: `Satz ${i}.`, paragraph: 0 },
    words: [{ text: 'Satz', offsetMs: 100, durationMs: 300 }],
    audioSeconds,
  })),
);

const plain = { repeat: false, pauseToRepeat: false, rate: 1 };

describe('sentenceEndAction', () => {
  it('plays straight into the next sentence when no practice mode is on', () => {
    expect(sentenceEndAction(sentences, 0, plain)).toEqual({ kind: 'next' });
  });

  it('lets the text end after the last sentence', () => {
    expect(sentenceEndAction(sentences, 2, plain)).toEqual({ kind: 'end' });
  });

  it('starts the same sentence again when repeating, without waiting', () => {
    expect(sentenceEndAction(sentences, 1, { ...plain, repeat: true })).toEqual({ kind: 'restart' });
    expect(sentenceEndAction(sentences, 2, { ...plain, repeat: true })).toEqual({ kind: 'restart' });
  });

  it('gives her a turn to repeat before going on, also after the last sentence', () => {
    const options = { ...plain, pauseToRepeat: true };

    expect(sentenceEndAction(sentences, 0, options)).toEqual({ kind: 'turn', ms: 2500, then: 'next' });
    expect(sentenceEndAction(sentences, 2, options)).toEqual({ kind: 'turn', ms: 1500, then: 'end' });
  });

  it('combines both: a turn, then the same sentence again', () => {
    expect(sentenceEndAction(sentences, 1, { repeat: true, pauseToRepeat: true, rate: 1 })).toEqual({
      kind: 'turn',
      ms: 3500,
      then: 'restart',
    });
  });
});

describe('turnLengthMs', () => {
  it('lasts as long as the sentence sounded, plus half a second to start', () => {
    expect(turnLengthMs(sentences[1], 1)).toBe(3500);
  });

  it('grows when the audio is slowed down, since she repeats at that pace', () => {
    expect(turnLengthMs(sentences[1], 0.5)).toBe(6500);
  });
});

describe('previousSentenceStart', () => {
  it('goes back to the start of the current sentence once it has been playing for a second', () => {
    expect(previousSentenceStart(sentences, 3.5, 1)).toBe(2);
  });

  it('goes to the previous sentence when the current one has only just started', () => {
    expect(previousSentenceStart(sentences, 2.4, 1)).toBe(0);
  });

  it('measures that second in real time, so it is longer in audio time at a slower speed', () => {
    // 0.8 s of audio at 0.5× took 1.6 s to hear.
    expect(previousSentenceStart(sentences, 2.8, 0.5)).toBe(2);
    expect(previousSentenceStart(sentences, 2.4, 0.5)).toBe(0);
  });

  it('stays at the beginning on the first sentence', () => {
    expect(previousSentenceStart(sentences, 0.3, 1)).toBe(0);
  });

  it('replays the sentence just heard when called right at the end of it', () => {
    expect(previousSentenceStart(sentences, 5, 1)).toBe(2);
  });
});

describe('nextSentenceStart', () => {
  it('jumps to the start of the next sentence', () => {
    expect(nextSentenceStart(sentences, 0.7)).toBe(2);
    expect(nextSentenceStart(sentences, 2)).toBe(5);
  });

  it('has nowhere to go from the last sentence', () => {
    expect(nextSentenceStart(sentences, 5.5)).toBeNull();
  });
});
