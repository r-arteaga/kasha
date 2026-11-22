import { customPinyin, pinyin } from 'pinyin-pro';
import type { ReadableSentence } from './word-readings';

/**
 * Words pinyin-pro reads wrongly in context (checked on 22 Nov 2026 against the dictionary reading). Add a word
 * here, with its syllables separated by spaces, when Svet finds another one.
 */
const FIXES: Record<string, string> = {
  行人: 'xíng rén',
  还钱: 'huán qián',
};

let fixesLoaded = false;

/**
 * The pinyin of each spoken word, its syllables joined as a dictionary writes them (牛奶 niúnǎi). The whole
 * sentence is read at once so each character gets the reading its context asks for (长大 zhǎng, 很长 cháng),
 * with the tone changes of 一 and 不.
 */
export function sentencePinyin(sentence: ReadableSentence): string[] {
  if (!fixesLoaded) {
    customPinyin(FIXES);
    fixesLoaded = true;
  }
  // Keyed by the character's position in the text (UTF-16), the way the words' ranges count it.
  const syllables: string[] = [];
  let position = 0;
  for (const character of pinyin(sentence.text, { type: 'all' })) {
    if (character.isZh) syllables[position] = character.pinyin;
    position += character.origin.length;
  }
  return sentence.words.map((word) =>
    joinSyllables(syllables.slice(word.charStart, word.charEnd).filter(Boolean)),
  );
}

/** A syllable starting with a, o or e after another one is set off with an apostrophe, as dictionaries do (xī'ān). */
function joinSyllables(syllables: readonly string[]): string {
  return syllables
    .map((syllable, i) =>
      i > 0 && /^[aoeāáǎàōóǒòēéěè]/u.test(syllable) ? `'${syllable}` : syllable,
    )
    .join('');
}
