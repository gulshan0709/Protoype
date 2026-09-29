// Deterministic hashing for the demo data: the same text gives the same number on
// every platform and in node, so generated rows, portraits and captures never move.
// Pure (no imports), so node tests and scripts can load it.

/** 32-bit FNV-1a of a text. */
export function fnv1a(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++)
    h = Math.imul(h ^ text.charCodeAt(i), 16777619);
  return h >>> 0;
}

/** murmur3's 32-bit finaliser: spreads hashes of keys that differ only in their last letters. */
export function fmix32(hash: number): number {
  let h = hash;
  h ^= h >>> 16;
  h = Math.imul(h, 0x85ebca6b);
  h ^= h >>> 13;
  h = Math.imul(h, 0xc2b2ae35);
  h ^= h >>> 16;
  return h >>> 0;
}

/** A stable fraction in [0, 1) for a text. */
export const unitHash = (text: string) => fnv1a(text) / 4294967296;

/** A repeatable random sequence in [0, 1) seeded by a text (mulberry32). */
export function seededRandom(text: string): () => number {
  let a = fnv1a(text);
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
