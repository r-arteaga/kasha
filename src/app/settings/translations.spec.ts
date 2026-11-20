import { describe, expect, it } from 'vitest';
import { CATALOGS } from './translations';

type Catalog = Record<string, unknown>;

/** Every translated text with its dotted key: { compose: { title: 'x' } } → [['compose.title', 'x']]. */
function entries(catalog: Catalog, prefix = ''): [string, string][] {
  return Object.entries(catalog).flatMap(([key, value]) =>
    typeof value === 'string' ? [[prefix + key, value] as [string, string]] : entries(value as Catalog, `${prefix}${key}.`),
  );
}

const params = (text: string) => [...text.matchAll(/\{\{\s*(\w+)\s*\}\}/g)].map((match) => match[1]).sort();

describe('translation catalogs', () => {
  const spanish = new Map(entries(CATALOGS.es));

  for (const lang of ['en', 'ru'] as const) {
    const other = new Map(entries(CATALOGS[lang]));

    it(`${lang} translates exactly the Spanish texts`, () => {
      expect([...other.keys()].sort()).toEqual([...spanish.keys()].sort());
    });

    it(`${lang} keeps the same placeholders and leaves nothing empty`, () => {
      for (const [key, text] of other) {
        expect(text.trim(), key).not.toBe('');
        expect(params(text), key).toEqual(params(spanish.get(key) ?? ''));
      }
    });
  }
});
