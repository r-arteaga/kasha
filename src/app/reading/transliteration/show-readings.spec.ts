import { TestBed } from '@angular/core/testing';
import { ShowReadings } from './show-readings';

describe('ShowReadings', () => {
  beforeEach(() => localStorage.clear());

  it('shows the pinyin until she hides it, and remembers her choice for the next kasha', () => {
    expect(TestBed.inject(ShowReadings).on()).toBe(true);

    TestBed.inject(ShowReadings).toggle();
    expect(TestBed.inject(ShowReadings).on()).toBe(false);
    TestBed.resetTestingModule();

    expect(TestBed.inject(ShowReadings).on()).toBe(false);

    TestBed.inject(ShowReadings).toggle();
    TestBed.resetTestingModule();

    expect(TestBed.inject(ShowReadings).on()).toBe(true);
  });
});
