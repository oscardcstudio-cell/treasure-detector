/**
 * Hype lines — motivational/humorous messages tied to locations
 * Uses a deterministic hash on the seed (location ID/name) so each place keeps its phrase
 */

import hypeConfig from '../../config/hype.json';

/**
 * Deterministic hash function using FNV-1a algorithm.
 * Returns a number 0..1 based on a string seed.
 * Better distribution than simple polynomial rolling hash.
 */
function hashSeed(seed: string): number {
  let hash = 2166136261; // FNV offset basis (32-bit)
  const prime = 16777619;

  for (let i = 0; i < seed.length; i++) {
    hash = hash ^ seed.charCodeAt(i);
    hash = (hash * prime) >>> 0; // Multiply and keep as 32-bit unsigned
  }

  // Normalize to 0..1
  return (hash >>> 0) % 10000 / 10000;
}

/**
 * Pick a hype line deterministically based on seed.
 * Same seed always returns the same line.
 * @param seed string to hash (e.g., location name, target ID)
 * @returns a random but deterministic hype line, or empty string if disabled
 */
export function pickHypeLine(seed: string): string {
  if (!hypeConfig.enabled) {
    return '';
  }

  // Combine both style arrays
  const allLines = [...hypeConfig.lines.tonyMontana, ...hypeConfig.lines.argotTerrain];

  if (allLines.length === 0) {
    return '';
  }

  const hash = hashSeed(seed);
  const index = Math.floor(hash * allLines.length);
  return allLines[index] || '';
}

/**
 * Get a random hype line (not seeded; for testing or variety).
 */
export function getRandomHypeLine(): string {
  if (!hypeConfig.enabled) {
    return '';
  }

  const allLines = [...hypeConfig.lines.tonyMontana, ...hypeConfig.lines.argotTerrain];
  if (allLines.length === 0) {
    return '';
  }

  const index = Math.floor(Math.random() * allLines.length);
  return allLines[index] || '';
}
