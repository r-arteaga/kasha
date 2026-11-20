// The phone's local storage can be missing or refuse writes (private mode, full disk). Settings then simply are
// not remembered, so every read falls back to null and every write may silently do nothing.

export function readStored<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

export function store(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Not remembering is acceptable.
  }
}
