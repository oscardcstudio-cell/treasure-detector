/**
 * Web Worker for scoring computation
 *
 * Receives config + data, returns ScoreCell[] array.
 * Includes caching + invalidation.
 */

import { scoreZone, validateConfig, validateNoDuplicates } from './engine';
import { ScoringConfig, TopoGeoJSON, Zone, ScoreCell } from './types';

interface WorkerMessage {
  type: 'score' | 'validate' | 'invalidateCache';
  config?: ScoringConfig;
  topoGeoJSON?: TopoGeoJSON;
  zone?: Zone;
}

interface WorkerResponse {
  type: 'result' | 'error' | 'progress';
  data?: ScoreCell[];
  error?: string;
  progress?: number;
  timingMs?: number;
}

let lastConfigHash = '';
let lastResultCache: ScoreCell[] | null = null;

/**
 * Compute simple hash of config + data for invalidation
 */
function hashData(config: ScoringConfig, topo: TopoGeoJSON): string {
  const str = JSON.stringify({ config, topo });
  // Simple hash (in production use crypto-js or tweetnacl)
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash).toString(16);
}

/**
 * Main worker message handler
 */
self.onmessage = async (event: MessageEvent<WorkerMessage>) => {
  const { type, config, topoGeoJSON, zone } = event.data;

  try {
    if (type === 'score') {
      if (!config || !topoGeoJSON || !zone) {
        throw new Error('Missing config, topoGeoJSON, or zone');
      }

      const hash = hashData(config, topoGeoJSON);

      // Check cache
      if (hash === lastConfigHash && lastResultCache) {
        const response: WorkerResponse = {
          type: 'result',
          data: lastResultCache,
          timingMs: 0, // From cache
        };
        self.postMessage(response);
        return;
      }

      // Validate first
      const startTime = performance.now();
      const validation = await validateConfig(config, topoGeoJSON);
      if (!validation.valid) {
        throw new Error(`Validation failed: ${validation.errors.join('; ')}`);
      }

      // Run scoring
      const results = await scoreZone(config, topoGeoJSON, zone);

      // Validate no duplicates
      const dupCheck = validateNoDuplicates(results);
      if (!dupCheck.valid) {
        throw new Error(`Duplicate check failed: ${dupCheck.errors.join('; ')}`);
      }

      const timingMs = performance.now() - startTime;

      // Cache result
      lastConfigHash = hash;
      lastResultCache = results;

      const response: WorkerResponse = {
        type: 'result',
        data: results,
        timingMs,
      };

      self.postMessage(response);
    } else if (type === 'invalidateCache') {
      lastConfigHash = '';
      lastResultCache = null;
      const response: WorkerResponse = {
        type: 'result',
      };
      self.postMessage(response);
    }
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    const response: WorkerResponse = {
      type: 'error',
      error: errorMsg,
    };
    self.postMessage(response);
  }
};

export {};
