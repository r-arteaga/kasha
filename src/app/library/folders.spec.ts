import { TestBed } from '@angular/core/testing';
import { IDBFactory } from 'fake-indexeddb';
import type { Track } from '../reading/track';
import { Library } from './library';
import { IndexedDbStorage, LIBRARY_STORAGE } from './library-storage';

function libraryOn(storage: IndexedDbStorage): Library {
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({ providers: [{ provide: LIBRARY_STORAGE, useValue: storage }] });
  return TestBed.inject(Library);
}

function track(text: string): Track {
  return {
    id: crypto.randomUUID(),
    title: text,
    text,
    locale: 'zh-CN',
    voice: 'zh-CN-XiaoxiaoNeural',
    createdAt: Date.now(),
    sentences: [],
    duration: 2,
    audio: new Blob([new Uint8Array([1, 2, 3])], { type: 'audio/mpeg' }),
  };
}

describe('Library: a tree of folders', () => {
  let storage: IndexedDbStorage;
  let library: Library;

  beforeEach(async () => {
    storage = new IndexedDbStorage(new IDBFactory());
    library = libraryOn(storage);
    await library.ready();
  });

  const folder = (title: string, parentId: string | null = null) => library.saveLesson({ title, text: '', parentId });

  it('keeps folders inside folders, by name, and finds them again after a new start', async () => {
    const chinese = await folder('Chino');
    const hsk2 = await folder('HSK 2', chinese.id);
    const hsk1 = await folder('HSK 1', chinese.id);
    const korean = await folder('Coreano');

    const later = libraryOn(storage);
    await later.ready();

    expect(later.foldersIn(null).map((f) => f.title)).toEqual(['Chino', 'Coreano']);
    expect(later.foldersIn(chinese.id).map((f) => f.id)).toEqual([hsk1.id, hsk2.id]);
    expect(later.foldersIn(korean.id)).toEqual([]);
    expect(later.ancestors(hsk1.id).map((f) => f.title)).toEqual(['Chino']);
  });

  it('keeps a folder where it is when only its name changes', async () => {
    const chinese = await folder('Chino');
    const hsk1 = await folder('HSK 1', chinese.id);

    await library.saveLesson({ id: hsk1.id, title: 'HSK uno', text: '' });

    expect(library.lesson(hsk1.id)).toMatchObject({ title: 'HSK uno', parentId: chinese.id });
  });

  it('moves a folder into another one, or to the top, but never into itself or one of its own', async () => {
    const chinese = await folder('Chino');
    const hsk1 = await folder('HSK 1', chinese.id);
    const korean = await folder('Coreano');

    await library.moveLesson(hsk1.id, korean.id);
    expect(library.foldersIn(korean.id).map((f) => f.id)).toEqual([hsk1.id]);

    await library.moveLesson(hsk1.id, null);
    expect(library.foldersIn(null).map((f) => f.title)).toEqual(['Chino', 'Coreano', 'HSK 1']);

    await library.moveLesson(hsk1.id, chinese.id);
    expect(await library.moveLesson(chinese.id, hsk1.id)).toBeNull();
    expect(await library.moveLesson(chinese.id, chinese.id)).toBeNull();
    expect(library.lesson(chinese.id)?.parentId).toBeUndefined();
  });

  it('deletes a folder and keeps what was inside, one level up', async () => {
    const chinese = await folder('Chino');
    const hsk1 = await folder('HSK 1', chinese.id);
    const lesson1 = await folder('Lección 1', hsk1.id);
    const kasha = await library.saveKasha(track('你好。'), hsk1.id);

    await library.deleteFolder(hsk1.id);
    const later = libraryOn(storage);
    await later.ready();

    expect(later.lesson(hsk1.id)).toBeNull();
    expect(later.foldersIn(chinese.id).map((f) => f.id)).toEqual([lesson1.id]);
    expect(later.kasha(kasha.id)?.lessonId).toBe(chinese.id);
    expect((await later.track(kasha.id))?.audio.size).toBe(3);
  });

  it('deleting a folder at the top leaves its kashas on their own', async () => {
    const chinese = await folder('Chino');
    const kasha = await library.saveKasha(track('你好。'), chinese.id);

    await library.deleteFolder(chinese.id);

    expect(library.kasha(kasha.id)?.lessonId).toBeUndefined();
    expect(library.kashas().map((k) => k.id)).toEqual([kasha.id]);
  });

  it('a lesson deleted from its editor still takes its kashas, but the folders inside it move up', async () => {
    const chinese = await folder('Chino');
    const lesson = await library.saveLesson({ title: 'Texto', text: '你好。', parentId: chinese.id });
    const inside = await folder('Dentro', lesson.id);
    const kasha = await library.saveKasha(track('你好。'), lesson.id);

    await library.deleteLesson(lesson.id);

    expect(library.kasha(kasha.id)).toBeNull();
    expect(library.lesson(inside.id)?.parentId).toBe(chinese.id);
  });
});
