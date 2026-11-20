import { describe, expect, it } from 'vitest';
import { escapeXml, MAX_TEXT_LENGTH, parseTtsRequest, wordsFromMetadata } from './edge-tts';

describe('escapeXml', () => {
  it('escapes every character that would break the SSML document', () => {
    expect(escapeXml(`Tom & Jerry <b> "say" it's`)).toBe('Tom &amp; Jerry &lt;b&gt; &quot;say&quot; it&apos;s');
  });

  it('leaves ordinary text in any script untouched', () => {
    expect(escapeXml('Ich habe gestern 昨日 見ました')).toBe('Ich habe gestern 昨日 見ました');
  });
});

describe('parseTtsRequest', () => {
  it('accepts a sentence and a neural voice, trimming the text', () => {
    expect(parseTtsRequest({ text: '  Hallo!  ', voice: 'de-DE-KatjaNeural' })).toEqual({
      text: 'Hallo!',
      voice: 'de-DE-KatjaNeural',
    });
  });

  it('accepts multilingual and three-part locale voices', () => {
    expect(parseTtsRequest({ text: 'Hi', voice: 'en-US-AvaMultilingualNeural' })).not.toBeTypeOf('string');
    expect(parseTtsRequest({ text: 'Hi', voice: 'zh-CN-liaoning-XiaobeiNeural' })).not.toBeTypeOf('string');
  });

  it('rejects a missing or blank text', () => {
    expect(parseTtsRequest({ voice: 'de-DE-KatjaNeural' })).toBe('missing-text');
    expect(parseTtsRequest({ text: '   ', voice: 'de-DE-KatjaNeural' })).toBe('missing-text');
    expect(parseTtsRequest(null)).toBe('missing-text');
  });

  it('rejects a text longer than the limit', () => {
    expect(parseTtsRequest({ text: 'a'.repeat(MAX_TEXT_LENGTH + 1), voice: 'de-DE-KatjaNeural' })).toBe(
      'text-too-long',
    );
  });

  it('rejects anything that is not a voice name, so nothing else reaches the SSML', () => {
    expect(parseTtsRequest({ text: 'Hi', voice: '"><evil/>' })).toBe('invalid-voice');
    expect(parseTtsRequest({ text: 'Hi', voice: 42 })).toBe('invalid-voice');
  });
});

describe('wordsFromMetadata', () => {
  const message = (items: unknown[]) => JSON.stringify({ Metadata: items });
  const boundary = (type: string, text: string, offset: number, duration: number) => ({
    Type: type,
    Data: { Offset: offset, Duration: duration, text: { Text: text, Length: text.length, BoundaryType: type } },
  });

  it('keeps only word boundaries, in milliseconds, across several messages', () => {
    const words = wordsFromMetadata([
      message([boundary('WordBoundary', "I'd", 1_000_000, 2_250_000)]),
      message([
        boundary('SentenceBoundary', "I'd rather", 1_000_000, 28_125_000),
        boundary('WordBoundary', 'rather', 3_375_000, 3_500_000),
      ]),
    ]);

    expect(words).toEqual([
      { text: "I'd", offsetMs: 100, durationMs: 225 },
      { text: 'rather', offsetMs: 338, durationMs: 350 },
    ]);
  });

  it('gives words back as they were written, not as escaped for the SSML', () => {
    const words = wordsFromMetadata([message([boundary('WordBoundary', '&amp;', 5_380_000, 2_500_000)])]);

    expect(words.map((word) => word.text)).toEqual(['&']);
  });

  it('returns no words when there is no metadata', () => {
    expect(wordsFromMetadata([])).toEqual([]);
  });
});
