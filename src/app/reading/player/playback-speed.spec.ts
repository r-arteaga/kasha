import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PlaybackSpeed, SPEEDS, speedLabel } from './playback-speed';

describe('speedLabel', () => {
  it('writes the speed the Spanish way, with a decimal comma', () => {
    expect(speedLabel(0.8, 'es')).toBe('0,8×');
    expect(speedLabel(0.75, 'es')).toBe('0,75×');
    expect(speedLabel(1, 'es')).toBe('1×');
  });

  it("writes it the way of the app's language", () => {
    expect(speedLabel(0.8, 'en')).toBe('0.8×');
    expect(speedLabel(0.8, 'ru')).toBe('0,8×');
  });
});

describe('SPEEDS', () => {
  it('goes from half speed to normal speed, slowest first', () => {
    expect(SPEEDS).toEqual([0.5, 1]);
  });
});

describe('PlaybackSpeed', () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => vi.restoreAllMocks());

  const fresh = () => {
    TestBed.resetTestingModule();
    return TestBed.inject(PlaybackSpeed);
  };

  it('starts at normal speed', () => {
    expect(fresh().rate()).toBe(1);
  });

  it('remembers the chosen speed for the next time the app opens', () => {
    fresh().set(0.5);

    expect(fresh().rate()).toBe(0.5);
  });

  it('ignores a speed that is not one of the offered ones', () => {
    const speed = fresh();
    speed.set(3);
    localStorage.setItem('kalare.speed', '7');

    expect(speed.rate()).toBe(1);
    expect(fresh().rate()).toBe(1);
  });

  it('still works when the phone refuses storage', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('denied');
    });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('denied');
    });

    const speed = fresh();
    speed.set(0.5);

    expect(speed.rate()).toBe(0.5);
  });
});
