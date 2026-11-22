import { romanize } from 'es-hangul';
import type { ReadableSentence } from './word-readings';

const HANGUL = /[ᄀ-ᇿ㄰-㆏가-힣]/;

/**
 * Each spoken Korean word in Latin letters (Revised Romanization), with the sound changes a learner hears:
 * 같이 gachi, 한국말 hangungmal. Words without Hangul ("BTS") get no reading.
 */
export function sentenceRomanization(sentence: ReadableSentence): string[] {
  return sentence.words.map((word) => {
    const text = sentence.text.slice(word.charStart, word.charEnd);
    return HANGUL.test(text) ? romanize(text) : '';
  });
}
