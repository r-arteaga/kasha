import { InjectionToken } from '@angular/core';
import type { Kasha, Lesson } from './lesson';

/** Where lessons, kashas and their audio are kept. The app keeps them on the phone (IndexedDB). */
export interface LibraryStorage {
  loadAll(): Promise<{ lessons: Lesson[]; kashas: Kasha[] }>;
  putLesson(lesson: Lesson): Promise<void>;
  /** Deletes the lesson together with the given kashas and their audio, all or nothing. */
  deleteLesson(id: string, kashaIds: readonly string[]): Promise<void>;
  putKasha(kasha: Kasha, audio: Blob): Promise<void>;
  deleteKasha(id: string): Promise<void>;
  loadAudio(kashaId: string): Promise<Blob | null>;
}

// Stored names keep their first names (database "kalare", store "karales") so lessons and kashas saved before the renames stay.
const DB_NAME = 'kalare';
const VERSION = 1;
const LESSONS = 'lessons';
const KASHAS = 'karales';
const AUDIO = 'audio';

/** Audio is kept as bytes: older iOS Safari versions failed to store Blobs in IndexedDB. */
interface StoredAudio {
  type: string;
  data: ArrayBuffer;
}

function result<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function finished(transaction: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
    transaction.onabort = () => reject(transaction.error);
  });
}

export class IndexedDbStorage implements LibraryStorage {
  private db: Promise<IDBDatabase> | null = null;

  constructor(private readonly factory: IDBFactory = indexedDB) {}

  private open(): Promise<IDBDatabase> {
    this.db ??= new Promise((resolve, reject) => {
      const request = this.factory.open(DB_NAME, VERSION);
      request.onupgradeneeded = () => {
        const db = request.result;
        db.createObjectStore(LESSONS, { keyPath: 'id' });
        db.createObjectStore(KASHAS, { keyPath: 'id' });
        db.createObjectStore(AUDIO);
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    return this.db;
  }

  async loadAll(): Promise<{ lessons: Lesson[]; kashas: Kasha[] }> {
    const db = await this.open();
    const tx = db.transaction([LESSONS, KASHAS], 'readonly');
    const [lessons, kashas] = await Promise.all([
      result(tx.objectStore(LESSONS).getAll() as IDBRequest<Lesson[]>),
      result(tx.objectStore(KASHAS).getAll() as IDBRequest<Kasha[]>),
    ]);
    return { lessons, kashas };
  }

  async putLesson(lesson: Lesson): Promise<void> {
    const db = await this.open();
    const tx = db.transaction(LESSONS, 'readwrite');
    tx.objectStore(LESSONS).put(lesson);
    await finished(tx);
  }

  async deleteLesson(id: string, kashaIds: readonly string[]): Promise<void> {
    const db = await this.open();
    const tx = db.transaction([LESSONS, KASHAS, AUDIO], 'readwrite');
    tx.objectStore(LESSONS).delete(id);
    for (const kashaId of kashaIds) {
      tx.objectStore(KASHAS).delete(kashaId);
      tx.objectStore(AUDIO).delete(kashaId);
    }
    await finished(tx);
  }

  async putKasha(kasha: Kasha, audio: Blob): Promise<void> {
    // Read the bytes before opening the transaction: it closes as soon as it waits on anything else.
    const stored: StoredAudio = { type: audio.type, data: await audio.arrayBuffer() };
    const db = await this.open();
    const tx = db.transaction([KASHAS, AUDIO], 'readwrite');
    tx.objectStore(KASHAS).put(kasha);
    tx.objectStore(AUDIO).put(stored, kasha.id);
    await finished(tx);
  }

  async deleteKasha(id: string): Promise<void> {
    const db = await this.open();
    const tx = db.transaction([KASHAS, AUDIO], 'readwrite');
    tx.objectStore(KASHAS).delete(id);
    tx.objectStore(AUDIO).delete(id);
    await finished(tx);
  }

  async loadAudio(kashaId: string): Promise<Blob | null> {
    const db = await this.open();
    const stored = await result(
      db.transaction(AUDIO, 'readonly').objectStore(AUDIO).get(kashaId) as IDBRequest<StoredAudio | undefined>,
    );
    return stored ? new Blob([stored.data], { type: stored.type }) : null;
  }
}

export const LIBRARY_STORAGE = new InjectionToken<LibraryStorage>('LIBRARY_STORAGE', {
  providedIn: 'root',
  factory: () => new IndexedDbStorage(),
});
