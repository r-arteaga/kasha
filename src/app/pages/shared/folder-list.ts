import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslocoDirective } from '@jsverse/transloco';
import { TuiButton, TuiIcon } from '@taiga-ui/core';
import { kashaCountKey } from '../../library/lesson';
import { Library } from '../../library/library';
import { NameSheet } from './name-sheet';

/** The folders right inside one (or at the top), with a button to make a new one there. */
@Component({
  selector: 'k-folder-list',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NameSheet, RouterLink, TranslocoDirective, TuiButton, TuiIcon],
  template: `
    <ng-container *transloco="let t">
      @if (rows().length > 0) {
        <ul class="list">
          @for (row of rows(); track row.id) {
            <li>
              <a class="row" [routerLink]="['/folder', row.id]">
                <tui-icon icon="@tui.folder" class="row-icon" />
                <span class="row-body">
                  <span class="row-title">{{ row.title || t('save.untitled') }}</span>
                  <span class="row-meta">
                    <span>{{ t(row.kashasKey, { count: row.kashas }) }}</span>
                    @if (row.folders > 0) {
                      <span aria-hidden="true">·</span>
                      <span>{{ t(row.folders === 1 ? 'folder.foldersOne' : 'folder.foldersMany', { count: row.folders }) }}</span>
                    }
                  </span>
                </span>
                <tui-icon icon="@tui.chevron-right" class="row-chevron" />
              </a>
            </li>
          }
        </ul>
      }
      <button tuiButton type="button" appearance="flat" size="m" iconStart="@tui.folder-plus" class="new" (click)="naming.set(true)">
        {{ t(parentId() ? 'folder.newSubfolder' : 'folder.newFolder') }}
      </button>

      @if (naming()) {
        <k-name-sheet
          [heading]="t(parentId() ? 'folder.newSubfolder' : 'folder.newFolder')"
          [placeholder]="t('save.newLessonName')"
          [confirmLabel]="t('folder.create')"
          [busy]="creating()"
          [failed]="failed()"
          (named)="create($event)"
          (closed)="naming.set(false)"
        />
      }
    </ng-container>
  `,
  styleUrl: './list.css',
})
export class FolderList {
  private readonly library = inject(Library);

  /** The folder whose folders are listed; null for the top of the tree. */
  readonly parentId = input<string | null>(null);

  protected readonly rows = computed(() =>
    this.library.foldersIn(this.parentId()).map((folder) => {
      const kashas = this.library.kashasOf(folder.id).length;
      return {
        id: folder.id,
        title: folder.title,
        kashas,
        kashasKey: `lessons.${kashaCountKey(kashas)}`,
        folders: this.library.foldersIn(folder.id).length,
      };
    }),
  );
  protected readonly naming = signal(false);
  protected readonly creating = signal(false);
  protected readonly failed = signal(false);

  protected async create(title: string): Promise<void> {
    if (this.creating()) return;
    this.creating.set(true);
    this.failed.set(false);
    try {
      await this.library.saveLesson({ title, text: '', parentId: this.parentId() });
      this.naming.set(false);
    } catch (error) {
      console.error('Could not create the folder', error);
      this.failed.set(true);
    } finally {
      this.creating.set(false);
    }
  }
}
