import { InjectionToken } from '@angular/core';
import type { BoundaryWord } from '../domain/timeline';

export interface SynthesizedSentence {
  /** MP3 bytes. */
  audio: Uint8Array;
  words: BoundaryWord[];
}

/** Turns one sentence into audio plus the time of each word. The app's adapter calls the `/api/tts` function. */
export interface SpeechSynthesizer {
  synthesize(text: string, voice: string, signal?: AbortSignal): Promise<SynthesizedSentence>;
}

export const SPEECH_SYNTHESIZER = new InjectionToken<SpeechSynthesizer>('SPEECH_SYNTHESIZER');
