import { MsEdgeTTS, OUTPUT_FORMAT } from 'msedge-tts';
import type { Readable } from 'node:stream';

/** One spoken word as Edge TTS reports it, in milliseconds from the start of its audio. */
export interface BoundaryWord {
  text: string;
  offsetMs: number;
  durationMs: number;
}

export interface Synthesis {
  /** MP3, 24 kHz mono, 48 kbit/s constant bit rate. */
  audio: Buffer;
  words: BoundaryWord[];
}

export interface VoiceSummary {
  name: string;
  locale: string;
  gender: string;
}

export const MAX_TEXT_LENGTH = 1000;

const VOICE_NAME = /^[a-z]{2,3}(-[A-Za-z0-9]{2,8})+-[A-Za-z0-9]+Neural$/;

/** Edge TTS reads SSML, and msedge-tts pastes the text into it as is, so markup characters must be escaped. */
export function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/** The reverse of {@link escapeXml}: Edge TTS reports words as they appear in the SSML. */
export function unescapeXml(text: string): string {
  return text
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, '&');
}

export type RequestProblem = 'missing-text' | 'text-too-long' | 'invalid-voice';

export interface TtsRequest {
  text: string;
  voice: string;
}

/** Checks the body of a synthesis request; returns the problem, or the clean request. */
export function parseTtsRequest(body: unknown): TtsRequest | RequestProblem {
  const { text, voice } = (body ?? {}) as Record<string, unknown>;
  if (typeof text !== 'string' || text.trim() === '') return 'missing-text';
  if (text.length > MAX_TEXT_LENGTH) return 'text-too-long';
  if (typeof voice !== 'string' || !VOICE_NAME.test(voice)) return 'invalid-voice';
  return { text: text.trim(), voice };
}

interface MetadataItem {
  Type: string;
  Data: { Offset: number; Duration: number; text: { Text: string } };
}

/** Turns the metadata messages (each one a JSON `{ Metadata: [...] }`) into words, in milliseconds. */
export function wordsFromMetadata(messages: string[]): BoundaryWord[] {
  return messages
    .flatMap((message) => (JSON.parse(message) as { Metadata: MetadataItem[] }).Metadata)
    .filter((item) => item.Type === 'WordBoundary')
    .map((item) => ({
      text: unescapeXml(item.Data.text.Text),
      // Edge TTS counts in ticks of 100 ns.
      offsetMs: Math.round(item.Data.Offset / 10_000),
      durationMs: Math.round(item.Data.Duration / 10_000),
    }));
}

function collect(stream: Readable): Promise<Buffer[]> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    stream.on('data', (chunk: Buffer) => chunks.push(Buffer.from(chunk)));
    stream.once('end', () => resolve(chunks));
    stream.once('close', () => resolve(chunks));
    stream.once('error', reject);
  });
}

export async function synthesize({ text, voice }: TtsRequest): Promise<Synthesis> {
  const tts = new MsEdgeTTS();
  try {
    await tts.setMetadata(voice, OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3, { wordBoundaryEnabled: true });
    const { audioStream, metadataStream } = tts.toStream(escapeXml(text));
    const [audio, metadata] = await Promise.all([
      collect(audioStream),
      metadataStream ? collect(metadataStream) : Promise.resolve([]),
    ]);
    return { audio: Buffer.concat(audio), words: wordsFromMetadata(metadata.map((chunk) => chunk.toString('utf8'))) };
  } finally {
    tts.close();
  }
}

export async function listVoices(): Promise<VoiceSummary[]> {
  const tts = new MsEdgeTTS();
  try {
    const voices = await tts.getVoices();
    return voices.map((voice) => ({ name: voice.ShortName, locale: voice.Locale, gender: voice.Gender }));
  } finally {
    tts.close();
  }
}
