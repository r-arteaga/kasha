import {
  type ApplicationConfig,
  computed,
  inject,
  provideAppInitializer,
  provideBrowserGlobalErrorListeners,
  isDevMode,
} from '@angular/core';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { provideTransloco } from '@jsverse/transloco';
import { provideTaiga } from '@taiga-ui/core';
import { TUI_ENGLISH_LANGUAGE } from '@taiga-ui/i18n/languages/english';
import { TUI_RUSSIAN_LANGUAGE } from '@taiga-ui/i18n/languages/russian';
import { TUI_SPANISH_LANGUAGE } from '@taiga-ui/i18n/languages/spanish';
import { TUI_LANGUAGE } from '@taiga-ui/i18n/tokens';
import { routes } from './app.routes';
import { SPEECH_SYNTHESIZER } from './reading/generation/speech-synthesizer';
import { EdgeTtsClient } from './reading/infrastructure/edge-tts-client';
import { AppLanguage } from './settings/app-language';
import { AppTheme } from './settings/app-theme';
import { APP_TRANSLOCO_CONFIG, BundledLoader } from './settings/translations';
import { provideServiceWorker } from '@angular/service-worker';

const TAIGA_LANGUAGES = {
  es: TUI_SPANISH_LANGUAGE,
  en: TUI_ENGLISH_LANGUAGE,
  ru: TUI_RUSSIAN_LANGUAGE,
};

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes, withComponentInputBinding()),
    // No `mode`: AppTheme decides light, dark or the phone's setting (docs/DESIGN.md §1).
    provideTaiga(),
    provideTransloco({ config: APP_TRANSLOCO_CONFIG, loader: BundledLoader }),
    // Taiga's own texts (its buttons and hints) come from TUI_LANGUAGE, not from Transloco; derived from the one
    // language the app keeps, so the two can never disagree.
    {
      provide: TUI_LANGUAGE,
      useFactory: () => {
        const language = inject(AppLanguage);
        return computed(() => TAIGA_LANGUAGES[language.lang()]);
      },
    },
    // Restores the saved language and theme before the first screen renders, whichever screen it is.
    provideAppInitializer(() => {
      inject(AppLanguage);
      inject(AppTheme);
    }),
    { provide: SPEECH_SYNTHESIZER, useExisting: EdgeTtsClient },
    provideServiceWorker('ngsw-worker.js', {
      enabled: !isDevMode(),
      registrationStrategy: 'registerWhenStable:30000',
    }),
  ],
};
