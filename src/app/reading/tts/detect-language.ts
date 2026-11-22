/**
 * Guesses the language of a pasted text on the phone, with no service: first by its writing system (Chinese,
 * Japanese, Korean, Cyrillic…), then, for texts in Latin letters, by their most common short words.
 * Returns a language code ("zh", "es"…) or null when the text has no letters.
 */
export function detectLanguage(text: string): string | null {
  const counts = new Map<Script, number>();
  for (const char of text) {
    const script = scriptOf(char);
    if (script) counts.set(script, (counts.get(script) ?? 0) + 1);
  }
  // Kana and Han are one group: Japanese mixes both, Chinese uses Han only.
  const cjk = (counts.get('han') ?? 0) + (counts.get('kana') ?? 0);
  let best: Script | 'cjk' | null = null;
  let bestCount = 0;
  for (const [script, count] of [...counts, ['cjk', cjk] as const]) {
    if (script === 'han' || script === 'kana') continue;
    if (count > bestCount) {
      best = script;
      bestCount = count;
    }
  }
  switch (best) {
    case null:
      return null;
    case 'cjk':
      return (counts.get('kana') ?? 0) > 0 ? 'ja' : 'zh';
    case 'cyrillic':
      return /[іїєґІЇЄҐ]/.test(text) ? 'uk' : 'ru';
    case 'latin':
      return latinLanguage(text);
    default:
      return SCRIPT_LANGUAGE[best];
  }
}

type Script = 'latin' | 'han' | 'kana' | 'hangul' | 'cyrillic' | 'greek' | 'hebrew' | 'arabic' | 'thai' | 'devanagari';

const SCRIPT_LANGUAGE: Record<Exclude<Script, 'latin' | 'han' | 'kana' | 'cyrillic'>, string> = {
  hangul: 'ko',
  greek: 'el',
  hebrew: 'he',
  arabic: 'ar',
  thai: 'th',
  devanagari: 'hi',
};

const SCRIPTS: readonly [Script, RegExp][] = [
  ['latin', /\p{Script=Latin}/u],
  ['han', /\p{Script=Han}/u],
  ['kana', /[\p{Script=Hiragana}\p{Script=Katakana}]/u],
  ['hangul', /\p{Script=Hangul}/u],
  ['cyrillic', /\p{Script=Cyrillic}/u],
  ['greek', /\p{Script=Greek}/u],
  ['hebrew', /\p{Script=Hebrew}/u],
  ['arabic', /\p{Script=Arabic}/u],
  ['thai', /\p{Script=Thai}/u],
  ['devanagari', /\p{Script=Devanagari}/u],
];

function scriptOf(char: string): Script | null {
  for (const [script, pattern] of SCRIPTS) if (pattern.test(char)) return script;
  return null;
}

/** The most frequent short words of each language written in Latin letters. */
const COMMON_WORDS: Record<string, readonly string[]> = {
  en: ['the', 'and', 'of', 'to', 'is', 'in', 'that', 'it', 'you', 'was', 'for', 'on', 'are', 'with', 'i', 'this', 'have', 'not', 'what', 'my'],
  es: ['el', 'la', 'los', 'las', 'de', 'que', 'y', 'en', 'un', 'una', 'es', 'por', 'con', 'para', 'no', 'se', 'lo', 'como', 'pero', 'del', 'muy', 'yo', 'está'],
  fr: ['le', 'la', 'les', 'de', 'des', 'et', 'est', 'un', 'une', 'que', 'qui', 'dans', 'pour', 'pas', 'je', 'vous', 'il', 'ne', 'sur', 'du', 'ce', 'suis'],
  de: ['der', 'die', 'das', 'und', 'ist', 'nicht', 'ein', 'eine', 'ich', 'zu', 'den', 'mit', 'von', 'sie', 'es', 'auf', 'dem', 'für', 'wir', 'bin'],
  it: ['il', 'la', 'di', 'che', 'e', 'è', 'un', 'una', 'per', 'non', 'sono', 'in', 'del', 'della', 'mi', 'gli', 'lo', 'ho', 'sei'],
  pt: ['o', 'a', 'os', 'as', 'de', 'que', 'e', 'é', 'um', 'uma', 'não', 'para', 'com', 'do', 'da', 'em', 'no', 'na', 'você', 'eu', 'muito'],
};

/** Letters only one of these languages uses, worth several common words. */
const TELLTALE: readonly [RegExp, string][] = [
  [/[ñ¿¡]/i, 'es'],
  [/[ãõ]/i, 'pt'],
  [/[ßäöü]/i, 'de'],
  [/[œàèùâêîôûëïç]/i, 'fr'],
];

function latinLanguage(text: string): string {
  const words = text.toLocaleLowerCase().match(/\p{L}+/gu) ?? [];
  const scores = new Map<string, number>();
  for (const [language, list] of Object.entries(COMMON_WORDS)) {
    const set = new Set(list);
    scores.set(language, words.filter((word) => set.has(word)).length);
  }
  for (const [pattern, language] of TELLTALE) {
    if (pattern.test(text)) scores.set(language, (scores.get(language) ?? 0) + 3);
  }
  let best = 'en';
  let bestScore = 0;
  for (const [language, score] of scores) {
    if (score > bestScore) {
      best = language;
      bestScore = score;
    }
  }
  return best;
}
