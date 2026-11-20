import { describe, expect, it } from 'vitest';
import { alignWords, buildTimeline, locate, sentenceSegments } from './timeline';

describe('alignWords', () => {
  it('finds each spoken word in the sentence, in order, and keeps it lit until the next one starts', () => {
    const words = alignWords(
      "I'd rather go, honestly.",
      [
        { text: "I'd", offsetMs: 100, durationMs: 225 },
        { text: 'rather', offsetMs: 340, durationMs: 350 },
        { text: 'go', offsetMs: 700, durationMs: 200 },
        { text: 'honestly', offsetMs: 1200, durationMs: 500 },
      ],
      10,
      12,
    );

    expect(words).toEqual([
      { text: "I'd", start: 10.1, end: 10.34, charStart: 0, charEnd: 3 },
      { text: 'rather', start: 10.34, end: 10.7, charStart: 4, charEnd: 10 },
      { text: 'go', start: 10.7, end: 11.2, charStart: 11, charEnd: 13 },
      { text: 'honestly', start: 11.2, end: 12, charStart: 15, charEnd: 23 },
    ]);
  });

  it('matches a repeated word to its next occurrence, not the first one', () => {
    const words = alignWords(
      'no, no, no',
      [
        { text: 'no', offsetMs: 0, durationMs: 100 },
        { text: 'no', offsetMs: 200, durationMs: 100 },
        { text: 'no', offsetMs: 400, durationMs: 100 },
      ],
      0,
      1,
    );

    expect(words.map((word) => word.charStart)).toEqual([0, 4, 8]);
  });

  it('ignores case differences between the report and the text', () => {
    const [word] = alignWords('Straße', [{ text: 'straße', offsetMs: 0, durationMs: 100 }], 0, 1);

    expect(word).toMatchObject({ charStart: 0, charEnd: 6 });
  });

  it('drops a reported word that is not in the text, without losing the following ones', () => {
    const words = alignWords(
      'Es kostet 5 Euro',
      [
        { text: 'Es', offsetMs: 0, durationMs: 100 },
        { text: 'kostet', offsetMs: 100, durationMs: 100 },
        { text: 'fünf', offsetMs: 200, durationMs: 100 },
        { text: 'Euro', offsetMs: 300, durationMs: 100 },
      ],
      0,
      1,
    );

    expect(words.map((word) => word.text)).toEqual(['Es', 'kostet', 'Euro']);
  });

  it('aligns Japanese morphemes', () => {
    const words = alignWords(
      '昨日、映画を見ました。',
      [
        { text: '昨日', offsetMs: 160, durationMs: 400 },
        { text: '映画', offsetMs: 790, durationMs: 300 },
        { text: 'を', offsetMs: 1090, durationMs: 150 },
        { text: '見', offsetMs: 1240, durationMs: 160 },
      ],
      0,
      2,
    );

    expect(words.map((word) => [word.charStart, word.charEnd])).toEqual([
      [0, 2],
      [3, 5],
      [5, 6],
      [6, 7],
    ]);
  });
});

describe('buildTimeline', () => {
  it('places each sentence after the previous one, using its audio length', () => {
    const timeline = buildTimeline([
      {
        draft: { text: 'Hallo.', paragraph: 0 },
        words: [{ text: 'Hallo', offsetMs: 100, durationMs: 400 }],
        audioSeconds: 1.2,
      },
      {
        draft: { text: 'Wie geht es?', paragraph: 1 },
        words: [
          { text: 'Wie', offsetMs: 100, durationMs: 200 },
          { text: 'geht', offsetMs: 300, durationMs: 200 },
          { text: 'es', offsetMs: 500, durationMs: 200 },
        ],
        audioSeconds: 1.5,
      },
    ]);

    expect(timeline.duration).toBeCloseTo(2.7, 6);
    expect(timeline.sentences.map((s) => [s.index, s.paragraph, s.start, s.end])).toEqual([
      [0, 0, 0, 1.2],
      [1, 1, 1.2, 2.7],
    ]);
    expect(timeline.sentences[1].words[0].start).toBeCloseTo(1.3, 6);
    expect(timeline.sentences[1].words[2].end).toBeCloseTo(2.7, 6);
  });
});

describe('locate', () => {
  const timeline = buildTimeline([
    {
      draft: { text: 'Eins zwei.', paragraph: 0 },
      words: [
        { text: 'Eins', offsetMs: 100, durationMs: 300 },
        { text: 'zwei', offsetMs: 500, durationMs: 300 },
      ],
      audioSeconds: 1,
    },
    {
      draft: { text: 'Drei.', paragraph: 0 },
      words: [{ text: 'Drei', offsetMs: 100, durationMs: 300 }],
      audioSeconds: 1,
    },
  ]);

  it('finds the sentence and the word being spoken', () => {
    expect(locate(timeline.sentences, 0.6)).toEqual({ sentence: 0, word: 1 });
    expect(locate(timeline.sentences, 1.15)).toEqual({ sentence: 1, word: 0 });
  });

  it('has no word lit in the silence before the first word of a sentence', () => {
    expect(locate(timeline.sentences, 0.05)).toEqual({ sentence: 0, word: -1 });
    expect(locate(timeline.sentences, 1.05)).toEqual({ sentence: 1, word: -1 });
  });

  it('stays on the last sentence after the end and on the first before the start', () => {
    expect(locate(timeline.sentences, 9)).toEqual({ sentence: 1, word: 0 });
    expect(locate(timeline.sentences, -1)).toEqual({ sentence: 0, word: -1 });
  });

  it('has nothing to locate in an empty timeline', () => {
    expect(locate([], 0)).toEqual({ sentence: -1, word: -1 });
  });
});

describe('sentenceSegments', () => {
  it('cuts the sentence into plain text and words, keeping every character', () => {
    const [sentence] = buildTimeline([
      {
        draft: { text: '"Ja", sagte er.', paragraph: 0 },
        words: [
          { text: 'Ja', offsetMs: 0, durationMs: 100 },
          { text: 'sagte', offsetMs: 100, durationMs: 100 },
          { text: 'er', offsetMs: 200, durationMs: 100 },
        ],
        audioSeconds: 1,
      },
    ]).sentences;

    expect(sentenceSegments(sentence)).toEqual([
      { text: '"', word: -1 },
      { text: 'Ja', word: 0 },
      { text: '", ', word: -1 },
      { text: 'sagte', word: 1 },
      { text: ' ', word: -1 },
      { text: 'er', word: 2 },
      { text: '.', word: -1 },
    ]);
  });
});
