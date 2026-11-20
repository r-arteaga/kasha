import { inject, Injectable, signal } from '@angular/core';
import { TUI_DARK_MODE } from '@taiga-ui/core';
import { readStored, store } from '../shared/local-storage';

export type ThemeMode = 'system' | 'light' | 'dark';

/** Read by the script in `src/index.html` too, which sets the theme before Angular starts so nothing flashes. */
const KEY = 'kalare.theme';

function readMode(): ThemeMode {
  const saved = readStored<string>(KEY);
  return saved === 'light' || saved === 'dark' ? saved : 'system';
}

/**
 * Light, dark, or the phone's own setting (the default). Drives Taiga's dark mode, which puts `tuiTheme="dark"` on
 * `<body>`; Kasha's tokens switch on that attribute (`src/styles/tokens.css`).
 */
@Injectable({ providedIn: 'root' })
export class AppTheme {
  private readonly dark = inject(TUI_DARK_MODE);

  readonly mode = signal<ThemeMode>(readMode());

  constructor() {
    this.apply(this.mode());
  }

  set(mode: ThemeMode): void {
    store(KEY, mode);
    this.apply(mode);
  }

  private apply(mode: ThemeMode): void {
    this.mode.set(mode);
    if (mode === 'system') this.dark.reset();
    else this.dark.set(mode === 'dark');
  }
}
