import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import { PauseToRepeat } from './pause-to-repeat';

describe('PauseToRepeat', () => {
  beforeEach(() => localStorage.clear());

  const fresh = () => {
    TestBed.resetTestingModule();
    return TestBed.inject(PauseToRepeat);
  };

  it('is off at first', () => {
    expect(fresh().on()).toBe(false);
  });

  it('remembers that she practises with pauses', () => {
    fresh().set(true);

    expect(fresh().on()).toBe(true);
  });

  it('remembers turning it off again', () => {
    fresh().set(true);
    fresh().set(false);

    expect(fresh().on()).toBe(false);
  });
});
