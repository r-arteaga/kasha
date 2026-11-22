/**
 * The pictures the phone shows for Kasha while it plays (Control Center, lock screen): the app icon on paper, so
 * it looks like the icon on the home screen. The `?v=` part comes from the icons' own bytes and is written by
 * scripts/icon-version.mts, so a new icon gets a new address and no phone keeps showing an old copy.
 */
export const NOW_PLAYING_ARTWORK: readonly MediaImage[] = [
  { src: 'icons/apple-touch-icon.png?v=97a53a72', sizes: '180x180', type: 'image/png' },
  { src: 'icons/maskable-512.png?v=97a53a72', sizes: '512x512', type: 'image/png' },
];
