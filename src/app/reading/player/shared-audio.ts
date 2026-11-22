import { Injectable } from '@angular/core';

/** 0.05 s of silence as a WAV file: enough for iOS to count the element as started by her tap. */
function silence(): Blob {
  const samples = 2205;
  const view = new DataView(new ArrayBuffer(44 + samples * 2));
  const text = (at: number, value: string) => [...value].forEach((c, i) => view.setUint8(at + i, c.charCodeAt(0)));
  text(0, 'RIFF');
  view.setUint32(4, 36 + samples * 2, true);
  text(8, 'WAVE');
  text(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, 1, true); // mono
  view.setUint32(24, 44_100, true);
  view.setUint32(28, 88_200, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  text(36, 'data');
  view.setUint32(40, samples * 2, true);
  return new Blob([view.buffer], { type: 'audio/wav' });
}

/**
 * The one audio element every player uses. Safari on iPhone only lets an element play by itself (the player
 * starting a second after the audio is ready) once it has played during a tap: `unlock()` does that on the tap
 * on ▷, before the audio exists.
 */
@Injectable({ providedIn: 'root' })
export class SharedAudio {
  readonly element = new Audio();
  private unlocked = false;

  /** Call it from a tap. Plays a moment of silence so the element may play later without one. */
  unlock(): void {
    if (this.unlocked || typeof URL.createObjectURL !== 'function') return;
    this.unlocked = true;
    const url = URL.createObjectURL(silence());
    this.element.src = url;
    this.element
      .play()
      // Only the silence is paused: a track loaded meanwhile keeps playing.
      .then(() => {
        if (this.element.src === url) this.element.pause();
      })
      .catch(() => (this.unlocked = false))
      .finally(() => URL.revokeObjectURL(url));
  }
}
