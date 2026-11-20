import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { TUI_DARK_MODE } from '@taiga-ui/core';
import { beforeEach, describe, expect, it } from 'vitest';
import { AppTheme } from './app-theme';

/** Taiga's dark-mode switch: `set` pins light or dark, `reset` follows the phone again (here, a dark phone). */
function fakeDarkMode() {
  const dark = signal(false);
  const raw = dark.set.bind(dark);
  return Object.assign(dark, {
    pinned: false,
    set(value: boolean) {
      this.pinned = true;
      raw(value);
    },
    reset() {
      this.pinned = false;
      raw(true);
    },
  });
}

describe('AppTheme', () => {
  beforeEach(() => localStorage.clear());

  const fresh = () => {
    const dark = fakeDarkMode();
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: [{ provide: TUI_DARK_MODE, useValue: dark }] });
    return { theme: TestBed.inject(AppTheme), dark };
  };

  it("follows the phone's light or dark mode at first", () => {
    const { theme, dark } = fresh();

    expect(theme.mode()).toBe('system');
    expect(dark.pinned).toBe(false);
    expect(dark()).toBe(true);
  });

  it('pins dark or light when she picks one', () => {
    const { theme, dark } = fresh();

    theme.set('light');
    expect(dark()).toBe(false);
    expect(dark.pinned).toBe(true);

    theme.set('dark');
    expect(dark()).toBe(true);
  });

  it('remembers her choice on the phone', () => {
    fresh().theme.set('light');

    const { theme, dark } = fresh();

    expect(theme.mode()).toBe('light');
    expect(dark()).toBe(false);
  });

  it('goes back to following the phone', () => {
    fresh().theme.set('light');
    fresh().theme.set('system');

    const { theme, dark } = fresh();

    expect(theme.mode()).toBe('system');
    expect(dark.pinned).toBe(false);
  });
});
