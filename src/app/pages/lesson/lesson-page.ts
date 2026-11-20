import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { TranslocoDirective } from '@jsverse/transloco';
import { TuiButton, TuiIcon } from '@taiga-ui/core';
import { TuiSegmented } from '@taiga-ui/kit';
import {
  type Kasha,
  kashaCountKey,
  markPassages,
  type Passage,
  passageStillThere,
  speakerOf,
  trimPassage,
} from '../../library/lesson';
import { Library } from '../../library/library';
import { allSentences, pickSentence, type SentenceRange, sentenceSpans, spanOf } from '../../library/sentence-pick';
import { languageLabel } from '../../reading/tts/voices';
import { AppLanguage } from '../../settings/app-language';

type Section = 'text' | 'kashas';

/** How long a delete button waits for the second tap. */
const CONFIRM_MS = 4000;

function clock(seconds: number): string {
  const whole = Math.max(0, Math.round(seconds));
  return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, '0')}`;
}

/** One lesson: its text with the kashas' passages marked, and the list of kashas. Route `lesson/:id`. */
@Component({
  selector: 'k-lesson-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, TranslocoDirective, TuiButton, TuiIcon, TuiSegmented],
  templateUrl: './lesson-page.html',
  styleUrl: './lesson-page.css',
})
export class LessonPage {
  private readonly library = inject(Library);
  private readonly router = inject(Router);
  private readonly appLanguage = inject(AppLanguage);

  /** Route parameter `:id`. */
  readonly id = input.required<string>();

  protected readonly state = this.library.state;
  protected readonly lesson = computed(() => this.library.lesson(this.id()));
  protected readonly kashas = computed(() => this.library.kashasOf(this.id()));
  protected readonly countKey = computed(() => `lessons.${kashaCountKey(this.kashas().length)}`);

  /** Opens on the kashas when there are some: she comes to practise. Otherwise on the text, to make the first. */
  private readonly chosenSection = signal<Section | null>(null);
  protected readonly section = computed<Section>(
    () => this.chosenSection() ?? (this.kashas().length > 0 ? 'kashas' : 'text'),
  );

  protected readonly runs = computed(() => {
    const lesson = this.lesson();
    if (!lesson) return [];
    return markPassages(
      lesson.text,
      this.kashas().filter((k) => passageStillThere(lesson, k)),
    );
  });

  protected readonly rows = computed(() => {
    const lang = this.appLanguage.lang();
    return this.kashas().map((kasha: Kasha) => ({
      id: kasha.id,
      text: kasha.text,
      meta: [speakerOf(kasha.voice, kasha.locale), languageLabel(kasha.locale, lang), clock(kasha.duration)].join(
        ' · ',
      ),
    }));
  });

  protected readonly confirmingDelete = signal<string | null>(null);
  private confirmTimer: ReturnType<typeof setTimeout> | undefined;

  /** Picking the passage of a new kasha: the text is shown alone and the bottom bar guides the choice. */
  protected readonly picking = signal(false);
  /** Variant A: she picks whole sentences, tapping the first and the last. */
  private readonly spans = computed(() => {
    const lesson = this.lesson();
    return lesson ? sentenceSpans(lesson.text) : [];
  });
  private readonly sentenceRange = signal<SentenceRange | null>(null);
  /** The passage picked so far, if any. */
  protected readonly picked = computed<Passage | null>(() => {
    const range = this.sentenceRange();
    return range ? spanOf(this.spans(), range) : null;
  });
  /**
   * One row per sentence, like the items of a list in selection mode: a circle she taps, the sentence beside it.
   * `paragraph` marks a sentence that starts a new line in the lesson, so the rows keep its paragraphs.
   */
  protected readonly sentenceRows = computed(() => {
    const text = this.lesson()?.text ?? '';
    const range = this.sentenceRange();
    let previousEnd = 0;
    return this.spans().map(({ start, end }, index) => {
      const picked = !!range && index >= range.from && index <= range.to;
      const row = {
        index,
        text: text.slice(start, end),
        picked,
        first: picked && index === range?.from,
        last: picked && index === range?.to,
        paragraph: index > 0 && text.slice(previousEnd, start).includes('\n'),
      };
      previousEnd = end;
      return row;
    });
  });
  protected readonly pickedCount = computed(() => {
    const range = this.sentenceRange();
    return range ? range.to - range.from + 1 : 0;
  });
  protected readonly allPicked = computed(() => this.spans().length > 0 && this.pickedCount() === this.spans().length);

  protected chooseSection(section: Section): void {
    this.chosenSection.set(section);
  }

  protected startPicking(): void {
    this.chosenSection.set('text');
    this.sentenceRange.set(null);
    this.picking.set(true);
  }

  protected cancelPicking(): void {
    this.picking.set(false);
    this.sentenceRange.set(null);
  }

  protected tapSentence(index: number): void {
    this.sentenceRange.update((range) => pickSentence(range, index));
  }

  /** "Todas" picks every sentence; once they all are, the same button lets them all go. */
  protected toggleAll(): void {
    this.sentenceRange.set(this.allPicked() ? null : allSentences(this.spans().length));
  }

  protected next(): void {
    const passage = this.picked();
    if (passage) this.voice(passage);
  }

  /** Goes to choose the voice for a passage of this lesson. */
  protected voice(passage: Passage): void {
    const lesson = this.lesson();
    const trimmed = lesson ? trimPassage(lesson.text, passage) : null;
    if (!lesson || !trimmed) return;
    void this.router.navigate(['/lesson', lesson.id, 'kasha', 'new'], {
      queryParams: { from: trimmed.start, to: trimmed.end },
    });
  }

  /** First tap asks, second tap (within a few seconds) deletes. */
  protected async deleteKasha(id: string): Promise<void> {
    clearTimeout(this.confirmTimer);
    if (this.confirmingDelete() !== id) {
      this.confirmingDelete.set(id);
      this.confirmTimer = setTimeout(() => this.confirmingDelete.set(null), CONFIRM_MS);
      return;
    }
    this.confirmingDelete.set(null);
    try {
      await this.library.deleteKasha(id);
    } catch (error) {
      console.error('Could not delete the kasha', error);
    }
  }
}
