import { DOCUMENT, inject, Injectable, signal } from '@angular/core';
import { getBrowserLang, TranslocoService } from '@jsverse/transloco';
import { readStored, store } from '../shared/local-storage';
import { type AppLang, isAppLang } from './translations';

const KEY = 'kalare.lang';

/** The language she chose; otherwise the phone's, when the app speaks it; otherwise Spanish. */
export function initialLang(saved: unknown, browser: string | undefined): AppLang {
  if (isAppLang(saved)) return saved;
  return isAppLang(browser) ? browser : 'es';
}

/**
 * The language of the app's menus and buttons (not the language she practises, which each text has its own).
 * Kept on the phone; Transloco, Taiga's own texts and `<html lang>` all follow it.
 */
@Injectable({ providedIn: 'root' })
export class AppLanguage {
  private readonly transloco = inject(TranslocoService);
  private readonly document = inject(DOCUMENT);

  readonly lang = signal<AppLang>(initialLang(readStored(KEY), getBrowserLang()));

  constructor() {
    this.apply(this.lang());
  }

  set(lang: AppLang): void {
    if (!isAppLang(lang)) return;
    store(KEY, lang);
    this.apply(lang);
  }

  private apply(lang: AppLang): void {
    this.transloco.setActiveLang(lang);
    this.document.documentElement.lang = lang;
    this.lang.set(lang);
  }
}
