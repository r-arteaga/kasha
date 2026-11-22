import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Track } from '../track';
import { KaraokePlayer } from './karaoke-player';
import { PlaybackSpeed } from './playback-speed';
import { SharedAudio } from './shared-audio';

const track = (): Track => ({
  id: 't1',
  title: 'Hallo.',
  text: 'Hallo.',
  locale: 'de-DE',
  voice: 'de-DE-KatjaNeural',
  createdAt: 1,
  sentences: [],
  duration: 1,
  audio: new Blob([new Uint8Array([1])], { type: 'audio/mpeg' }),
});

describe('KaraokePlayer speed', () => {
  beforeEach(() => {
    localStorage.clear();
    // jsdom has no media playback or object URLs.
    vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => undefined);
    vi.spyOn(HTMLMediaElement.prototype, 'load').mockImplementation(() => undefined);
    URL.createObjectURL = vi.fn(() => 'blob:track');
    URL.revokeObjectURL = vi.fn();
    TestBed.configureTestingModule({ providers: [KaraokePlayer] });
  });
  afterEach(() => vi.restoreAllMocks());

  const audioOf = (player: KaraokePlayer) => player['audio'] as HTMLAudioElement & { webkitPreservesPitch?: boolean };

  it('plays at the chosen speed without lowering the voice', () => {
    const player = TestBed.inject(KaraokePlayer);
    player.load(track());

    TestBed.inject(PlaybackSpeed).set(0.5);
    TestBed.tick();

    const audio = audioOf(player);
    expect(audio.playbackRate).toBe(0.5);
    expect(audio.preservesPitch).toBe(true);
    expect(audio.webkitPreservesPitch).toBe(true);
  });

  it('keeps the speed when a track is loaded, which resets the audio to its default rate', () => {
    TestBed.inject(PlaybackSpeed).set(0.5);
    const player = TestBed.inject(KaraokePlayer);
    TestBed.tick();

    player.load(track());

    const audio = audioOf(player);
    expect(audio.defaultPlaybackRate).toBe(0.5);
    expect(audio.playbackRate).toBe(0.5);
  });

  it('starts at the speed chosen last time', () => {
    localStorage.setItem('kalare.speed', '0.5');

    const player = TestBed.inject(KaraokePlayer);
    TestBed.tick();

    expect(audioOf(player).playbackRate).toBe(0.5);
  });
});

describe('KaraokePlayer previous and next', () => {
  const sentence = (index: number, start: number, end: number) => ({
    index,
    paragraph: 0,
    text: `S${index}.`,
    start,
    end,
    words: [{ text: `S${index}`, start, end, charStart: 0, charEnd: 2 }],
  });
  const threeSentences = (): Track => ({ ...track(), sentences: [sentence(0, 0, 1), sentence(1, 1, 2), sentence(2, 2, 3)], duration: 3 });

  beforeEach(() => {
    localStorage.clear();
    vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => undefined);
    vi.spyOn(HTMLMediaElement.prototype, 'load').mockImplementation(() => undefined);
    URL.createObjectURL = vi.fn(() => 'blob:track');
    URL.revokeObjectURL = vi.fn();
    TestBed.configureTestingModule({ providers: [KaraokePlayer] });
  });
  afterEach(() => vi.restoreAllMocks());

  it('has no previous sentence on the first one and no next one on the last', () => {
    const player = TestBed.inject(KaraokePlayer);
    player.load(threeSentences());

    player.seek(0.5);
    expect([player.hasPrevious(), player.hasNext()]).toEqual([false, true]);

    player.seek(1.5);
    expect([player.hasPrevious(), player.hasNext()]).toEqual([true, true]);

    player.seek(2.5);
    expect([player.hasPrevious(), player.hasNext()]).toEqual([true, false]);
  });

  it('jumps to the start of another sentence when she taps one of its words, and plays', () => {
    const play = vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue(undefined);
    const player = TestBed.inject(KaraokePlayer);
    player.load(threeSentences());
    player.seek(0.5);

    player.tapAt(2.4);

    expect(player.time()).toBe(2);
    expect(play).toHaveBeenCalled();
  });

  it('holds the reading where it is when she taps a word of the sentence being played', () => {
    const player = TestBed.inject(KaraokePlayer);
    player.load(threeSentences());
    player.seek(1.2);
    player.playing.set(true);
    const pause = vi.mocked(HTMLMediaElement.prototype.pause);
    pause.mockClear();

    player.tapAt(1.5);

    expect(pause).toHaveBeenCalled();
    expect(player.time()).toBe(1.2);
  });
});

describe('KaraokePlayer on the shared audio element', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => undefined);
    vi.spyOn(HTMLMediaElement.prototype, 'load').mockImplementation(() => undefined);
    let n = 0;
    URL.createObjectURL = vi.fn(() => `blob:track-${++n}`);
    URL.revokeObjectURL = vi.fn();
  });
  afterEach(() => vi.restoreAllMocks());

  it('leaves the next screen’s track in place when the screen it leaves is closed after it', () => {
    TestBed.configureTestingModule({});
    const shared = TestBed.inject(SharedAudio);
    const leaving = TestBed.runInInjectionContext(() => new KaraokePlayer());
    leaving.load(track());
    const arriving = TestBed.runInInjectionContext(() => new KaraokePlayer());
    arriving.load(track());

    leaving.ngOnDestroy();

    expect(shared.element.getAttribute('src')).toBe('blob:track-2');
  });

  it('empties the element when the screen that plays on it is closed', () => {
    TestBed.configureTestingModule({});
    const shared = TestBed.inject(SharedAudio);
    const player = TestBed.runInInjectionContext(() => new KaraokePlayer());
    player.load(track());

    player.ngOnDestroy();

    expect(shared.element.hasAttribute('src')).toBe(false);
  });
});
