import { describe, expect, it } from 'vitest';
import { readingUnits } from './reading-units';
import { sentenceSegments, type Sentence } from './timeline';

function sentence(text: string, words: string[]): Sentence {
  let cursor = 0;
  return {
    index: 0,
    paragraph: 0,
    text,
    start: 0,
    end: 1,
    words: words.map((word) => {
      const charStart = text.indexOf(word, cursor);
      cursor = charStart + word.length;
      return { text: word, start: 0, end: 1, charStart, charEnd: cursor };
    }),
  };
}

const units = (s: Sentence) => readingUnits(sentenceSegments(s));

describe('readingUnits', () => {
  it('keeps each punctuation mark with the word before it, so a mark never starts a line', () => {
    expect(units(sentence('有茶，有牛奶。', ['有', '茶', '有', '牛奶']))).toEqual([
      { word: 0, text: '有', before: '', after: '', space: false },
      { word: 1, text: '茶', before: '', after: '，', space: false },
      { word: 2, text: '有', before: '', after: '', space: false },
      { word: 3, text: '牛奶', before: '', after: '。', space: false },
    ]);
  });

  it('keeps the spaces between words where the language has them', () => {
    expect(units(sentence('저는 학생이에요.', ['저는', '학생이에요']))).toEqual([
      { word: 0, text: '저는', before: '', after: '', space: true },
      { word: 1, text: '학생이에요', before: '', after: '.', space: false },
    ]);
  });

  it('puts an opening quote with the word after it', () => {
    expect(units(sentence('他说：“我好。”', ['他', '说', '我', '好']))).toEqual([
      { word: 0, text: '他', before: '', after: '', space: false },
      { word: 1, text: '说', before: '', after: '：', space: false },
      { word: 2, text: '我', before: '“', after: '', space: false },
      { word: 3, text: '好', before: '', after: '。”', space: false },
    ]);
  });

  it('keeps text before the first word, with its space', () => {
    expect(units(sentence('— 안녕!', ['안녕']))).toEqual([
      { word: 0, text: '안녕', before: '—\u00a0', after: '!', space: false },
    ]);
  });

  it('keeps the spaces around text the voice did not report as a word (numbers it reads aloud)', () => {
    expect(units(sentence('사과 3개 주세요.', ['사과', '주세요']))).toEqual([
      { word: 0, text: '사과', before: '', after: '', space: true },
      { word: 1, text: '주세요', before: '3개\u00a0', after: '.', space: false },
    ]);
    expect(units(sentence('지금은 3시', ['지금은']))).toEqual([
      { word: 0, text: '지금은', before: '', after: '\u00a03시', space: false },
    ]);
  });
});
