import { Injectable, signal } from '@angular/core';
import { readStored, store } from '../../shared/local-storage';

/**
 * The two speeds: slow, for shadowing behind a voice that is too fast, and normal. The audio is stretched by the
 * browser with the pitch kept, so the karaoke stays in step (it follows the audio's own clock) and nothing is
 * generated again.
 */
export const SPEEDS: readonly number[] = [0.5, 1];
export const SLOW = 0.5;

const KEY = 'kalare.speed';

/** 0.8 → "0,8×" in Spanish, "0.8×" in English. */
export function speedLabel(rate: number, appLang: string): string {
  return `${new Intl.NumberFormat(appLang, { maximumFractionDigits: 2 }).format(rate)}×`;
}

/** The speed she practises at, kept on the phone so the next text plays at the same pace. */
@Injectable({ providedIn: 'root' })
export class PlaybackSpeed {
  readonly rate = signal(readSaved());

  set(rate: number): void {
    if (!SPEEDS.includes(rate)) return;
    this.rate.set(rate);
    store(KEY, rate);
  }
}

function readSaved(): number {
  const saved = Number(readStored<number>(KEY));
  return SPEEDS.includes(saved) ? saved : 1;
}
