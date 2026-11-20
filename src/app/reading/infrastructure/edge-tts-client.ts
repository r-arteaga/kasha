import { Injectable } from '@angular/core';
import type { BoundaryWord } from '../domain/timeline';
import type { SpeechSynthesizer, SynthesizedSentence } from '../generation/speech-synthesizer';
import type { Voice } from '../tts/voices';

function base64ToBytes(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

/** Talks to the app's Netlify Functions, which relay Microsoft Edge's online text-to-speech. */
@Injectable({ providedIn: 'root' })
export class EdgeTtsClient implements SpeechSynthesizer {
  async synthesize(text: string, voice: string, signal?: AbortSignal): Promise<SynthesizedSentence> {
    const response = await fetch('/api/tts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, voice }),
      signal,
    });
    if (!response.ok) throw new Error(`/api/tts answered ${response.status}`);
    const body = (await response.json()) as { audio: string; words: BoundaryWord[] };
    return { audio: base64ToBytes(body.audio), words: body.words };
  }

  async voices(): Promise<Voice[]> {
    const response = await fetch('/api/voices');
    if (!response.ok) throw new Error(`/api/voices answered ${response.status}`);
    return (await response.json()) as Voice[];
  }
}
