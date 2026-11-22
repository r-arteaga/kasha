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
  /** The folder to put it in (null: at the top). Missing keeps a lesson where it is; a new one goes to the top. */
  parentId?: string | null;
}

/** The folder placed inside another one, or at the top of the tree when there is none. */
function withParent(lesson: Lesson, parentId: string | null | undefined): Lesson {
  const { parentId: _old, ...rest } = lesson;
  return parentId ? { ...rest, parentId } : rest;
}

/** The kasha placed in a lesson, or on its own when there is none. */
function inLesson(kasha: Kasha, lessonId: string | null | undefined): Kasha {
  const { lessonId: _old, ...rest } = kasha;
  return lessonId ? { ...rest, lessonId } : rest;
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
      if (kasha.lessonId) groups.set(kasha.lessonId, [...(groups.get(kasha.lessonId) ?? []), kasha]);
    }
    for (const list of groups.values()) list.sort((a, b) => a.start - b.start || a.createdAt - b.createdAt);
    return groups;
  });

  /** Every kasha, in a lesson or not, the newest first: the "Kashas" tab of the home screen. */
  readonly kashas = computed(() => [...this.kashaMap().values()].sort((a, b) => b.createdAt - a.createdAt));

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

  /** The folders right inside one (null: the top of the tree), by name. One whose folder is gone counts as top. */
  foldersIn(parentId: string | null): Lesson[] {
    const map = this.lessonMap();
    return [...map.values()]
      .filter((lesson) => {
        const top = !lesson.parentId || !map.has(lesson.parentId);
        return parentId === null ? top : lesson.parentId === parentId;
      })
      .sort((a, b) => a.title.localeCompare(b.title) || a.createdAt - b.createdAt);
  }

  /** The folders above one, from the top down (not the folder itself). */
  ancestors(id: string): Lesson[] {
    const path: Lesson[] = [];
    const seen = new Set([id]);
    let parentId = this.lesson(id)?.parentId;
    while (parentId && !seen.has(parentId)) {
      const parent = this.lesson(parentId);
      if (!parent) break;
      path.unshift(parent);
      seen.add(parentId);
      parentId = parent.parentId;
    }
    return path;
  }

  /** The folder and every folder inside it, at any depth. */
  descendants(id: string): Set<string> {
    const found = new Set([id]);
    let grew = true;
    while (grew) {
      grew = false;
      for (const lesson of this.lessonMap().values()) {
        if (lesson.parentId && found.has(lesson.parentId) && !found.has(lesson.id)) {
          found.add(lesson.id);
          grew = true;
        }
      }
    }
    return found;
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
    const lesson = withParent(
      {
        id: existing?.id ?? newId(),
        title: draft.title.trim() || titleFrom(draft.text),
        text: draft.text,
        createdAt: existing?.createdAt ?? now,
        updatedAt: this.lastStamp,
      },
      draft.parentId === undefined ? existing?.parentId : draft.parentId,
    );
    await this.storage.putLesson(lesson);
    this.lessonMap.update((map) => new Map(map).set(lesson.id, lesson));
    this.askToPersist();
    return lesson;
  }

  /** Deletes a lesson and its kashas; folders inside it move up to the folder it was in. */
  async deleteLesson(id: string): Promise<void> {
    const kashaIds = this.kashasOf(id).map((k) => k.id);
    const parentId = this.lesson(id)?.parentId;
    const lessons = this.foldersIn(id).map((folder) => withParent(folder, parentId));
    await this.storage.deleteLesson(id, kashaIds, { lessons });
    this.lessonMap.update((map) => {
      const next = new Map(map);
      next.delete(id);
      for (const lesson of lessons) next.set(lesson.id, lesson);
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

  /** Deletes a folder and nothing else: its folders and kashas move up to the folder it was in. */
  async deleteFolder(id: string): Promise<void> {
    const parentId = this.lesson(id)?.parentId;
    const lessons = this.foldersIn(id).map((folder) => withParent(folder, parentId));
    const kashas = this.kashasOf(id).map((kasha) => inLesson(kasha, parentId));
    await this.storage.deleteLesson(id, [], { lessons, kashas });
    this.lessonMap.update((map) => {
      const next = new Map(map);
      next.delete(id);
      for (const lesson of lessons) next.set(lesson.id, lesson);
      return next;
    });
    this.kashaMap.update((map) => {
      const next = new Map(map);
      for (const kasha of kashas) next.set(kasha.id, kasha);
      return next;
    });
  }

  /** Puts a folder inside another one (null: at the top). Refuses to put it inside itself or one of its own. */
  async moveLesson(id: string, parentId: string | null): Promise<Lesson | null> {
    const current = this.lesson(id);
    if (!current || (parentId !== null && this.descendants(id).has(parentId))) return null;
    const lesson = withParent(current, parentId);
    await this.storage.putLesson(lesson);
    this.lessonMap.update((map) => new Map(map).set(lesson.id, lesson));
    return lesson;
  }

  /** Keeps a text she pasted and heard, whole, as a kasha of its own or in one of her lessons. */
  async saveKasha(track: Track, lessonId?: string): Promise<Kasha> {
    const { audio, ...data } = track;
    const kasha: Kasha = { ...data, start: 0, end: track.text.length, ...(lessonId ? { lessonId } : {}) };
    await this.storage.putKasha(kasha, audio);
    this.kashaMap.update((map) => new Map(map).set(kasha.id, kasha));
    this.askToPersist();
    return kasha;
  }

  /** Puts a kasha in a lesson (or takes it out, with no lesson). Its audio stays as it is. */
  async moveKasha(id: string, lessonId: string | null): Promise<Kasha | null> {
    const current = this.kasha(id);
    if (!current) return null;
    const kasha = inLesson(current, lessonId);
    await this.storage.updateKasha(kasha);
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
