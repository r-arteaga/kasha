import { ChangeDetectionStrategy, Component, computed, DestroyRef, effect, inject, input } from '@angular/core';
import { TranslocoDirective } from '@jsverse/transloco';
import { TuiButton, TuiIcon } from '@taiga-ui/core';
import { KaraokePlayer } from '../../reading/player/karaoke-player';
import { KaraokeText } from '../../reading/player/karaoke-text';
import { SLOW } from '../../reading/player/playback-speed';
import type { Track } from '../../reading/track';

/** From the screen opening to the voice starting, so she can look at the text first. */
const AUTOPLAY_DELAY_MS = 1000;

function clock(seconds: number): string {
  const whole = Math.max(0, Math.floor(seconds));
  return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, '0')}`;
}

/**
 * The text lit word by word and the controls under it: save (given by the page), play, slow, repeat and the
 * pause for her turn. Tapping a word holds the reading; tapping another sentence jumps to it.
 */
@Component({
  selector: 'k-player-view',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [KaraokeText, TranslocoDirective, TuiButton, TuiIcon],
  providers: [KaraokePlayer],
  templateUrl: './player-view.html',
  styleUrl: './player-view.css',
})
export class PlayerView {
  protected readonly player = inject(KaraokePlayer);

  readonly track = input.required<Track>();
  /** Starts playing by itself a second after the track arrives (when she comes from ▷). */
  readonly autoplay = input(false);

  protected readonly elapsed = computed(() => clock(this.player.time()));
  protected readonly total = computed(() => clock(this.track().duration));
  protected readonly slow = computed(() => this.player.rate() === SLOW);

  constructor() {
    let timer: ReturnType<typeof setTimeout> | undefined;
    inject(DestroyRef).onDestroy(() => clearTimeout(timer));
    effect(() => {
      const track = this.track();
      if (this.player.track() === track) return;
      this.player.load(track);
      clearTimeout(timer);
      if (this.autoplay()) timer = setTimeout(() => this.player.play(), AUTOPLAY_DELAY_MS);
    });
  }

  protected toggleSlow(): void {
    this.player.setRate(this.slow() ? 1 : SLOW);
  }
}
