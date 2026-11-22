import { ChangeDetectionStrategy, Component, computed, effect, inject, input, signal, untracked } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { TranslocoDirective } from '@jsverse/transloco';
import { TuiButton, TuiIcon, TuiLabel, TuiNotification, TuiTextfield } from '@taiga-ui/core';
import { TuiChevron, TuiProgressBar, TuiSegmented, TuiSelect } from '@taiga-ui/kit';
import { type Passage, trimPassage } from '../../library/lesson';
import { Library } from '../../library/library';
import { createTrack, NothingToReadError } from '../../reading/generation/create-track';
import { SPEECH_SYNTHESIZER } from '../../reading/generation/speech-synthesizer';
import { type FavoriteChoice, favoriteChoices, FavoriteVoices } from '../../reading/tts/favorite-voices';
import { VoiceCatalog } from '../../reading/tts/voice-catalog';
import { type Language, languageLabel, type Voice, voiceLabel } from '../../reading/tts/voices';
import { AppLanguage } from '../../settings/app-language';
import { SettingsButton } from '../shared/settings-button';

type Problem = 'empty' | 'failed' | null;

/** How she picks the voice: the two pickers, or one of her favorites. */
type VoiceMode = 'voice' | 'fav';

/** Characters, from a query parameter; null when missing or not a number. */
function offset(value: string | undefined): number | null {
  const number = value === undefined || value === '' ? NaN : Number(value);
  return Number.isInteger(number) && number >= 0 ? number : null;
}

/** Voices the passage of a lesson she picked and keeps it as a kasha. Route `lesson/:id/kasha/new?from=&to=`. */
@Component({
  selector: 'k-new-kasha-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    RouterLink,
    SettingsButton,
    TranslocoDirective,
    TuiButton,
    TuiChevron,
    TuiIcon,
    TuiLabel,
    TuiNotification,
    TuiProgressBar,
    TuiSegmented,
    TuiSelect,
    TuiTextfield,
  ],
  templateUrl: './new-kasha-page.html',
  styleUrl: './new-kasha-page.css',
})
export class NewKashaPage {
  private readonly catalog = inject(VoiceCatalog);
  private readonly synthesizer = inject(SPEECH_SYNTHESIZER);
  private readonly library = inject(Library);
  private readonly router = inject(Router);
  private readonly appLanguage = inject(AppLanguage);
  private readonly favoriteVoices = inject(FavoriteVoices);

  /** Route parameter `:id`: the lesson. */
  readonly id = input.required<string>();
  /** Query parameters: where the passage starts and ends in the lesson's text. */
  readonly from = input<string>();
  readonly to = input<string>();

  protected readonly lesson = computed(() => this.library.lesson(this.id()));
  protected readonly passage = computed<Passage | null>(() => {
    const lesson = this.lesson();
    const start = offset(this.from());
    const end = offset(this.to());
    if (!lesson || start === null || end === null) return null;
    return trimPassage(lesson.text, { start, end });
  });
  protected readonly passageText = computed(() => {
    const passage = this.passage();
    return passage ? (this.lesson()?.text.slice(passage.start, passage.end) ?? '') : '';
  });
  protected readonly libraryState = this.library.state;

  protected readonly form = new FormGroup({
    language: new FormControl<Language | null>(null, Validators.required),
    voice: new FormControl<Voice | null>(null, Validators.required),
  });

  protected readonly catalogState = this.catalog.state;
  protected readonly languages = this.catalog.languages;
  protected readonly language = toSignal(this.form.controls.language.valueChanges, { initialValue: null });
  protected readonly voices = computed(() => this.language()?.voices ?? []);
  protected readonly chosenVoice = toSignal(this.form.controls.voice.valueChanges, { initialValue: null });
  protected readonly favorites = computed(() => favoriteChoices(this.favoriteVoices.names(), this.languages()));
  protected readonly isFavorite = computed(() => {
    const voice = this.chosenVoice();
    return !!voice && this.favoriteVoices.names().includes(voice.name);
  });
  /** "Fav" first when she already has favorites, otherwise the two pickers. */
  protected readonly mode = signal<VoiceMode>(this.favoriteVoices.names().length > 0 ? 'fav' : 'voice');
  protected readonly generating = signal(false);
  protected readonly done = signal(0);
  protected readonly total = signal(0);
  protected readonly problem = signal<Problem>(null);

  // The pickers' labels, rebuilt when the app's language changes so the chosen item is renamed too.
  protected readonly languageLabel = computed(() => {
    const lang = this.appLanguage.lang();
    return (language: Language) => languageLabel(language.locale, lang);
  });
  protected readonly voiceLabel = computed(() => {
    const words = this.catalog.voiceWords();
    return (voice: Voice) => voiceLabel(voice, words);
  });

  constructor() {
    void this.catalog.load();

    // Once the voices arrive, start from the last voice used (or the first English one).
    effect(() => {
      const languages = this.languages();
      if (languages.length === 0 || this.form.controls.language.value) return;
      const last = this.catalog.lastChoice();
      const language =
        languages.find((l) => l.locale === last?.locale) ?? languages.find((l) => l.locale === 'en-US') ?? languages[0];
      this.form.controls.language.setValue(language);
      this.form.controls.voice.setValue(language.voices.find((v) => v.name === last?.name) ?? language.voices[0]);
      if (untracked(this.mode) === 'fav') this.chooseMode('fav');
    });

    // Changing the language picks that language's first voice.
    this.form.controls.language.valueChanges.subscribe((language) => {
      const current = this.form.controls.voice.value;
      if (language && current?.locale !== language.locale) this.form.controls.voice.setValue(language.voices[0] ?? null);
    });
  }

  /** In "Fav", the chosen voice is always one of the favorites: the first one unless it already is. */
  protected chooseMode(mode: VoiceMode): void {
    this.mode.set(mode);
    const favorites = untracked(this.favorites);
    const current = this.form.controls.voice.value;
    if (mode === 'fav' && favorites.length > 0 && !favorites.some((f) => f.voice.name === current?.name)) {
      this.choose(favorites[0]);
    }
  }

  protected choose(favorite: FavoriteChoice): void {
    this.form.controls.language.setValue(favorite.language);
    this.form.controls.voice.setValue(favorite.voice);
  }

  protected toggleFavorite(): void {
    const voice = this.form.controls.voice.value;
    if (voice) this.favoriteVoices.toggle(voice.name);
  }

  protected retryVoices(): void {
    void this.catalog.load();
  }

  protected async generate(): Promise<void> {
    const { language, voice } = this.form.getRawValue();
    const lesson = this.lesson();
    const passage = this.passage();
    if (this.generating() || !language || !voice || !lesson || !passage) return;

    this.problem.set(null);
    this.generating.set(true);
    this.done.set(0);
    this.total.set(0);
    this.catalog.remember(voice);
    try {
      const text = lesson.text.slice(passage.start, passage.end);
      const track = await createTrack({ text, locale: language.locale, voice: voice.name }, this.synthesizer, {
        onProgress: (done, total) => {
          this.done.set(done);
          this.total.set(total);
        },
      });
      const kasha = await this.library.addKasha(lesson.id, passage, track);
      // Back from the player goes to the lesson, not to this page.
      await this.router.navigate(['/kasha', kasha.id], { replaceUrl: true });
    } catch (error) {
      console.error('Generation failed', error);
      this.problem.set(error instanceof NothingToReadError ? 'empty' : 'failed');
    } finally {
      this.generating.set(false);
    }
  }
}
