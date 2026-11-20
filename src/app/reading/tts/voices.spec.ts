import { describe, expect, it } from 'vitest';
import { groupByLanguage, languageLabel, voiceLabel, type VoiceWords } from './voices';

const SPANISH: VoiceWords = { female: 'mujer', male: 'hombre', multilingual: 'multilingüe' };
const RUSSIAN: VoiceWords = { female: 'женский', male: 'мужской', multilingual: 'многоязычный' };

describe('voiceLabel', () => {
  it('shows the speaker name and who is speaking', () => {
    expect(voiceLabel({ name: 'de-DE-KatjaNeural', locale: 'de-DE', gender: 'Female' }, SPANISH)).toBe('Katja · mujer');
    expect(voiceLabel({ name: 'de-DE-ConradNeural', locale: 'de-DE', gender: 'Male' }, SPANISH)).toBe(
      'Conrad · hombre',
    );
  });

  it('marks multilingual voices, which also read other languages in the text', () => {
    expect(voiceLabel({ name: 'en-US-AvaMultilingualNeural', locale: 'en-US', gender: 'Female' }, SPANISH)).toBe(
      'Ava · mujer · multilingüe',
    );
  });

  it('handles locales with a region variant', () => {
    expect(
      voiceLabel({ name: 'zh-CN-liaoning-XiaobeiNeural', locale: 'zh-CN-liaoning', gender: 'Female' }, SPANISH),
    ).toBe('Xiaobei · mujer');
  });

  it("uses the words of the app's language", () => {
    expect(voiceLabel({ name: 'en-US-AvaMultilingualNeural', locale: 'en-US', gender: 'Female' }, RUSSIAN)).toBe(
      'Ava · женский · многоязычный',
    );
  });
});

describe('languageLabel', () => {
  it('names the language in Spanish, capitalised', () => {
    expect(languageLabel('de-DE', 'es')).toBe('Alemán (Alemania)');
    expect(languageLabel('ja-JP', 'es')).toBe('Japonés (Japón)');
  });

  it("names it in the app's language", () => {
    expect(languageLabel('de-DE', 'en')).toBe('German (Germany)');
    expect(languageLabel('de-DE', 'ru')).toBe('Немецкий (Германия)');
  });

  it('falls back to the code when the browser cannot name it', () => {
    expect(languageLabel('not a locale', 'es')).toBe('not a locale');
  });
});

describe('groupByLanguage', () => {
  const voices = [
    { name: 'ja-JP-NanamiNeural', locale: 'ja-JP', gender: 'Female' },
    { name: 'de-DE-KatjaNeural', locale: 'de-DE', gender: 'Female' },
    { name: 'de-DE-AmalaNeural', locale: 'de-DE', gender: 'Female' },
  ];

  it('groups voices by language, both sorted alphabetically in Spanish', () => {
    const languages = groupByLanguage(voices, 'es', SPANISH);

    expect(languages.map((language) => [language.locale, language.label])).toEqual([
      ['de-DE', 'Alemán (Alemania)'],
      ['ja-JP', 'Japonés (Japón)'],
    ]);
    expect(languages[0].voices.map((voice) => voice.name)).toEqual(['de-DE-AmalaNeural', 'de-DE-KatjaNeural']);
  });

  it("sorts by the names in the app's language", () => {
    const languages = groupByLanguage(
      [...voices, { name: 'es-ES-ElviraNeural', locale: 'es-ES', gender: 'Female' }],
      'en',
      SPANISH,
    );

    expect(languages.map((language) => language.label)).toEqual([
      'European Spanish',
      'German (Germany)',
      'Japanese (Japan)',
    ]);
  });
});
