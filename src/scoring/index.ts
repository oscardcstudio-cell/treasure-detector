/**
 * Scoring module export
 *
 * Public API for T3.3 scoring engine.
 * Exposes:
 * - scoreZone (async, pure)
 * - spawnWorker (high-level abstraction)
 * - types
 */

export { scoreZone, validateConfig, validateNoDuplicates } from './engine';
export { generateHeatMap, scoreToColor, getHeatMapPaintSpec } from './heat';
export { WhyPanel } from './WhyPanel';
export type { ScoreCell, Contribution, ScoringConfig, Zone } from './types';

/**
 * Spawn Web Worker for scoring
 *
 * @param config - Scoring configuration
 * @param topoGeoJSON - Toponymy features
 * @param zone - Zone bbox
 * @returns Promise<ScoreCell[]>
 */
export function spawnWorker(
  config: any,
  topoGeoJSON: any,
  zone: any
): Promise<any[]> {
  return new Promise((resolve, reject) => {
    // Note: In a real implementation, we'd handle the worker lifecycle.
    // For now, return a placeholder that delegates to the sync function.
    // In production, use:
    // const worker = new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' });

    // Workaround for v1: call scoreZone directly
    // TODO: Implement proper Web Worker in v1.1 once bundler is stable
    import('./engine').then(({ scoreZone }) => {
      scoreZone(config, topoGeoJSON, zone)
        .then(resolve)
        .catch(reject);
    });
  });
}
