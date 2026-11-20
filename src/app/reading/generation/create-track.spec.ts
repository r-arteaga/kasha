import { describe, expect, it } from 'vitest';
import type { SpeechSynthesizer } from './speech-synthesizer';
import { createTrack, NothingToReadError } from './create-track';

const frame = [0xff, 0xf3, 0x64, 0xc4, ...new Array<number>(140).fill(0)];

const synthesizer: SpeechSynthesizer = {
  synthesize: async (text) => ({
    // One 24 ms frame per character keeps the arithmetic easy to follow.
    audio: new Uint8Array(Array.from({ length: text.length }, () => frame).flat()),
    words: [{ text: text.split(/\s/)[0].replace(/[.!?]/g, ''), offsetMs: 0, durationMs: 10 }],
  }),
};

describe('createTrack', () => {
  it('voices the text into one audio file with every sentence on its timeline', async () => {
    const track = await createTrack(
      { text: 'Guten Tag. Wie geht es dir?', locale: 'de-DE', voice: 'de-DE-KatjaNeural' },
      synthesizer,
      { wait: () => Promise.resolve() },
    );

    expect(track.locale).toBe('de-DE');
    expect(track.voice).toBe('de-DE-KatjaNeural');
    expect(track.text).toBe('Guten Tag. Wie geht es dir?');
    expect(track.sentences.map((s) => [s.text, s.start, s.end])).toEqual([
      ['Guten Tag.', 0, 0.24],
      ['Wie geht es dir?', 0.24, 0.624],
    ]);
    expect(track.duration).toBe(0.624);
    expect(track.audio.type).toBe('audio/mpeg');
    expect(track.audio.size).toBe(26 * 144);
    expect(track.id).toMatch(/^[0-9a-f-]{36}$/);
    expect(track.createdAt).toBeGreaterThan(0);
  });

  it('titles the track with its first sentence, shortened when long', async () => {
    const long = `${'Sehr '.repeat(20)}lang.`;

    const short = await createTrack({ text: 'Hallo. Tschüss.', locale: 'de-DE', voice: 'v' }, synthesizer);
    const cut = await createTrack({ text: long, locale: 'de-DE', voice: 'v' }, synthesizer);

    expect(short.title).toBe('Hallo.');
    expect(cut.title.length).toBeLessThanOrEqual(60);
    expect(cut.title.endsWith('…')).toBe(true);
  });

  it('refuses a text with nothing to read', async () => {
    await expect(createTrack({ text: ' \n --- ', locale: 'de-DE', voice: 'v' }, synthesizer)).rejects.toBeInstanceOf(
      NothingToReadError,
    );
  });
});
