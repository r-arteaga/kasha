import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { TranslocoDirective } from '@jsverse/transloco';
import { TuiButton, TuiIcon } from '@taiga-ui/core';
import { TuiProgressBar } from '@taiga-ui/kit';
import { speakerOf } from '../../library/lesson';
import { Library } from '../../library/library';
import { createTrack, NothingToReadError } from '../../reading/generation/create-track';
import { SPEECH_SYNTHESIZER } from '../../reading/generation/speech-synthesizer';
import type { Track } from '../../reading/track';
import { DefaultVoice, pickVoice } from '../../reading/tts/default-voice';
import { detectLanguage } from '../../reading/tts/detect-language';
import { VoiceCatalog } from '../../reading/tts/voice-catalog';
import { languageLabel, type Voice } from '../../reading/tts/voices';
import { AppLanguage } from '../../settings/app-language';
import { PasteDraft } from '../home/paste-draft';
import { PlayerView } from '../player/player-view';
import { SaveSheet } from '../player/save-sheet';

type Stage = 'preparing' | 'ready' | 'noVoice' | 'empty' | 'failed';

/** Languages written in Latin letters are told apart by their common words; English is the guess with none. */
const FALLBACK_LANGUAGE = 'en';

/**
 * The text from the home screen, read aloud: it recognises the language, picks a voice of the kind she prefers,
 * makes the audio and starts playing by itself. She can keep it as a kasha. Route `listen`.
 */
@Component({
  selector: 'k-listen-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [PlayerView, RouterLink, SaveSheet, TranslocoDirective, TuiButton, TuiIcon, TuiProgressBar],
  templateUrl: './listen-page.html',
  styleUrl: './listen-page.css',
})
export class ListenPage {
  private readonly draft = inject(PasteDraft);
  private readonly catalog = inject(VoiceCatalog);
  private readonly synthesizer = inject(SPEECH_SYNTHESIZER);
  private readonly library = inject(Library);
  private readonly defaultVoice = inject(DefaultVoice);
  private readonly appLanguage = inject(AppLanguage);
  private readonly router = inject(Router);

  protected readonly stage = signal<Stage>('preparing');
  protected readonly done = signal(0);
  protected readonly total = signal(0);
  protected readonly track = signal<Track | null>(null);
  private readonly voice = signal<Voice | null>(null);
  protected readonly heading = computed(() => {
    const voice = this.voice();
    if (!voice) return '';
    return `${languageLabel(voice.locale.split('-')[0], this.appLanguage.lang())} · ${speakerOf(voice.name, voice.locale)}`;
  });

  protected readonly sheetOpen = signal(false);
  protected readonly saving = signal(false);
  protected readonly saveFailed = signal(false);
  protected readonly savedIn = signal<{ lesson: string | null } | null>(null);

  constructor() {
    if (this.draft.text().trim() === '') {
      void this.router.navigate(['/'], { replaceUrl: true });
      return;
    }
    void this.prepare();
  }

  protected async prepare(): Promise<void> {
    const text = this.draft.text();
    this.stage.set('preparing');
    this.done.set(0);
    this.total.set(0);

    await this.catalog.load();
    if (this.catalog.state() === 'failed') {
      this.stage.set('failed');
      return;
    }
    const voices = this.catalog.languages().flatMap((language) => language.voices);
    const language = detectLanguage(text) ?? FALLBACK_LANGUAGE;
    const voice = pickVoice(voices, language, this.defaultVoice.gender());
    if (!voice) {
      this.stage.set('noVoice');
      return;
    }
    this.voice.set(voice);

    try {
      const track = await createTrack({ text, locale: voice.locale, voice: voice.name }, this.synthesizer, {
        onProgress: (done, total) => {
          this.done.set(done);
          this.total.set(total);
        },
      });
      this.track.set(track);
      this.stage.set('ready');
    } catch (error) {
      console.error('Generation failed', error);
      this.stage.set(error instanceof NothingToReadError ? 'empty' : 'failed');
    }
  }

  protected async save(lessonId: string | null): Promise<void> {
    const track = this.track();
    if (!track || this.saving()) return;
    this.saving.set(true);
    this.saveFailed.set(false);
    try {
      await this.library.saveKasha(track, lessonId ?? undefined);
      this.savedIn.set({ lesson: lessonId ? (this.library.lesson(lessonId)?.title ?? null) : null });
      this.sheetOpen.set(false);
    } catch (error) {
      console.error('Could not save the kasha', error);
      this.saveFailed.set(true);
    } finally {
      this.saving.set(false);
    }
  }
}
