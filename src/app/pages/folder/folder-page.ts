import { ChangeDetectionStrategy, Component, computed, DestroyRef, inject, input, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { TranslocoDirective } from '@jsverse/transloco';
import { TuiButton, TuiIcon, TuiNotification } from '@taiga-ui/core';
import { Library } from '../../library/library';
import { SaveSheet } from '../player/save-sheet';
import { FolderList } from '../shared/folder-list';
import { KashaList } from '../shared/kasha-list';
import { NameSheet } from '../shared/name-sheet';

/** How long the delete button waits for the second tap that confirms it. */
const CONFIRM_MS = 4000;

/**
 * One folder of her tree: the folders and kashas inside it, and what she can do with it (rename, move, delete,
 * make a folder inside). Lessons from before the tree also link to their text. Route `folder/:id`.
 */
@Component({
  selector: 'k-folder-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FolderList,
    KashaList,
    NameSheet,
    RouterLink,
    SaveSheet,
    TranslocoDirective,
    TuiButton,
    TuiIcon,
    TuiNotification,
  ],
  templateUrl: './folder-page.html',
  styleUrl: './folder-page.css',
})
export class FolderPage {
  private readonly library = inject(Library);
  private readonly router = inject(Router);

  /** Route parameter `:id`: the folder. */
  readonly id = input.required<string>();

  protected readonly state = this.library.state;
  protected readonly folder = computed(() => this.library.lesson(this.id()));
  protected readonly path = computed(() => this.library.ancestors(this.id()));
  protected readonly back = computed(() => {
    const parent = this.path().at(-1);
    return parent ? ['/folder', parent.id] : ['/'];
  });
  /** The newest first, like the Kashas tab. */
  protected readonly kashas = computed(() => this.library.kashas().filter((kasha) => kasha.lessonId === this.id()));
  protected readonly hasText = computed(() => (this.folder()?.text.trim() ?? '') !== '');
  protected readonly empty = computed(
    () => this.kashas().length === 0 && this.library.foldersIn(this.id()).length === 0 && !this.hasText(),
  );

  protected readonly renaming = signal(false);
  protected readonly moving = signal(false);
  protected readonly busy = signal(false);
  protected readonly failed = signal(false);
  protected readonly confirmingDelete = signal(false);
  private confirmTimer: ReturnType<typeof setTimeout> | undefined;

  constructor() {
    inject(DestroyRef).onDestroy(() => clearTimeout(this.confirmTimer));
  }

  protected async rename(title: string): Promise<void> {
    const folder = this.folder();
    if (!folder) return;
    await this.run(async () => {
      await this.library.saveLesson({ id: folder.id, title, text: folder.text });
      this.renaming.set(false);
    });
  }

  protected async move(parentId: string | null): Promise<void> {
    await this.run(async () => {
      await this.library.moveLesson(this.id(), parentId);
      this.moving.set(false);
    });
  }

  /** First tap asks, second tap (within a few seconds) deletes the folder; what it holds moves up one level. */
  protected async remove(): Promise<void> {
    if (!this.confirmingDelete()) {
      this.confirmingDelete.set(true);
      clearTimeout(this.confirmTimer);
      this.confirmTimer = setTimeout(() => this.confirmingDelete.set(false), CONFIRM_MS);
      return;
    }
    clearTimeout(this.confirmTimer);
    const back = this.back();
    await this.run(async () => {
      await this.library.deleteFolder(this.id());
      await this.router.navigate(back, { replaceUrl: true });
    });
    this.confirmingDelete.set(false);
  }

  private async run(action: () => Promise<void>): Promise<void> {
    if (this.busy()) return;
    this.busy.set(true);
    this.failed.set(false);
    try {
      await action();
    } catch (error) {
      console.error('Could not change the folder', error);
      this.failed.set(true);
    } finally {
      this.busy.set(false);
    }
  }
}
