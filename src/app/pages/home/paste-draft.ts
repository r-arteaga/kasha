import { Injectable, signal } from '@angular/core';
import { readStored, store } from '../../shared/local-storage';

const KEY = 'kalare.draft';

/** The text in the box of the home screen, kept on the phone so it is still there when she comes back. */
@Injectable({ providedIn: 'root' })
export class PasteDraft {
  readonly text = signal(readStored<string>(KEY) ?? '');

  set(text: string): void {
    this.text.set(text);
    store(KEY, text);
  }
}
