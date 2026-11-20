import type { Sentence } from './domain/timeline';

/** A text the user pasted, voiced: one MP3 for the whole text and the timeline that lights each word. */
export interface Track {
  id: string;
  title: string;
  text: string;
  locale: string;
  voice: string;
  createdAt: number;
  sentences: Sentence[];
  /** Seconds. */
  duration: number;
  audio: Blob;
}
