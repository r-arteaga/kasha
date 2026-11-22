import {
  afterRenderEffect,
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  ElementRef,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { readingUnits } from '../domain/reading-units';
import { type Position, type Sentence, sentenceSegments } from '../domain/timeline';
import type { WordReadings } from '../transliteration/word-readings';

interface MarkerBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** Languages written without spaces between sentences. */
const NO_SPACES = /^(ja|zh|th|lo|km|my)\b/;

/** Keeps the reading line's height over a mark or a word with nothing to read. */
const NBSP = '\u00a0';

/**
 * The text being practised. The current sentence is in full contrast and the spoken word sits on a marker that
 * slides from word to word (docs/DESIGN.md §2). Tapping a word asks to play from it. With readings (pinyin,
 * Korean romanization), each word carries its reading above it and the marker stays on the word itself.
 */
@Component({
  selector: 'k-karaoke-text',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '[class.with-readings]': 'readings() !== null' },
  template: `
    <div class="marker" aria-hidden="true" [class.visible]="marker()" [style.transform]="markerTransform()"
      [style.width.px]="markerBox().width" [style.height.px]="markerBox().height"></div>
    @for (paragraph of paragraphs(); track $index) {
      <p class="paragraph" [lang]="locale()">
        @for (sentence of paragraph; track sentence.index) {
          <span class="sentence" [class.current]="sentence.index === position().sentence" [attr.data-s]="sentence.index">
            @if (readingsOf(sentence); as readings) {
              @for (unit of unitsOf(sentence); track $index) {
                <span class="unit">
                  @if (unit.before) {
                    <span class="mark"><span class="reading" aria-hidden="true">{{ nbsp }}</span>
                      <span class="base">{{ unit.before }}</span></span>
                  }
                  <span class="word" [class.spoken]="isSpoken(sentence.index, unit.word)" [attr.data-s]="sentence.index"
                    [attr.data-w]="unit.word" (click)="wordTap.emit(sentence.words[unit.word].start)">
                    <span class="reading" aria-hidden="true">{{ readings[unit.word] || nbsp }}</span>
                    <span class="base">{{ unit.text }}</span>
                  </span>
                  @if (unit.after) {
                    <span class="mark"><span class="reading" aria-hidden="true">{{ nbsp }}</span>
                      <span class="base">{{ unit.after }}</span></span>
                  }
                </span>
                @if (unit.space) {{{ ' ' }}}
              }
            } @else {
              @for (segment of segmentsOf(sentence); track $index) {
                @if (segment.word >= 0) {
                  <span class="word" [attr.data-s]="sentence.index" [attr.data-w]="segment.word"
                    (click)="wordTap.emit(sentence.words[segment.word].start)">{{ segment.text }}</span>
                } @else {{{ segment.text }}}
              }
            }
          </span>{{ gap() }}
        }
      </p>
    }
  `,
  styleUrl: './karaoke-text.css',
})
export class KaraokeText {
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  readonly sentences = input.required<Sentence[]>();
  readonly position = input.required<Position>();
  readonly locale = input.required<string>();
  /** Scroll the current sentence into view when it changes (only while playing, so reading ahead is not undone). */
  readonly follow = input(false);
  /** Each word's reading, by sentence and word (pinyin, romanization); null shows the text alone. */
  readonly readings = input<WordReadings | null>(null);
  readonly wordTap = output<number>();

  protected readonly nbsp = NBSP;
  protected readonly paragraphs = computed(() => {
    const groups: Sentence[][] = [];
    for (const sentence of this.sentences()) (groups[sentence.paragraph] ??= []).push(sentence);
    return groups.filter(Boolean);
  });
  protected readonly gap = computed(() => (NO_SPACES.test(this.locale()) ? '' : ' '));
  protected readonly markerBox = signal<MarkerBox>({ x: 0, y: 0, width: 0, height: 0 });
  protected readonly marker = signal(false);
  protected readonly markerTransform = computed(() => `translate(${this.markerBox().x}px, ${this.markerBox().y}px)`);

  private readonly segmentCache = new WeakMap<Sentence, ReturnType<typeof sentenceSegments>>();
  private readonly unitCache = new WeakMap<Sentence, ReturnType<typeof readingUnits>>();
  private lastSentence = -1;
  /** Bumped when the text box changes size (rotation, font size), since the words then move. */
  private readonly layout = signal(0);

  constructor() {
    const resize = new ResizeObserver(() => this.layout.update((n) => n + 1));
    resize.observe(this.host.nativeElement);
    inject(DestroyRef).onDestroy(() => resize.disconnect());

    afterRenderEffect(() => {
      this.layout();
      this.readings();
      const { sentence, word } = this.position();
      const root = this.host.nativeElement;
      const element = root.querySelector<HTMLElement>(`.word[data-s="${sentence}"][data-w="${word}"]`);
      if (element) {
        // The marker covers the word itself, not its reading, and overhangs it slightly like a highlighter stroke.
        const target = element.querySelector<HTMLElement>('.base') ?? element;
        const box = target.getBoundingClientRect();
        const origin = root.getBoundingClientRect();
        const padX = 3;
        this.markerBox.set({
          x: box.left - origin.left - padX,
          y: box.top - origin.top,
          width: box.width + padX * 2,
          height: box.height,
        });
      }
      this.marker.set(element !== null);

      if (sentence !== this.lastSentence) {
        this.lastSentence = sentence;
        if (this.follow()) {
          root.querySelector(`.sentence[data-s="${sentence}"]`)?.scrollIntoView({ block: 'center', behavior: 'smooth' });
        }
      }
    });
  }

  protected segmentsOf(sentence: Sentence) {
    let segments = this.segmentCache.get(sentence);
    if (!segments) {
      segments = sentenceSegments(sentence);
      this.segmentCache.set(sentence, segments);
    }
    return segments;
  }

  protected unitsOf(sentence: Sentence) {
    let units = this.unitCache.get(sentence);
    if (!units) {
      units = readingUnits(this.segmentsOf(sentence));
      this.unitCache.set(sentence, units);
    }
    return units;
  }

  /** A sentence the voice reported no words for (numbers read aloud) is shown as plain text, never dropped. */
  protected readingsOf(sentence: Sentence): string[] | null {
    if (sentence.words.length === 0) return null;
    return this.readings()?.[sentence.index] ?? null;
  }

  protected isSpoken(sentence: number, word: number): boolean {
    const position = this.position();
    return position.sentence === sentence && position.word === word;
  }
}
