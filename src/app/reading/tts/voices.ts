/** An Edge TTS voice, as the `/api/voices` function lists it. */
export interface Voice {
  name: string;
  locale: string;
  gender: string;
}

export interface Language {
  locale: string;
  label: string;
  voices: Voice[];
}

/** The words a voice label uses, in the app's language (the `voice` texts of `src/i18n/*.json`). */
export interface VoiceWords {
  female: string;
  male: string;
  multilingual: string;
}

/** "de-DE-KatjaNeural" → "Katja · mujer"; multilingual voices say so, since they read other languages too. */
export function voiceLabel(voice: Voice, words: VoiceWords): string {
  const speaker = voice.name.slice(voice.locale.length + 1).replace(/Neural$/, '');
  const multilingual = speaker.endsWith('Multilingual');
  const name = multilingual ? speaker.slice(0, -'Multilingual'.length) : speaker;
  const gender = voice.gender === 'Female' ? words.female : voice.gender === 'Male' ? words.male : null;
  return [name, gender, multilingual ? words.multilingual : null].filter(Boolean).join(' · ');
}

const languageNames = new Map<string, Intl.DisplayNames>();

/** "de-DE" → "Alemán (Alemania)" in Spanish, "German (Germany)" in English; the code when it cannot be named. */
export function languageLabel(locale: string, appLang: string): string {
  try {
    let names = languageNames.get(appLang);
    if (!names) {
      names = new Intl.DisplayNames([appLang], { type: 'language' });
      languageNames.set(appLang, names);
    }
    const label = names.of(locale) ?? locale;
    return label.charAt(0).toLocaleUpperCase(appLang) + label.slice(1);
  } catch {
    return locale;
  }
}

export function groupByLanguage(voices: Voice[], appLang: string, words: VoiceWords): Language[] {
  const byLocale = new Map<string, Voice[]>();
  for (const voice of voices) byLocale.set(voice.locale, [...(byLocale.get(voice.locale) ?? []), voice]);

  const compare = (a: string, b: string) => a.localeCompare(b, appLang);
  return Array.from(byLocale, ([locale, list]) => ({
    locale,
    label: languageLabel(locale, appLang),
    voices: [...list].sort((a, b) => compare(voiceLabel(a, words), voiceLabel(b, words))),
  })).sort((a, b) => compare(a.label, b.label));
}
