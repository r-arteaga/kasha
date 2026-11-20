import { allSentences, pickSentence, sentenceSpans, spanOf } from './sentence-pick';

describe('sentenceSpans', () => {
  it('finds each sentence of each line with its place in the whole text, without the space around it', () => {
    const text = 'Im Café\nIch hätte gern Kaffee.  Haben Sie Kuchen?\n\n  Ja.';
    const spans = sentenceSpans(text);

    expect(spans.map((s) => text.slice(s.start, s.end))).toEqual([
      'Im Café',
      'Ich hätte gern Kaffee.',
      'Haben Sie Kuchen?',
      'Ja.',
    ]);
  });

  it('skips lines with nothing to read', () => {
    expect(sentenceSpans('---\n***\nHallo.').map((s) => s.start)).toEqual([8]);
    expect(sentenceSpans('')).toEqual([]);
  });
});

describe('pickSentence', () => {
  it('the first tap picks one sentence; a second tap on another makes the range between them, in any order', () => {
    const first = pickSentence(null, 3);
    expect(first).toEqual({ from: 3, to: 3 });
    expect(pickSentence(first, 5)).toEqual({ from: 3, to: 5 });
    expect(pickSentence(first, 1)).toEqual({ from: 1, to: 3 });
  });

  it('tapping the only picked sentence again lets it go', () => {
    expect(pickSentence({ from: 2, to: 2 }, 2)).toBeNull();
  });

  it('tapping one sentence after another grows the block, up or down', () => {
    let range = pickSentence(null, 2);
    range = pickSentence(range, 3);
    range = pickSentence(range, 4);
    expect(range).toEqual({ from: 2, to: 4 });
    expect(pickSentence(range, 1)).toEqual({ from: 1, to: 4 });
    expect(pickSentence(range, 7)).toEqual({ from: 2, to: 7 });
  });

  it('tapping an end of the block lets that sentence go', () => {
    expect(pickSentence({ from: 1, to: 4 }, 1)).toEqual({ from: 2, to: 4 });
    expect(pickSentence({ from: 1, to: 4 }, 4)).toEqual({ from: 1, to: 3 });
  });

  it('tapping inside the block makes it end there', () => {
    expect(pickSentence({ from: 1, to: 6 }, 3)).toEqual({ from: 1, to: 3 });
  });

  it('allSentences picks every sentence, or none when there are none', () => {
    expect(allSentences(5)).toEqual({ from: 0, to: 4 });
    expect(allSentences(0)).toBeNull();
  });

  it('spanOf turns the picked sentences into the passage of the text', () => {
    const spans = sentenceSpans('Eins. Zwei. Drei.');
    expect(spanOf(spans, { from: 1, to: 2 })).toEqual({ start: 6, end: 17 });
  });
});
