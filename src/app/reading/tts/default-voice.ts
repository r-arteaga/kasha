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

/** The variety a language is read in when the voice list is not loaded yet; null for a language not listed here. */
export function usualLocale(language: string): string | null {
  return MAIN_LOCALE[language] ?? null;
}

/** Voices Microsoft tags as cartoon voices ("Cartoon", "Cute"): they sound like children, and Svet wants adults. */
const CHILD_VOICES = new Set(['zh-CN-XiaoyiNeural', 'zh-CN-YunxiaNeural', 'en-US-AnaNeural']);

/** The voice of each kind where a language has several adult ones; elsewhere the first by name. */
const CHOSEN: Record<string, Partial<Record<VoiceGender, string>>> = {
  'zh-CN': { Female: 'zh-CN-XiaoxiaoNeural', Male: 'zh-CN-YunyangNeural' },
};

/**
 * The voice a language reads with for the kind she prefers, in the language's usual variety. It is always the
 * same one, so every kasha of a language sounds alike (Svet: "Siempre será esas 2 voces para el idioma"). Adult
 * voices only, unless the language has nothing else; voices that read many languages are left for last, as they
 * sound less native. Null when the language has no voice at all.
 */
export function pickVoice(voices: readonly Voice[], language: string, gender: VoiceGender): Voice | null {
  const ofLanguage = voices.filter((voice) => voice.locale.split('-')[0] === language);
  if (ofLanguage.length === 0) return null;
  const main = MAIN_LOCALE[language];
  const locale = ofLanguage.some((voice) => voice.locale === main) ? main : ofLanguage[0].locale;
  const ofLocale = ofLanguage.filter((voice) => voice.locale === locale);
  const adult = preferNonEmpty(ofLocale.filter((voice) => !CHILD_VOICES.has(voice.name)), ofLocale);
  const pool = preferNonEmpty(adult.filter((voice) => !voice.name.includes('Multilingual')), adult);
  const choices = preferNonEmpty(pool.filter((voice) => voice.gender === gender), pool);
  const chosen = CHOSEN[locale]?.[gender];
  return choices.find((voice) => voice.name === chosen) ?? [...choices].sort((a, b) => a.name.localeCompare(b.name))[0];
}

function preferNonEmpty(voices: Voice[], fallback: Voice[]): Voice[] {
  return voices.length > 0 ? voices : fallback;
}
