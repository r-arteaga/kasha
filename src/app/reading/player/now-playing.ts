import { NOW_PLAYING_ARTWORK } from '../../shared/app-icons';

/**
 * Tells the phone what is playing: the kasha's text, "Kasha" and the app icon, for Control Center and the lock
 * screen. Without it iOS picks a picture itself, possibly an old copy of the icon it kept. Null where the browser
 * has no Media Session.
 */
export function showNowPlaying(title: string): MediaMetadata | null {
  if (!('mediaSession' in navigator) || typeof MediaMetadata === 'undefined') return null;
  const metadata = new MediaMetadata({ title, artist: 'Kasha', artwork: [...NOW_PLAYING_ARTWORK] });
  navigator.mediaSession.metadata = metadata;
  return metadata;
}

/** Clears what `showNowPlaying` showed, unless another player has replaced it since. */
export function clearNowPlaying(shown: MediaMetadata | null): void {
  if (shown && 'mediaSession' in navigator && navigator.mediaSession.metadata === shown) {
    navigator.mediaSession.metadata = null;
  }
}
