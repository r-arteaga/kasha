import { describe, expect, it } from 'vitest';
import { mp3DurationSeconds } from './mp3-duration';

/** An MPEG-2 Layer III frame at 24 kHz and 48 kbit/s, what Edge TTS sends: 144 bytes, 576 samples (24 ms). */
function edgeFrame(): number[] {
  // FF F3: sync, MPEG-2, Layer III, no CRC. 0x64: bitrate index 6 (48 kbit/s), 24 kHz, no padding. 0xC4: mono.
  return [0xff, 0xf3, 0x64, 0xc4, ...new Array<number>(140).fill(0)];
}

/** An MPEG-1 Layer III frame at 44.1 kHz and 128 kbit/s with padding: 418 bytes, 1152 samples. */
function mpeg1Frame(): number[] {
  return [0xff, 0xfb, 0x92, 0x64, ...new Array<number>(414).fill(0)];
}

const frames = (frame: () => number[], count: number) => Array.from({ length: count }, frame).flat();

describe('mp3DurationSeconds', () => {
  it('counts 24 ms per Edge TTS frame', () => {
    expect(mp3DurationSeconds(new Uint8Array(frames(edgeFrame, 250)))).toBeCloseTo(6, 6);
  });

  it('handles MPEG-1 frames with padding', () => {
    expect(mp3DurationSeconds(new Uint8Array(frames(mpeg1Frame, 100)))).toBeCloseTo((100 * 1152) / 44_100, 6);
  });

  it('skips an ID3v2 tag at the start', () => {
    // "ID3", version 4.0, no flags, syncsafe size 10 → 10 bytes of tag body.
    const tag = [0x49, 0x44, 0x33, 0x04, 0x00, 0x00, 0x00, 0x00, 0x00, 0x0a, ...new Array<number>(10).fill(0x20)];

    expect(mp3DurationSeconds(new Uint8Array([...tag, ...frames(edgeFrame, 10)]))).toBeCloseTo(0.24, 6);
  });

  it('resynchronises after junk bytes between frames', () => {
    const bytes = [...frames(edgeFrame, 5), 0x00, 0x12, 0xff, 0x00, ...frames(edgeFrame, 5)];

    expect(mp3DurationSeconds(new Uint8Array(bytes))).toBeCloseTo(0.24, 6);
  });

  it('ignores a cut-off last frame', () => {
    const bytes = [...frames(edgeFrame, 3), ...edgeFrame().slice(0, 50)];

    expect(mp3DurationSeconds(new Uint8Array(bytes))).toBeCloseTo(0.072, 6);
  });

  it('is zero for empty or non-MP3 data', () => {
    expect(mp3DurationSeconds(new Uint8Array())).toBe(0);
    expect(mp3DurationSeconds(new Uint8Array([1, 2, 3, 4, 5, 6]))).toBe(0);
  });
});
