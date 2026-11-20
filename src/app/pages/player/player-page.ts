import { ChangeDetectionStrategy, Component, computed, effect, inject, input, resource } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslocoDirective } from '@jsverse/transloco';
import { TuiButton, TuiIcon } from '@taiga-ui/core';
import { TuiSegmented } from '@taiga-ui/kit';
import { KaraokePlayer } from '../../reading/player/karaoke-player';
import { KaraokeText } from '../../reading/player/karaoke-text';
import { SPEEDS, speedLabel } from '../../reading/player/playback-speed';
import { Library } from '../../library/library';
import { AppLanguage } from '../../settings/app-language';

function clock(seconds: number): string {
  const whole = Math.max(0, Math.floor(seconds));
  return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, '0')}`;
}

@Component({
  selector: 'k-player-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [KaraokeText, RouterLink, TranslocoDirective, TuiButton, TuiIcon, TuiSegmented],
  providers: [KaraokePlayer],
  templateUrl: './player-page.html',
  styleUrl: './player-page.css',
})
export class PlayerPage {
  private readonly library = inject(Library);
  protected readonly player = inject(KaraokePlayer);
  private readonly appLanguage = inject(AppLanguage);

  /** Route parameter `:id`: the kasha. */
  readonly id = input.required<string>();

  private readonly kasha = resource({ params: () => this.id(), loader: ({ params }) => this.library.track(params) });
  protected readonly track = computed(() => (this.kasha.hasValue() ? this.kasha.value() : null));
  protected readonly loading = this.kasha.isLoading;
  protected readonly elapsed = computed(() => clock(this.player.time()));
  protected readonly total = computed(() => clock(this.track()?.duration ?? 0));
  protected readonly speeds = SPEEDS;
  protected readonly speedLabels = computed(() => SPEEDS.map((speed) => speedLabel(speed, this.appLanguage.lang())));
  protected readonly speedIndex = computed(() => SPEEDS.indexOf(this.player.rate()));

  protected chooseSpeed(index: number): void {
    this.player.setRate(SPEEDS[index]);
  }

  constructor() {
    effect(() => {
      const track = this.track();
      if (track && this.player.track() !== track) this.player.load(track);
    });
  }
}
