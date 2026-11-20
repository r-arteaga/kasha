import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import { favoriteChoices, FavoriteVoices } from './favorite-voices';
import type { Language } from './voices';

const katja = { name: 'de-DE-KatjaNeural', locale: 'de-DE', gender: 'Female' };
const conrad = { name: 'de-DE-ConradNeural', locale: 'de-DE', gender: 'Male' };
const nanami = { name: 'ja-JP-NanamiNeural', locale: 'ja-JP', gender: 'Female' };
const languages: Language[] = [
  { locale: 'de-DE', label: 'Alemán (Alemania)', voices: [conrad, katja] },
  { locale: 'ja-JP', label: 'Japonés (Japón)', voices: [nanami] },
];

describe('favoriteChoices', () => {
  it('gives each favorite its language and voice, in the order they were marked', () => {
    const choices = favoriteChoices(['ja-JP-NanamiNeural', 'de-DE-KatjaNeural'], languages);

    expect(choices.map((choice) => [choice.language.locale, choice.voice.name])).toEqual([
      ['ja-JP', 'ja-JP-NanamiNeural'],
      ['de-DE', 'de-DE-KatjaNeural'],
    ]);
    expect(choices[1].voice).toBe(katja);
  });

  it('leaves out voices that Edge no longer offers', () => {
    expect(favoriteChoices(['de-DE-GoneNeural', 'de-DE-ConradNeural'], languages).map((c) => c.voice.name)).toEqual([
      'de-DE-ConradNeural',
    ]);
  });
});

describe('FavoriteVoices', () => {
  beforeEach(() => localStorage.clear());

  const fresh = () => {
    TestBed.resetTestingModule();
    return TestBed.inject(FavoriteVoices);
  };

  it('has none at first', () => {
    expect(fresh().names()).toEqual([]);
  });

  it('marks and unmarks a voice, and remembers it on the phone', () => {
    const favorites = fresh();
    favorites.toggle('de-DE-KatjaNeural');
    favorites.toggle('ja-JP-NanamiNeural');

    expect(fresh().names()).toEqual(['de-DE-KatjaNeural', 'ja-JP-NanamiNeural']);
    expect(fresh().has('de-DE-KatjaNeural')).toBe(true);

    fresh().toggle('de-DE-KatjaNeural');

    expect(fresh().names()).toEqual(['ja-JP-NanamiNeural']);
    expect(fresh().has('de-DE-KatjaNeural')).toBe(false);
  });

  it('ignores a damaged saved list', () => {
    localStorage.setItem('kalare.favorites', '{"not":"a list"}');

    expect(fresh().names()).toEqual([]);
  });
});
