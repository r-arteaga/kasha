import { ChangeDetectionStrategy, Component, computed, inject, input, type OnInit, output, signal } from '@angular/core';
import { TranslocoDirective } from '@jsverse/transloco';
import { TuiButton, TuiIcon, TuiNotification } from '@taiga-ui/core';
import { Library } from '../../library/library';

/** "" keeps the kasha on its own, "new" makes a lesson, anything else is the id of one of her lessons. */
type Choice = string;
const NEW = 'new';

/**
 * Where a kasha is kept: on its own or in a lesson, which works like a folder. A new lesson is made here with
 * just a name. Emits the chosen lesson (null for none); the page does the saving.
 */
@Component({
  selector: 'k-save-sheet',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TranslocoDirective, TuiButton, TuiIcon, TuiNotification],
  templateUrl: './save-sheet.html',
  styleUrl: './save-sheet.css',
})
export class SaveSheet implements OnInit {
  private readonly library = inject(Library);

  /** "save" for a text she just heard, "move" for a kasha already kept. */
  readonly mode = input<'save' | 'move'>('save');
  /** The lesson the kasha is in now. */
  readonly lessonId = input<string | null>(null);
  /** Set by the page while it saves, and when saving failed. */
  readonly busy = input(false);
  readonly failed = input(false);
  readonly chosen = output<string | null>();
  readonly closed = output<void>();

  protected readonly lessons = this.library.lessons;
  protected readonly choice = signal<Choice>('');
  protected readonly newTitle = signal('');
  protected readonly creating = signal(false);
  protected readonly createFailed = signal(false);
  protected readonly isNew = computed(() => this.choice() === NEW);
  protected readonly canConfirm = computed(
    () => !this.busy() && !this.creating() && (!this.isNew() || this.newTitle().trim() !== ''),
  );

  ngOnInit(): void {
    this.choice.set(this.lessonId() ?? '');
  }

  protected pick(choice: Choice): void {
    this.choice.set(choice);
  }

  protected name(event: Event): void {
    this.newTitle.set((event.target as HTMLInputElement).value);
  }

  protected async confirm(): Promise<void> {
    if (!this.canConfirm()) return;
    const choice = this.choice();
    if (choice !== NEW) {
      this.chosen.emit(choice || null);
      return;
    }
    this.creating.set(true);
    this.createFailed.set(false);
    try {
      const lesson = await this.library.saveLesson({ title: this.newTitle().trim(), text: '' });
      this.chosen.emit(lesson.id);
    } catch (error) {
      console.error('Could not create the lesson', error);
      this.createFailed.set(true);
    } finally {
      this.creating.set(false);
    }
  }
}
