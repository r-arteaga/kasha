import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { TranslocoDirective } from '@jsverse/transloco';
import { TuiButton, TuiIcon, TuiNotification } from '@taiga-ui/core';
import { TuiSegmented } from '@taiga-ui/kit';
import { kashaCountKey, previewOf } from '../../library/lesson';
import { Library } from '../../library/library';
import { SharedAudio } from '../../reading/player/shared-audio';
import { DefaultVoice } from '../../reading/tts/default-voice';
import { detectLanguage } from '../../reading/tts/detect-language';
import { languageLabel } from '../../reading/tts/voices';
import { AppLanguage } from '../../settings/app-language';
import { readStored, store } from '../../shared/local-storage';
import { PasteDraft } from './paste-draft';

type Tab = 'kashas' | 'lessons';
const TAB_KEY = 'kalare.homeTab';

/** Home: a box to paste a text and hear it at once; below, her saved kashas and her lessons. */
@Component({
  selector: 'k-home-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, TranslocoDirective, TuiButton, TuiIcon, TuiNotification, TuiSegmented],
  templateUrl: './home-page.html',
  styleUrl: './home-page.css',
})
export class HomePage {
  private readonly library = inject(Library);
  private readonly appLanguage = inject(AppLanguage);
  private readonly router = inject(Router);
  private readonly sharedAudio = inject(SharedAudio);
  private readonly defaultVoice = inject(DefaultVoice);
  protected readonly draft = inject(PasteDraft);

  protected readonly state = this.library.state;
  protected readonly tab = signal<Tab>(readStored<Tab>(TAB_KEY) === 'lessons' ? 'lessons' : 'kashas');
  protected readonly tabIndex = computed(() => (this.tab() === 'kashas' ? 0 : 1));
  protected readonly canListen = computed(() => this.draft.text().trim() !== '');
  /** "Chino · voz de mujer": what ▷ will do, so a wrong guess shows before she listens. */
  protected readonly detected = computed(() => {
    const language = detectLanguage(this.draft.text());
    return language ? languageLabel(language, this.appLanguage.lang()) : null;
  });
  protected readonly genderKey = computed(() =>
    this.defaultVoice.gender() === 'Male' ? 'home.voiceMale' : 'home.voiceFemale',
  );

  private readonly date = computed(
    () => new Intl.DateTimeFormat(this.appLanguage.lang(), { day: 'numeric', month: 'short' }),
  );
  protected readonly kashaRows = computed(() =>
    this.library.kashas().map((kasha) => ({
      id: kasha.id,
      title: kasha.title,
      language: languageLabel(kasha.locale.split('-')[0], this.appLanguage.lang()),
      lesson: kasha.lessonId ? (this.library.lesson(kasha.lessonId)?.title ?? null) : null,
      date: this.date().format(kasha.createdAt),
    })),
  );
  protected readonly lessonRows = computed(() =>
    this.library.lessons().map((lesson) => {
      const count = this.library.kashasOf(lesson.id).length;
      return {
        id: lesson.id,
        title: lesson.title,
        preview: previewOf(lesson),
        count,
        countKey: `lessons.${kashaCountKey(count)}`,
        date: this.date().format(lesson.updatedAt),
      };
    }),
  );

  protected edit(event: Event): void {
    this.draft.set((event.target as HTMLTextAreaElement).value);
  }

  protected clear(): void {
    this.draft.set('');
  }

  protected chooseTab(index: number): void {
    const tab: Tab = index === 0 ? 'kashas' : 'lessons';
    this.tab.set(tab);
    store(TAB_KEY, tab);
  }

  protected listen(): void {
    if (!this.canListen()) return;
    // Her tap lets the player start by itself once the audio is ready (Safari on iPhone needs one).
    this.sharedAudio.unlock();
    void this.router.navigate(['/listen']);
  }
}
