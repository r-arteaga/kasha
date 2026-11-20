import { newId } from './new-id';

const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

describe('newId', () => {
  afterEach(() => {
    // Drops the own property the second test puts over the prototype's method.
    delete (crypto as { randomUUID?: unknown }).randomUUID;
  });

  it('gives a random UUID', () => {
    const a = newId();
    expect(a).toMatch(UUID_V4);
    expect(newId()).not.toBe(a);
  });

  // Over plain http (the phone opening the PC by its address) browsers leave out crypto.randomUUID.
  it('still gives one where crypto.randomUUID is missing', () => {
    Object.defineProperty(crypto, 'randomUUID', { value: undefined, configurable: true });
    expect(crypto.randomUUID).toBeUndefined();
    const a = newId();
    expect(a).toMatch(UUID_V4);
    expect(newId()).not.toBe(a);
  });
});
