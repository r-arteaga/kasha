import { computed, inject, Injectable, signal } from '@angular/core';
import type { Track } from '../reading/track';
import { type Kasha, type KashaTrack, type Lesson, type Passage, titleFrom } from './lesson';
import { LIBRARY_STORAGE } from './library-storage';
import { newId } from '../shared/new-id';

export type LibraryState = 'loading' | 'ready' | 'failed';

export interface LessonDraft {
  /** Missing for a new lesson. */
  id?: string;
  title: string;
  text: string;
}

/**
 * Her lessons and their kashas, kept on the phone. Lists live in memory as signals for the screens; every change
 * is written to storage first, so what the screens show is what a new start of the app will find.
 */
@Injectable({ providedIn: 'root' })
export class Library {
  private readonly storage = inject(LIBRARY_STORAGE);
  private readonly lessonMap = signal<ReadonlyMap<string, Lesson>>(new Map());
  private readonly kashaMap = signal<ReadonlyMap<string, Kasha>>(new Map());
  private readonly loaded: Promise<void>;
  private persistAsked = false;
  /** Last change time handed out: two saves in the same millisecond still get an order. */
  private lastStamp = 0;

  readonly state = signal<LibraryState>('loading');
  /** Most recently changed first. */
  readonly lessons = computed(() => [...this.lessonMap().values()].sort((a, b) => b.updatedAt - a.updatedAt));
  private readonly kashasByLesson = computed(() => {
    const groups = new Map<string, Kasha[]>();
    for (const kasha of this.kashaMap().values()) {
      groups.set(kasha.lessonId, [...(groups.get(kasha.lessonId) ?? []), kasha]);
    }
    for (const list of groups.values()) list.sort((a, b) => a.start - b.start || a.createdAt - b.createdAt);
    return groups;
  });

  constructor() {
    this.loaded = this.load();
  }

  /** Resolves once the stored lessons are in memory (or loading failed: see `state`). */
  ready(): Promise<void> {
    return this.loaded;
  }

  lesson(id: string): Lesson | null {
    return this.lessonMap().get(id) ?? null;
  }

  /** In the order of the lesson's text. */
  kashasOf(lessonId: string): Kasha[] {
    return this.kashasByLesson().get(lessonId) ?? [];
  }

  kasha(id: string): Kasha | null {
    return this.kashaMap().get(id) ?? null;
  }

  async saveLesson(draft: LessonDraft): Promise<Lesson> {
    const now = Date.now();
    this.lastStamp = Math.max(now, this.lastStamp + 1, ...this.lessons().map((l) => l.updatedAt + 1));
    const existing = draft.id ? this.lesson(draft.id) : null;
    const lesson: Lesson = {
      id: existing?.id ?? newId(),
      title: draft.title.trim() || titleFrom(draft.text),
      text: draft.text,
      createdAt: existing?.createdAt ?? now,
      updatedAt: this.lastStamp,
    };
    await this.storage.putLesson(lesson);
    this.lessonMap.update((map) => new Map(map).set(lesson.id, lesson));
    this.askToPersist();
    return lesson;
  }

  async deleteLesson(id: string): Promise<void> {
    const kashaIds = this.kashasOf(id).map((k) => k.id);
    await this.storage.deleteLesson(id, kashaIds);
    this.lessonMap.update((map) => {
      const next = new Map(map);
      next.delete(id);
      return next;
    });
    this.kashaMap.update((map) => {
      const next = new Map(map);
      for (const kashaId of kashaIds) next.delete(kashaId);
      return next;
    });
  }

  /** Keeps a voiced passage of the lesson. */
  async addKasha(lessonId: string, passage: Passage, track: Track): Promise<Kasha> {
    const { audio, ...data } = track;
    const kasha: Kasha = { ...data, lessonId, start: passage.start, end: passage.end };
    await this.storage.putKasha(kasha, audio);
    this.kashaMap.update((map) => new Map(map).set(kasha.id, kasha));
    return kasha;
  }

  async deleteKasha(id: string): Promise<void> {
    await this.storage.deleteKasha(id);
    this.kashaMap.update((map) => {
      const next = new Map(map);
      next.delete(id);
      return next;
    });
  }

  /** The kasha with its audio, ready for the player; null when it is not there (deleted, or never was). */
  async track(id: string): Promise<KashaTrack | null> {
    await this.loaded;
    const kasha = this.kasha(id);
    if (!kasha) return null;
    const audio = await this.storage.loadAudio(id);
    if (!audio) return null;
    const { start: _start, end: _end, ...data } = kasha;
    return { ...data, audio };
  }

  private async load(): Promise<void> {
    try {
      const { lessons, kashas } = await this.storage.loadAll();
      this.lessonMap.set(new Map(lessons.map((l) => [l.id, l])));
      this.kashaMap.set(new Map(kashas.map((k) => [k.id, k])));
      this.state.set('ready');
    } catch (error) {
      console.error('Could not load the library', error);
      this.state.set('failed');
    }
  }

  /**
   * Asks the browser not to clear the library when the phone runs low on space. Safari may still clear the data of
   * a site that is not installed and goes unused for weeks; the installed app (PWA) keeps it.
   */
  private askToPersist(): void {
    if (this.persistAsked) return;
    this.persistAsked = true;
    void navigator.storage?.persist?.().catch(() => false);
  }
}
