import { Injectable, signal } from '@angular/core';
import { readStored, store } from '../../shared/local-storage';

const KEY = 'kalare.pauseToRepeat';

/** Whether the player stops after each sentence for her to say it back; kept on the phone like the speed. */
@Injectable({ providedIn: 'root' })
export class PauseToRepeat {
  readonly on = signal(readStored<boolean>(KEY) === true);

  set(on: boolean): void {
    this.on.set(on);
    store(KEY, on);
  }
}
