import { ChangeDetectionStrategy, Component, computed, inject, input, type OnInit, output, signal } from '@angular/core';
import { TranslocoDirective } from '@jsverse/transloco';
import { TuiButton, TuiIcon, TuiNotification } from '@taiga-ui/core';
import type { Lesson } from '../../library/lesson';
import { Library } from '../../library/library';

/** "" is the top (no folder), "new" makes a folder there, anything else is the id of one of her folders. */
type Choice = string;
const NEW = 'new';

interface Option {
  folder: Lesson;
  depth: number;
}

/** What is being placed: a text she just heard, a kasha already kept, or a folder. */
export type SaveMode = 'save' | 'move' | 'moveFolder';

const TITLES: Record<SaveMode, string> = {
  save: 'save.title',
  move: 'save.moveTitle',
  moveFolder: 'save.moveFolderTitle',
};

/**
 * Where something is kept in her tree of folders: at the top or in any folder, shown indented under the one it is
 * in. A new folder can be made here with just a name. Emits the chosen folder (null for the top); the page saves.
 */
@Component({
  selector: 'k-save-sheet',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TranslocoDirective, TuiButton, TuiIcon, TuiNotification],
  templateUrl: './save-sheet.html',
  styleUrl: '../shared/sheet.css',
})
export class SaveSheet implements OnInit {
  private readonly library = inject(Library);

  readonly mode = input<SaveMode>('save');
  /** The folder it is in now. */
  readonly lessonId = input<string | null>(null);
  /** A folder being moved cannot go inside itself or one of its own folders. */
  readonly exclude = input<string | null>(null);
  /** Set by the page while it saves, and when saving failed. */
  readonly busy = input(false);
  readonly failed = input(false);
  readonly chosen = output<string | null>();
  readonly closed = output<void>();

  protected readonly title = computed(() => TITLES[this.mode()]);
  protected readonly topLabel = computed(() => (this.mode() === 'moveFolder' ? 'save.top' : 'save.noLesson'));
  /** Every folder, each under the one it is in, depth first. */
  protected readonly options = computed<Option[]>(() => {
    const excluded = this.exclude();
    const hidden = excluded ? this.library.descendants(excluded) : new Set<string>();
    const out: Option[] = [];
    const walk = (parentId: string | null, depth: number) => {
      for (const folder of this.library.foldersIn(parentId)) {
        if (hidden.has(folder.id)) continue;
        out.push({ folder, depth });
        walk(folder.id, depth + 1);
      }
    };
    walk(null, 0);
    return out;
  });
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
      const folder = await this.library.saveLesson({ title: this.newTitle().trim(), text: '', parentId: null });
      this.chosen.emit(folder.id);
    } catch (error) {
      console.error('Could not create the folder', error);
      this.createFailed.set(true);
    } finally {
      this.creating.set(false);
    }
  }
}
