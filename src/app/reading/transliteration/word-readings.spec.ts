import { describe, expect, it } from 'vitest';
import { readingKind, wordReadings } from './word-readings';

/** A sentence cut into the words the voice reports, as the timeline keeps them (character ranges). */
function sentence(text: string, words: string[]) {
  let cursor = 0;
  return {
    text,
    words: words.map((word) => {
      const charStart = text.indexOf(word, cursor);
      cursor = charStart + word.length;
      return { text: word, charStart, charEnd: cursor };
    }),
  };
}

describe('readingKind', () => {
  it('reads Chinese in pinyin and Korean in Latin letters, and nothing else', () => {
    expect(readingKind('zh-CN')).toBe('pinyin');
    expect(readingKind('zh-TW')).toBe('pinyin');
    expect(readingKind('ko-KR')).toBe('romanization');
    expect(readingKind('es-ES')).toBeNull();
    expect(readingKind('ru-RU')).toBeNull();
  });
});

describe('wordReadings', () => {
  it('puts the pinyin of each spoken word over it, its syllables joined (Svet: 牛奶 = niúnǎi)', async () => {
    const readings = await wordReadings(
      [sentence('有茶，有牛奶，还有水。', ['有', '茶', '有', '牛奶', '还有', '水'])],
      'zh-CN',
    );

    expect(readings).toEqual([['yǒu', 'chá', 'yǒu', 'niúnǎi', 'háiyǒu', 'shuǐ']]);
  });

  it('reads each character as its sentence asks, not one word at a time', async () => {
    const readings = await wordReadings(
      [
        sentence('你是不是学生？', ['你', '是不是', '学生']),
        sentence('孩子长大了，个子很长。', ['孩子', '长大', '了', '个子', '很', '长']),
      ],
      'zh-CN',
    );

    expect(readings).toEqual([
      ['nǐ', 'shìbushì', 'xuéshēng'],
      ['háizi', 'zhǎngdà', 'le', 'gèzi', 'hěn', 'cháng'],
    ]);
  });

  it('separates syllables with an apostrophe where a dictionary does (西安 xī’ān)', async () => {
    const readings = await wordReadings([sentence('西安和平安', ['西安', '和', '平安'])], 'zh-CN');

    expect(readings).toEqual([["xī'ān", 'hé', "píng'ān"]]);
  });

  it('corrects the readings the converter gets wrong (行人, 还钱)', async () => {
    const readings = await wordReadings(
      [
        sentence('他走在行人中间。', ['他', '走', '在', '行人', '中间']),
        sentence('我还没还钱。', ['我', '还', '没', '还', '钱']),
      ],
      'zh-CN',
    );

    expect(readings).toEqual([
      ['tā', 'zǒu', 'zài', 'xíngrén', 'zhōngjiān'],
      ['wǒ', 'hái', 'méi', 'huán', 'qián'],
    ]);
  });

  it('leaves words in other scripts without a reading, and keeps its place after a long character', async () => {
    const readings = await wordReadings(
      [sentence('我用iPhone。𠮷中', ['我', '用', 'iPhone', '𠮷', '中'])],
      'zh-CN',
    );

    expect(readings?.[0][2]).toBe('');
    expect(readings?.[0][4]).toBe('zhōng');
  });

  // Svet: "En coreano con romanizacion también".
  it('writes Korean words in Latin letters, sound changes included', async () => {
    const readings = await wordReadings(
      [
        sentence('안녕하세요.', ['안녕하세요']),
        sentence('저는 학생이에요.', ['저는', '학생이에요']),
        sentence('같이 한국말 공부해요.', ['같이', '한국말', '공부해요']),
      ],
      'ko-KR',
    );

    expect(readings).toEqual([
      ['annyeonghaseyo'],
      ['jeoneun', 'haksaengieyo'],
      ['gachi', 'hangungmal', 'gongbuhaeyo'],
    ]);
  });

  it('leaves Korean words without Hangul as they are', async () => {
    const readings = await wordReadings([sentence('BTS 좋아요', ['BTS', '좋아요'])], 'ko-KR');

    expect(readings).toEqual([['', 'joayo']]);
  });

  it('has nothing to add for languages written in Latin letters', async () => {
    expect(
      await wordReadings([sentence('Hola, ¿qué tal?', ['Hola', 'qué', 'tal'])], 'es-ES'),
    ).toBeNull();
  });
});
