import { computed, inject, Injectable, signal } from '@angular/core';
import { DefaultVoice, type VoiceGender } from '../../reading/tts/default-voice';
import { readStored, store } from '../../shared/local-storage';

const KEY = 'kalare.draft';

/**
 * The text in the box of the home screen, kept on the phone so it is still there when she comes back, and the kind
 * of voice it will be read with.
 */
@Injectable({ providedIn: 'root' })
export class PasteDraft {
  private readonly defaultVoice = inject(DefaultVoice);
  /** Her pick under ▷ for this text; null reads with the kind in Ajustes. */
  private readonly picked = signal<VoiceGender | null>(null);

  readonly text = signal(readStored<string>(KEY) ?? '');
  /** The kind of voice ▷ will use: her pick for this text, otherwise the one in Ajustes. */
  readonly voiceGender = computed(() => this.picked() ?? this.defaultVoice.gender());

  set(text: string): void {
    this.text.set(text);
    store(KEY, text);
    // A new text starts again from Ajustes: her pick was for the text she emptied.
    if (text.trim() === '') this.picked.set(null);
  }

  /** Reads this text with another kind of voice, without changing Ajustes. */
  chooseVoiceGender(gender: VoiceGender): void {
    this.picked.set(gender);
  }
}
