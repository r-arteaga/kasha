// Kilobits per second by bitrate index, for Layer III.
const MPEG1_BITRATES = [0, 32, 40, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320];
const MPEG2_BITRATES = [0, 8, 16, 24, 32, 40, 48, 56, 64, 80, 96, 112, 128, 144, 160];

// Hertz by sample-rate index, keyed by the version bits (0: MPEG-2.5, 2: MPEG-2, 3: MPEG-1).
const SAMPLE_RATES: Record<number, number[]> = {
  0: [11_025, 12_000, 8_000],
  2: [22_050, 24_000, 16_000],
  3: [44_100, 48_000, 32_000],
};

interface Frame {
  length: number;
  samples: number;
  sampleRate: number;
}

function readFrame(bytes: Uint8Array, at: number): Frame | null {
  if (at + 4 > bytes.length || bytes[at] !== 0xff || (bytes[at + 1] & 0xe0) !== 0xe0) return null;
  const version = (bytes[at + 1] >> 3) & 0b11;
  const layer = (bytes[at + 1] >> 1) & 0b11;
  const bitrateIndex = bytes[at + 2] >> 4;
  const sampleRateIndex = (bytes[at + 2] >> 2) & 0b11;
  const padding = (bytes[at + 2] >> 1) & 0b1;
  // Only Layer III (bits 01) with a real bitrate and sample rate.
  if (version === 1 || layer !== 1 || bitrateIndex === 0 || bitrateIndex === 15 || sampleRateIndex === 3) return null;

  const isMpeg1 = version === 3;
  const bitrate = (isMpeg1 ? MPEG1_BITRATES : MPEG2_BITRATES)[bitrateIndex] * 1000;
  const sampleRate = SAMPLE_RATES[version][sampleRateIndex];
  const samples = isMpeg1 ? 1152 : 576;
  const length = Math.floor(((samples / 8) * bitrate) / sampleRate) + padding;
  return { length, samples, sampleRate };
}

function id3Length(bytes: Uint8Array): number {
  if (bytes.length < 10 || bytes[0] !== 0x49 || bytes[1] !== 0x44 || bytes[2] !== 0x33) return 0;
  // The size is "syncsafe": four 7-bit bytes.
  const size = (bytes[6] << 21) | (bytes[7] << 14) | (bytes[8] << 7) | bytes[9];
  return 10 + size;
}

/**
 * The playing time of an MP3, counted frame by frame. Each sentence's audio is joined to the others into
 * one file, so this is what places every sentence (and its words) on the shared timeline.
 */
export function mp3DurationSeconds(bytes: Uint8Array): number {
  let at = id3Length(bytes);
  let seconds = 0;
  while (at + 4 <= bytes.length) {
    const frame = readFrame(bytes, at);
    if (!frame) {
      at += 1;
      continue;
    }
    if (at + frame.length > bytes.length) break;
    seconds += frame.samples / frame.sampleRate;
    at += frame.length;
  }
  return seconds;
}
