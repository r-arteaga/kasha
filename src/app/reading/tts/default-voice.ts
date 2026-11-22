import { Injectable, signal } from '@angular/core';
import { readStored, store } from '../../shared/local-storage';
import type { Voice } from './voices';

/** The kind of voice she prefers; every language then reads with a voice of that kind. */
export type VoiceGender = 'Female' | 'Male';

const KEY = 'kalare.voiceGender';

/** The voice kind she chose in Ajustes, kept on the phone (a woman's voice until she changes it). */
@Injectable({ providedIn: 'root' })
export class DefaultVoice {
  readonly gender = signal<VoiceGender>(readStored<VoiceGender>(KEY) === 'Male' ? 'Male' : 'Female');

  set(gender: VoiceGender): void {
    this.gender.set(gender);
    store(KEY, gender);
  }
}

/** The usual variety of each language when it is spoken in several countries. */
const MAIN_LOCALE: Record<string, string> = {
  ar: 'ar-SA',
  de: 'de-DE',
  en: 'en-US',
  es: 'es-ES',
  fr: 'fr-FR',
  it: 'it-IT',
  ko: 'ko-KR',
  ja: 'ja-JP',
  nl: 'nl-NL',
  pt: 'pt-BR',
  ru: 'ru-RU',
  zh: 'zh-CN',
};

/**
 * A voice for a language, picked at random among the voices of the kind she prefers, in the language's usual
 * variety. Voices that read many languages are left for last: they sound less native. Null when the language
 * has no voice at all.
 */
export function pickVoice(
  voices: readonly Voice[],
  language: string,
  gender: VoiceGender,
  random: () => number = Math.random,
): Voice | null {
  const ofLanguage = voices.filter((voice) => voice.locale.split('-')[0] === language);
  if (ofLanguage.length === 0) return null;
  const main = MAIN_LOCALE[language];
  const locale = ofLanguage.some((voice) => voice.locale === main) ? main : ofLanguage[0].locale;
  const ofLocale = ofLanguage.filter((voice) => voice.locale === locale);
  const native = ofLocale.filter((voice) => !voice.name.includes('Multilingual'));
  const pool = native.length > 0 ? native : ofLocale;
  const ofGender = pool.filter((voice) => voice.gender === gender);
  const choices = ofGender.length > 0 ? ofGender : pool;
  return choices[Math.min(choices.length - 1, Math.floor(random() * choices.length))];
}
