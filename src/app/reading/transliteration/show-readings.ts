import { Injectable, signal } from '@angular/core';
import { readStored, store } from '../../shared/local-storage';

const KEY = 'kalare.showReadings';

/**
 * Whether the pinyin (or the Korean romanization) shows over the text. Svet: "quiero botón de ocultarlo pero que
 * esté ahí cuando lo necesito". Shown until she hides it; her last choice is kept on the phone.
 */
@Injectable({ providedIn: 'root' })
export class ShowReadings {
  readonly on = signal(readStored<boolean>(KEY) !== false);

  toggle(): void {
    this.on.update((on) => !on);
    store(KEY, this.on());
  }
}
