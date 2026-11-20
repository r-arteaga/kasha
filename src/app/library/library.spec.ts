import { TestBed } from '@angular/core/testing';
import { IDBFactory } from 'fake-indexeddb';
import type { Track } from '../reading/track';
import {
  type Kasha,
  kashaCountKey,
  type Lesson,
  markPassages,
  passageStillThere,
  previewOf,
  speakerOf,
  titleFrom,
  trimPassage,
} from './lesson';
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
    locale: 'de-DE',
    voice: 'de-DE-KatjaNeural',
    createdAt: Date.now(),
    sentences: [],
    duration: 2,
    audio: new Blob([new Uint8Array([1, 2, 3])], { type: 'audio/mpeg' }),
  };
}

describe('Library', () => {
  let storage: IndexedDbStorage;
  let library: Library;

  beforeEach(async () => {
    storage = new IndexedDbStorage(new IDBFactory());
    library = libraryOn(storage);
    await library.ready();
  });

  it('keeps lessons on the phone: a new start finds them again', async () => {
    const lesson = await library.saveLesson({ title: 'Im Café', text: 'Ich hätte gern einen Kaffee.' });

    const later = libraryOn(storage);
    await later.ready();

    expect(later.lessons()).toEqual([lesson]);
    expect(later.lesson(lesson.id)?.text).toBe('Ich hätte gern einen Kaffee.');
  });

  it('names a lesson after its first line when she gives no title', async () => {
    const lesson = await library.saveLesson({ title: '  ', text: '\n  Erste Zeile.\nZweite Zeile.' });

    expect(lesson.title).toBe('Erste Zeile.');
  });

  it('lists the most recently changed lesson first, and editing keeps its id and creation time', async () => {
    const first = await library.saveLesson({ title: 'Eins', text: 'Eins.' });
    const second = await library.saveLesson({ title: 'Zwei', text: 'Zwei.' });
    expect(library.lessons().map((l) => l.title)).toEqual(['Zwei', 'Eins']);

    const edited = await library.saveLesson({ id: first.id, title: 'Eins', text: 'Eins, neu.' });

    expect(library.lessons().map((l) => l.title)).toEqual(['Eins', 'Zwei']);
    expect(edited).toMatchObject({ id: first.id, createdAt: first.createdAt, text: 'Eins, neu.' });
    expect(edited.updatedAt).toBeGreaterThanOrEqual(second.updatedAt);
  });

  it('keeps each kasha with its audio and lists a lesson’s kashas in the order of its text', async () => {
    const lesson = await library.saveLesson({ title: 'L', text: 'Eins. Zwei. Drei.' });
    const late = await library.addKasha(lesson.id, { start: 12, end: 17 }, track('Drei.'));
    const early = await library.addKasha(lesson.id, { start: 0, end: 5 }, track('Eins.'));

    expect(library.kashasOf(lesson.id).map((k) => k.id)).toEqual([early.id, late.id]);

    const later = libraryOn(storage);
    await later.ready();
    const loaded = await later.track(late.id);

    expect(later.kashasOf(lesson.id)).toHaveLength(2);
    expect(loaded).toMatchObject({ id: late.id, lessonId: lesson.id, text: 'Drei.', voice: 'de-DE-KatjaNeural' });
    expect(new Uint8Array(await loaded!.audio.arrayBuffer())).toEqual(new Uint8Array([1, 2, 3]));
    expect(loaded!.audio.type).toBe('audio/mpeg');
  });

  it('deleting a kasha removes it and its audio', async () => {
    const lesson = await library.saveLesson({ title: 'L', text: 'Eins.' });
    const kasha = await library.addKasha(lesson.id, { start: 0, end: 5 }, track('Eins.'));

    await library.deleteKasha(kasha.id);

    expect(library.kashasOf(lesson.id)).toEqual([]);
    expect(await library.track(kasha.id)).toBeNull();
    expect(await storage.loadAudio(kasha.id)).toBeNull();
  });

  it('deleting a lesson removes its kashas and their audio, and leaves other lessons alone', async () => {
    const lesson = await library.saveLesson({ title: 'L', text: 'Eins.' });
    const other = await library.saveLesson({ title: 'O', text: 'Andere.' });
    const kasha = await library.addKasha(lesson.id, { start: 0, end: 5 }, track('Eins.'));
    const kept = await library.addKasha(other.id, { start: 0, end: 7 }, track('Andere.'));

    await library.deleteLesson(lesson.id);

    const later = libraryOn(storage);
    await later.ready();
    expect(later.lessons().map((l) => l.id)).toEqual([other.id]);
    expect(later.kashasOf(lesson.id)).toEqual([]);
    expect(await storage.loadAudio(kasha.id)).toBeNull();
    expect(await later.track(kept.id)).not.toBeNull();
  });

  it('a missing kasha gives null rather than failing', async () => {
    expect(await library.track('nope')).toBeNull();
  });
});

describe('lesson helpers', () => {
  const lesson: Lesson = { id: 'l', title: 'L', text: 'Eins. Zwei.', createdAt: 0, updatedAt: 0 };
  const kasha = { start: 6, end: 11, text: 'Zwei.' } as Kasha;

  it('titleFrom cuts a long first line at a word', () => {
    expect(titleFrom('Lorem ipsum dolor sit amet consectetur adipiscing elit sed do eiusmod tempor')).toBe(
      'Lorem ipsum dolor sit amet consectetur adipiscing elit sed…',
    );
    expect(titleFrom('Kurz.')).toBe('Kurz.');
    expect(titleFrom('')).toBe('');
  });

  it('passageStillThere tells whether the lesson still has the kasha’s passage at its place', () => {
    expect(passageStillThere(lesson, kasha)).toBe(true);
    expect(passageStillThere({ ...lesson, text: 'Eins! Zwei.' }, kasha)).toBe(true);
    expect(passageStillThere({ ...lesson, text: 'Zwei. Eins.' }, kasha)).toBe(false);
  });

  it('markPassages marks the kashas’ passages, joining the ones that overlap or touch', () => {
    expect(markPassages('Eins. Zwei. Drei.', [{ start: 6, end: 11 }])).toEqual([
      { text: 'Eins. ', marked: false },
      { text: 'Zwei.', marked: true },
      { text: ' Drei.', marked: false },
    ]);
    expect(markPassages('Eins. Zwei. Drei.', [{ start: 6, end: 17 }, { start: 0, end: 7 }])).toEqual([
      { text: 'Eins. Zwei. Drei.', marked: true },
    ]);
    expect(markPassages('Eins.', [])).toEqual([{ text: 'Eins.', marked: false }]);
  });

  it('previewOf skips the line that already is the title; kashaCountKey and speakerOf name things for the list', () => {
    expect(previewOf({ title: 'Im Café', text: 'Im Café\nIch hätte gern\neinen Kaffee.' })).toBe(
      'Ich hätte gern einen Kaffee.',
    );
    expect(previewOf({ title: 'Mein Titel', text: 'Ich hätte gern.' })).toBe('Ich hätte gern.');
    expect([0, 1, 2].map(kashaCountKey)).toEqual(['kashasNone', 'kashasOne', 'kashasMany']);
    expect(speakerOf('de-DE-KatjaNeural', 'de-DE')).toBe('Katja');
    expect(speakerOf('en-US-AvaMultilingualNeural', 'en-US')).toBe('Ava');
  });

  it('trimPassage drops the blank space around a passage, in either direction', () => {
    expect(trimPassage('  Eins.  ', { start: 0, end: 9 })).toEqual({ start: 2, end: 7 });
    expect(trimPassage('Eins. Zwei.', { start: 11, end: 6 })).toEqual({ start: 6, end: 11 });
    expect(trimPassage('a   b', { start: 1, end: 4 })).toBeNull();
  });
});
