import { computed, inject, Injectable, type Signal, signal } from '@angular/core';
import { translateObjectSignal } from '@jsverse/transloco';
import { AppLanguage } from '../../settings/app-language';
import { readStored, store } from '../../shared/local-storage';
import { EdgeTtsClient } from '../infrastructure/edge-tts-client';
import { groupByLanguage, type Language, type Voice, type VoiceWords } from './voices';

const CACHE_KEY = 'kalare.voices';
const CHOICE_KEY = 'kalare.voice';
const CACHE_DAYS = 7;

interface CachedVoices {
  savedAt: number;
  voices: Voice[];
}

export type CatalogState = 'loading' | 'ready' | 'failed';

/** Edge TTS voices grouped by language, kept on the phone for a week, plus the last voice used. */
@Injectable({ providedIn: 'root' })
export class VoiceCatalog {
  private readonly client = inject(EdgeTtsClient);
  private readonly appLanguage = inject(AppLanguage);
  private readonly voices = signal<Voice[]>([]);

  readonly state = signal<CatalogState>('loading');
  /** "mujer", "hombre", "multilingüe" in the app's language, for the voice labels. */
  readonly voiceWords = translateObjectSignal('voice') as Signal<VoiceWords>;
  /** Named and sorted in the app's language, so they follow it when she changes it. */
  readonly languages = computed<Language[]>(() =>
    groupByLanguage(this.voices(), this.appLanguage.lang(), this.voiceWords()),
  );

  async load(): Promise<void> {
    const cached = readStored<CachedVoices>(CACHE_KEY);
    if (cached && Date.now() - cached.savedAt < CACHE_DAYS * 86_400_000 && cached.voices.length > 0) {
      this.voices.set(cached.voices);
      this.state.set('ready');
      return;
    }
    this.state.set('loading');
    try {
      const voices = await this.client.voices();
      this.voices.set(voices);
      store(CACHE_KEY, { savedAt: Date.now(), voices } satisfies CachedVoices);
      this.state.set('ready');
    } catch (error) {
      console.error('Could not load the voices', error);
      this.state.set('failed');
    }
  }

  /** The voice used last time, if it still exists. */
  lastChoice(): Voice | null {
    const name = readStored<string>(CHOICE_KEY);
    return this.voices().find((voice) => voice.name === name) ?? null;
  }

  remember(voice: Voice): void {
    store(CHOICE_KEY, voice.name);
  }
}
