import { newId } from '../../shared/new-id';
import { splitIntoSentences } from '../domain/sentences';
import { buildTimeline } from '../domain/timeline';
import type { Track } from '../track';
import type { SpeechSynthesizer } from './speech-synthesizer';
import { voiceSentences, type VoiceOptions } from './voice-sentences';

export class NothingToReadError extends Error {
  constructor() {
    super('The text has no words to read');
    this.name = 'NothingToReadError';
  }
}

export interface TrackRequest {
  text: string;
  locale: string;
  voice: string;
}

const TITLE_LENGTH = 60;

function titleOf(sentence: string): string {
  if (sentence.length <= TITLE_LENGTH) return sentence;
  const cut = sentence.slice(0, TITLE_LENGTH - 1);
  const space = cut.lastIndexOf(' ');
  return `${(space > TITLE_LENGTH / 2 ? cut.slice(0, space) : cut).trimEnd()}…`;
}

/** Splits the text, voices each sentence and joins the audio into one file with its timeline. */
export async function createTrack(
  { text, locale, voice }: TrackRequest,
  synthesizer: SpeechSynthesizer,
  options?: VoiceOptions,
): Promise<Track> {
  const drafts = splitIntoSentences(text, locale);
  if (drafts.length === 0) throw new NothingToReadError();

  const { voiced, audio } = await voiceSentences(drafts, voice, synthesizer, options);
  const { sentences, duration } = buildTimeline(voiced);

  return {
    id: newId(),
    title: titleOf(drafts[0].text),
    text,
    locale,
    voice,
    createdAt: Date.now(),
    sentences,
    duration,
    audio: new Blob(audio as BlobPart[], { type: 'audio/mpeg' }),
  };
}
