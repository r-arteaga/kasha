import type { Config } from '@netlify/functions';
import { parseTtsRequest, synthesize } from '../lib/edge-tts';

/** POST /api/tts `{ text, voice }` → `{ audio (MP3 in base64), words }`. One sentence per request. */
export default async (request: Request): Promise<Response> => {
  if (request.method !== 'POST') return Response.json({ error: 'method-not-allowed' }, { status: 405 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'invalid-json' }, { status: 400 });
  }

  const parsed = parseTtsRequest(body);
  if (typeof parsed === 'string') return Response.json({ error: parsed }, { status: 400 });

  try {
    const { audio, words } = await synthesize(parsed);
    if (audio.length === 0) return Response.json({ error: 'empty-audio' }, { status: 502 });
    return Response.json({ audio: audio.toString('base64'), words });
  } catch (error) {
    console.error('Edge TTS synthesis failed', error);
    return Response.json({ error: 'synthesis-failed' }, { status: 502 });
  }
};

export const config: Config = { path: '/api/tts' };
