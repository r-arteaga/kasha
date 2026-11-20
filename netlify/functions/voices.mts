import type { Config } from '@netlify/functions';
import { listVoices } from '../lib/edge-tts';

/** GET /api/voices → every Edge TTS voice as `{ name, locale, gender }`. Cached for a day. */
export default async (): Promise<Response> => {
  try {
    const voices = await listVoices();
    return Response.json(voices, { headers: { 'Cache-Control': 'public, max-age=86400' } });
  } catch (error) {
    console.error('Edge TTS voice list failed', error);
    return Response.json({ error: 'voices-failed' }, { status: 502 });
  }
};

export const config: Config = { path: '/api/voices' };
