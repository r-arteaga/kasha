import { Injectable, isDevMode } from '@angular/core';
import type { Translation, TranslocoConfig, TranslocoLoader } from '@jsverse/transloco';
import { type Observable, of } from 'rxjs';
import en from '../../i18n/en.json';
import es from '../../i18n/es.json';
import ru from '../../i18n/ru.json';

export type AppLang = 'es' | 'en' | 'ru';

export const APP_LANGS: readonly AppLang[] = ['es', 'en', 'ru'];

/** Each language named in itself, so she finds hers even when the app speaks another one. */
export const LANG_NAMES: Record<AppLang, string> = { es: 'Español', en: 'English', ru: 'Русский' };

export const CATALOGS: Record<AppLang, Translation> = { es, en, ru };

export function isAppLang(value: unknown): value is AppLang {
  return typeof value === 'string' && (APP_LANGS as readonly string[]).includes(value);
}

export const APP_TRANSLOCO_CONFIG: Partial<TranslocoConfig> = {
  availableLangs: [...APP_LANGS],
  defaultLang: 'es',
  fallbackLang: 'es',
  reRenderOnLangChange: true,
  prodMode: !isDevMode(),
};

/**
 * Kasha is an installed app that has to open offline, so instead of fetching `assets/i18n/{lang}.json` over HTTP the
 * three catalogs travel inside the bundle (a few kB) and a language is there the moment it is chosen.
 */
@Injectable({ providedIn: 'root' })
export class BundledLoader implements TranslocoLoader {
  getTranslation(lang: string): Observable<Translation> {
    return of(CATALOGS[isAppLang(lang) ? lang : 'es']);
  }
}
