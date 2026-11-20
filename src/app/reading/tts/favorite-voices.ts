import { Injectable, signal } from '@angular/core';
import { readStored, store } from '../../shared/local-storage';
import type { Language, Voice } from './voices';

const KEY = 'kalare.favorites';

/** A favorite resolved against the catalog: the very objects the pickers hold, so choosing it selects them. */
export interface FavoriteChoice {
  language: Language;
  voice: Voice;
}

/** Favorites in the order she marked them; a voice Edge no longer offers is left out. */
export function favoriteChoices(names: readonly string[], languages: readonly Language[]): FavoriteChoice[] {
  const byName = new Map<string, FavoriteChoice>();
  for (const language of languages) for (const voice of language.voices) byName.set(voice.name, { language, voice });
  return names.flatMap((name) => byName.get(name) ?? []);
}

/** The voices she marked with the star, by Edge voice name (which carries its locale), kept on the phone. */
@Injectable({ providedIn: 'root' })
export class FavoriteVoices {
  readonly names = signal<string[]>(readSaved());

  has(name: string): boolean {
    return this.names().includes(name);
  }

  toggle(name: string): void {
    const names = this.has(name) ? this.names().filter((n) => n !== name) : [...this.names(), name];
    this.names.set(names);
    store(KEY, names);
  }
}

function readSaved(): string[] {
  const saved = readStored<unknown>(KEY);
  return Array.isArray(saved) ? saved.filter((name): name is string => typeof name === 'string') : [];
}
