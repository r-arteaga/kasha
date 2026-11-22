import { ChangeDetectionStrategy, Component, computed, inject, input, resource, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslocoDirective } from '@jsverse/transloco';
import { TuiButton } from '@taiga-ui/core';
import { Library } from '../../library/library';
import { PlayerView } from './player-view';
import { SaveSheet } from './save-sheet';

/** A kasha she kept, ready to practise again. Route `kasha/:id`. */
@Component({
  selector: 'k-player-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [PlayerView, RouterLink, SaveSheet, TranslocoDirective, TuiButton],
  templateUrl: './player-page.html',
  styleUrl: './player-page.css',
})
export class PlayerPage {
  private readonly library = inject(Library);

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
    return id ? { link: ['/lesson', id], label: 'player.back' } : { link: ['/'], label: 'player.backHome' };
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
}
