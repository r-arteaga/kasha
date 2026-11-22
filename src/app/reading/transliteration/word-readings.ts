import type { Word } from '../domain/timeline';

/** How a language's words are shown in Latin letters over the text: pinyin for Chinese, romanization for Korean. */
export type ReadingKind = 'pinyin' | 'romanization';

/** The parts of a sentence a reading needs: its text and where each spoken word sits in it. */
export interface ReadableSentence {
  text: string;
  words: readonly Pick<Word, 'charStart' | 'charEnd'>[];
}

/** One list per sentence, one reading per spoken word ('' for a word with nothing to read, like "iPhone"). */
export type WordReadings = string[][];

export function readingKind(locale: string): ReadingKind | null {
  const language = locale.split('-')[0];
  if (language === 'zh') return 'pinyin';
  if (language === 'ko') return 'romanization';
  return null;
}

/**
 * The reading of every spoken word, worked out on the phone with no AI and no network. The converter is loaded
 * only for the language that needs it (the pinyin dictionary alone is about 300 KB, 110 KB compressed).
 * Null for other languages.
 */
export async function wordReadings(
  sentences: readonly ReadableSentence[],
  locale: string,
): Promise<WordReadings | null> {
  switch (readingKind(locale)) {
    case 'pinyin': {
      const { sentencePinyin } = await import('./pinyin');
      return sentences.map(sentencePinyin);
    }
    case 'romanization': {
      const { sentenceRomanization } = await import('./korean');
      return sentences.map(sentenceRomanization);
    }
    default:
      return null;
  }
}
