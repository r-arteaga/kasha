import { TestBed } from '@angular/core/testing';
import { provideTransloco, TranslocoService } from '@jsverse/transloco';
import { firstValueFrom } from 'rxjs';
import { beforeEach, describe, expect, it } from 'vitest';
import { AppLanguage, initialLang } from './app-language';
import { APP_TRANSLOCO_CONFIG, BundledLoader } from './translations';

describe('initialLang', () => {
  it('keeps the language she chose', () => {
    expect(initialLang('ru', 'en')).toBe('ru');
  });

  it("starts in the phone's language when the app speaks it", () => {
    expect(initialLang(null, 'en')).toBe('en');
    expect(initialLang(null, 'ru')).toBe('ru');
  });

  it('starts in Spanish otherwise', () => {
    expect(initialLang(null, 'de')).toBe('es');
    expect(initialLang('fr', undefined)).toBe('es');
  });
});

describe('AppLanguage', () => {
  beforeEach(() => localStorage.clear());

  const fresh = () => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [provideTransloco({ config: APP_TRANSLOCO_CONFIG, loader: BundledLoader })],
    });
    return { language: TestBed.inject(AppLanguage), transloco: TestBed.inject(TranslocoService) };
  };

  it('switches the app texts and the page language', async () => {
    const { language, transloco } = fresh();

    language.set('ru');

    expect(language.lang()).toBe('ru');
    expect(await firstValueFrom(transloco.selectTranslate('settings.title'))).toBe('Настройки');
    expect(document.documentElement.lang).toBe('ru');
  });

  it('remembers the language on the phone', () => {
    fresh().language.set('en');

    expect(fresh().language.lang()).toBe('en');
  });

  it('ignores a language the app does not speak', () => {
    const { language } = fresh();
    language.set('en');

    language.set('fr' as never);

    expect(language.lang()).toBe('en');
    expect(fresh().language.lang()).toBe('en');
  });
});
