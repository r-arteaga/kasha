import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  inject,
  input,
  resource,
  signal,
} from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { TranslocoDirective } from '@jsverse/transloco';
import { TuiButton, TuiNotification } from '@taiga-ui/core';
import { Library } from '../../library/library';
import { PlayerView } from './player-view';
import { SaveSheet } from './save-sheet';

/** How long the delete button waits for the second tap that confirms it. */
const CONFIRM_MS = 4000;

/** A kasha she kept, ready to practise again, or to delete. Route `kasha/:id`. */
@Component({
  selector: 'k-player-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [PlayerView, RouterLink, SaveSheet, TranslocoDirective, TuiButton, TuiNotification],
  templateUrl: './player-page.html',
  styleUrl: './player-page.css',
})
export class PlayerPage {
  private readonly library = inject(Library);
  private readonly router = inject(Router);

  /** Route parameter `:id`: the kasha. */
  readonly id = input.required<string>();

  private readonly kasha = resource({ params: () => this.id(), loader: ({ params }) => this.library.track(params) });
  protected readonly track = computed(() => (this.kasha.hasValue() ? this.kasha.value() : null));
  protected readonly loading = this.kasha.isLoading;
  /** The lesson it is in now (it changes when she moves it). */
  protected readonly lessonId = computed(() => this.library.kasha(this.id())?.lessonId ?? null);
  protected readonly lessonTitle = computed(() => {
    const id = this.lessonId();
    return id ? (this.library.lesson(id)?.title ?? null) : null;
  });
  protected readonly back = computed(() => {
    const id = this.lessonId();
    return id ? { link: ['/folder', id], label: 'player.back' } : { link: ['/'], label: 'player.backHome' };
  });

  protected readonly sheetOpen = signal(false);
  protected readonly moving = signal(false);
  protected readonly moveFailed = signal(false);

  protected async move(lessonId: string | null): Promise<void> {
    if (this.moving()) return;
    this.moving.set(true);
    this.moveFailed.set(false);
    try {
      await this.library.moveKasha(this.id(), lessonId);
      this.sheetOpen.set(false);
    } catch (error) {
      console.error('Could not move the kasha', error);
      this.moveFailed.set(true);
    } finally {
      this.moving.set(false);
    }
  }

  protected readonly confirmingDelete = signal(false);
  protected readonly deleting = signal(false);
  protected readonly deleteFailed = signal(false);
  private confirmTimer: ReturnType<typeof setTimeout> | undefined;

  constructor() {
    inject(DestroyRef).onDestroy(() => clearTimeout(this.confirmTimer));
  }

  /** First tap asks, second tap (within a few seconds) deletes the kasha and its audio, then goes back. */
  protected async remove(): Promise<void> {
    if (!this.confirmingDelete()) {
      this.confirmingDelete.set(true);
      clearTimeout(this.confirmTimer);
      this.confirmTimer = setTimeout(() => this.confirmingDelete.set(false), CONFIRM_MS);
      return;
    }
    clearTimeout(this.confirmTimer);
    const back = this.back().link;
    this.deleting.set(true);
    this.deleteFailed.set(false);
    try {
      await this.library.deleteKasha(this.id());
      await this.router.navigate(back, { replaceUrl: true });
    } catch (error) {
      console.error('Could not delete the kasha', error);
      this.deleteFailed.set(true);
    } finally {
      this.deleting.set(false);
      this.confirmingDelete.set(false);
    }
  }
}
