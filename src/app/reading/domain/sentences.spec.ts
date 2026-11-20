import { describe, expect, it } from 'vitest';
import { splitIntoSentences } from './sentences';

describe('splitIntoSentences', () => {
  it('splits a paragraph into its sentences', () => {
    expect(splitIntoSentences('Ich habe Hunger. Hast du auch Hunger? Ja!', 'de-DE')).toEqual([
      { text: 'Ich habe Hunger.', paragraph: 0 },
      { text: 'Hast du auch Hunger?', paragraph: 0 },
      { text: 'Ja!', paragraph: 0 },
    ]);
  });

  it('treats every line as its own paragraph, as AI chats write example lists', () => {
    expect(splitIntoSentences('Erste Zeile\r\n\r\nZweite Zeile\nDritte Zeile', 'de-DE')).toEqual([
      { text: 'Erste Zeile', paragraph: 0 },
      { text: 'Zweite Zeile', paragraph: 1 },
      { text: 'Dritte Zeile', paragraph: 2 },
    ]);
  });

  it('drops markdown marks and list markers that the voice would read aloud', () => {
    expect(splitIntoSentences('## Beispiele\n- **Ich** habe es.\n2. Du _hast_ es.\n* `Er` hat es.', 'de-DE')).toEqual([
      { text: 'Beispiele', paragraph: 0 },
      { text: 'Ich habe es.', paragraph: 1 },
      { text: 'Du hast es.', paragraph: 2 },
      { text: 'Er hat es.', paragraph: 3 },
    ]);
  });

  it('splits Japanese sentences, which have no spaces', () => {
    expect(splitIntoSentences('昨日映画を見ました。面白かったです。', 'ja-JP')).toEqual([
      { text: '昨日映画を見ました。', paragraph: 0 },
      { text: '面白かったです。', paragraph: 0 },
    ]);
  });

  it('skips pieces with nothing to say, such as a lone dash or emoji line', () => {
    expect(splitIntoSentences('Hola.\n---\n...\n\nAdiós.', 'es-ES')).toEqual([
      { text: 'Hola.', paragraph: 0 },
      { text: 'Adiós.', paragraph: 1 },
    ]);
  });

  it('cuts a sentence longer than the limit at spaces, so no request is refused', () => {
    const long = Array.from({ length: 300 }, (_, i) => `word${i}`).join(' ');
    const pieces = splitIntoSentences(long, 'en-US');

    expect(pieces.length).toBeGreaterThan(1);
    expect(pieces.every((piece) => piece.text.length <= 900)).toBe(true);
    expect(pieces.map((piece) => piece.text).join(' ')).toBe(long);
  });

  it('returns nothing for empty text', () => {
    expect(splitIntoSentences('  \n ', 'en-US')).toEqual([]);
  });
});
