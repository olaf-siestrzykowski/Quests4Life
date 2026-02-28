/**
 * Tiny crypto-based UUID v4 replacement that works in RN without 'crypto' polyfill.
 * Uses Math.random as fallback — suitable for local IDs, not security.
 */
export function newId(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}
