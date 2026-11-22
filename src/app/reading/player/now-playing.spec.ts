import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NOW_PLAYING_ARTWORK } from '../../shared/app-icons';
import { clearNowPlaying, showNowPlaying } from './now-playing';

class FakeMetadata {
  constructor(readonly init: MediaMetadataInit) {}
}

describe('now playing', () => {
  beforeEach(() => {
    // jsdom has no Media Session.
    Object.defineProperty(navigator, 'mediaSession', { value: { metadata: null }, configurable: true });
    vi.stubGlobal('MediaMetadata', FakeMetadata);
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    Reflect.deleteProperty(navigator, 'mediaSession');
  });

  it('tells the phone to show the kasha with the app’s current icon (Control Center, lock screen)', () => {
    showNowPlaying('有茶，有牛奶，还有水。');

    expect((navigator.mediaSession.metadata as unknown as FakeMetadata).init).toEqual({
      title: '有茶，有牛奶，还有水。',
      artist: 'Kasha',
      artwork: NOW_PLAYING_ARTWORK,
    });
    expect(NOW_PLAYING_ARTWORK.every((image) => /\?v=[0-9a-f]{8}$/.test(image.src))).toBe(true);
  });

  it('clears only what it showed, not what the next player put there', () => {
    const first = showNowPlaying('Uno');
    const second = showNowPlaying('Dos');

    clearNowPlaying(first);
    expect(navigator.mediaSession.metadata).toBe(second);

    clearNowPlaying(second);
    expect(navigator.mediaSession.metadata).toBeNull();
  });

  it('does nothing where the browser has no Media Session', () => {
    Reflect.deleteProperty(navigator, 'mediaSession');

    expect(showNowPlaying('Hallo.')).toBeNull();
    expect(() => clearNowPlaying(null)).not.toThrow();
  });
});
