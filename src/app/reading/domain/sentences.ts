/** A sentence ready to be voiced, before it has audio. `paragraph` groups sentences that share a line. */
export interface SentenceDraft {
  text: string;
  paragraph: number;
}

/** Below the TTS function's limit (1000 characters), leaving room for trimming differences. */
export const MAX_SENTENCE_LENGTH = 900;

const SPEAKABLE = /[\p{L}\p{N}]/u;

/** Removes the markdown that AI chats put around examples, which the voice would otherwise read. */
function cleanLine(line: string): string {
  return line
    .replace(/^\s*#{1,6}\s+/, '')
    .replace(/^\s*(?:[-*•+]|\d+[.)])\s+/, '')
    .replace(/\*\*|__|`/g, '')
    .replace(/(^|\s)[*_](?=\S)/g, '$1')
    .replace(/(\S)[*_](?=\s|[.,;:!?)]|$)/g, '$1')
    .trim();
}

function cutLong(sentence: string): string[] {
  const pieces: string[] = [];
  let rest = sentence;
  while (rest.length > MAX_SENTENCE_LENGTH) {
    const space = rest.lastIndexOf(' ', MAX_SENTENCE_LENGTH);
    const cut = space > 0 ? space : MAX_SENTENCE_LENGTH;
    pieces.push(rest.slice(0, cut).trim());
    rest = rest.slice(cut).trim();
  }
  if (rest) pieces.push(rest);
  return pieces;
}

/**
 * Splits pasted text into the sentences that will each get their own audio. Every non-empty line is a
 * paragraph; inside a line, the browser's sentence segmenter for the text's language finds the sentences.
 */
export function splitIntoSentences(text: string, locale: string): SentenceDraft[] {
  const segmenter = new Intl.Segmenter(locale, { granularity: 'sentence' });
  const lines = text
    .split(/\r?\n/)
    .map(cleanLine)
    .filter((line) => SPEAKABLE.test(line));

  return lines.flatMap((line, paragraph) =>
    Array.from(segmenter.segment(line), (part) => part.segment.trim())
      .filter((sentence) => SPEAKABLE.test(sentence))
      .flatMap(cutLong)
      .map((sentence) => ({ text: sentence, paragraph })),
  );
}
