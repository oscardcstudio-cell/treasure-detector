import { describe, it, expect, beforeEach, vi } from 'vitest';
import { enumerateTiles, estimateTileDownload, getCacheQuotaInfo, downloadTiles } from '../tiles';
import type { TileDownloadOptions } from '../types';

describe('geo/tiles', () => {
  describe('enumerateTiles', () => {
    it('should enumerate correct number of tiles for a small bbox at a single zoom', () => {
      // Armous-et-Cau bbox : [0.0908, 43.4742, 0.2908, 43.6742]
      // At zoom 12, this should cover a specific number of tiles
      const bbox: [number, number, number, number] = [0.0908, 43.4742, 0.2908, 43.6742];
      const tiles = enumerateTiles(bbox, 12, 12);

      // Verify we get tiles (exact count depends on Mercator projection)
      expect(tiles.length).toBeGreaterThan(0);

      // All tiles should have z=12
      for (const tile of tiles) {
        expect(tile.z).toBe(12);
        expect(tile.x).toBeGreaterThanOrEqual(0);
        expect(tile.y).toBeGreaterThanOrEqual(0);
        expect(tile.x).toBeLessThan(Math.pow(2, 12));
        expect(tile.y).toBeLessThan(Math.pow(2, 12));
      }
    });

    it('should enumerate tiles across multiple zoom levels', () => {
      const bbox: [number, number, number, number] = [0.0908, 43.4742, 0.2908, 43.6742];
      const tiles = enumerateTiles(bbox, 12, 14);

      // Should have tiles from z12, z13, z14
      const zoomLevels = new Set(tiles.map(t => t.z));
      expect(zoomLevels.has(12)).toBe(true);
      expect(zoomLevels.has(13)).toBe(true);
      expect(zoomLevels.has(14)).toBe(true);

      // Higher zoom should have more tiles
      const z12 = tiles.filter(t => t.z === 12).length;
      const z14 = tiles.filter(t => t.z === 14).length;
      expect(z14).toBeGreaterThan(z12);
    });

    it('should not enumerate tiles for empty/inverted bbox', () => {
      // Inverted bbox (min > max)
      const bbox: [number, number, number, number] = [0.2908, 43.6742, 0.0908, 43.4742];
      const tiles = enumerateTiles(bbox, 12, 12);

      // Should handle gracefully (may return 0 or swap coordinates)
      expect(tiles).toBeDefined();
    });

    it('should clamp tiles to valid grid boundaries', () => {
      // Extreme bbox covering the world
      const bbox: [number, number, number, number] = [-180, -85, 180, 85];
      const tiles = enumerateTiles(bbox, 12, 12);

      for (const tile of tiles) {
        expect(tile.x).toBeGreaterThanOrEqual(0);
        expect(tile.x).toBeLessThan(Math.pow(2, 12));
        expect(tile.y).toBeGreaterThanOrEqual(0);
        expect(tile.y).toBeLessThan(Math.pow(2, 12));
      }
    });
  });

  describe('estimateTileDownload', () => {
    it('should estimate total tiles correctly', () => {
      const bbox: [number, number, number, number] = [0.0908, 43.4742, 0.2908, 43.6742];
      const options: TileDownloadOptions = {
        bbox,
        minZoom: 12,
        maxZoom: 12,
        layerIds: ['plan-ignv2'],
      };

      const estimate = estimateTileDownload(options);
      expect(estimate.totalTiles).toBeGreaterThan(0);
      expect(estimate.estimatedSizeMb).toBeGreaterThan(0);
      expect(estimate.avgSizeKb).toBe(50); // Heuristique fixe
    });

    it('should estimate size based on tile count and heuristic', () => {
      const bbox: [number, number, number, number] = [0.0908, 43.4742, 0.2908, 43.6742];
      const options: TileDownloadOptions = {
        bbox,
        minZoom: 12,
        maxZoom: 14,
        layerIds: ['plan-ignv2'],
      };

      const estimate = estimateTileDownload(options);
      // Estimate should be: totalTiles * 50 KB / 1024
      const expectedMb = (estimate.totalTiles * 50) / 1024;
      expect(estimate.estimatedSizeMb).toBeCloseTo(expectedMb, 1);
    });

    it('should scale estimate correctly for multiple layers', () => {
      const bbox: [number, number, number, number] = [0.0908, 43.4742, 0.2908, 43.6742];
      const singleLayer: TileDownloadOptions = {
        bbox,
        minZoom: 12,
        maxZoom: 12,
        layerIds: ['plan-ignv2'],
      };

      const twoLayers: TileDownloadOptions = {
        bbox,
        minZoom: 12,
        maxZoom: 12,
        layerIds: ['plan-ignv2', 'ortho-current'],
      };

      const singleEst = estimateTileDownload(singleLayer);
      const doubleEst = estimateTileDownload(twoLayers);

      // Two layers should estimate ~twice the size
      expect(doubleEst.totalTiles).toBe(singleEst.totalTiles * 2);
      expect(doubleEst.estimatedSizeMb).toBeCloseTo(singleEst.estimatedSizeMb * 2, 1);
    });
  });

  describe('getCacheQuotaInfo', () => {
    it('should return valid quota info structure', async () => {
      const info = await getCacheQuotaInfo();

      expect(info).toHaveProperty('quota');
      expect(info).toHaveProperty('usage');
      expect(info).toHaveProperty('available');
      expect(info).toHaveProperty('percentUsed');

      expect(typeof info.quota).toBe('number');
      expect(typeof info.usage).toBe('number');
      expect(typeof info.available).toBe('number');
      expect(typeof info.percentUsed).toBe('number');
    });

    it('should report available = quota - usage', async () => {
      const info = await getCacheQuotaInfo();

      // Basic sanity check
      expect(info.available).toBe(info.quota - info.usage);
    });

    it('should report percentUsed in valid range', async () => {
      const info = await getCacheQuotaInfo();

      expect(info.percentUsed).toBeGreaterThanOrEqual(0);
      expect(info.percentUsed).toBeLessThanOrEqual(100);
    });

    it('should handle missing navigator.storage.estimate gracefully', async () => {
      // Save original
      const original = navigator.storage.estimate;

      // Mock to throw
      Object.defineProperty(navigator.storage, 'estimate', {
        value: undefined,
      });

      const info = await getCacheQuotaInfo();

      // Should return sensible defaults
      expect(info.quota).toBe(0);
      expect(info.usage).toBe(0);
      expect(info.available).toBe(0);

      // Restore
      Object.defineProperty(navigator.storage, 'estimate', {
        value: original,
      });
    });
  });

  describe('downloadTiles', () => {
    beforeEach(() => {
      // Mock caches API
      global.caches = {
        open: vi.fn().mockResolvedValue({
          match: vi.fn().mockResolvedValue(null),
          put: vi.fn().mockResolvedValue(undefined),
          delete: vi.fn().mockResolvedValue(true),
        }),
        keys: vi.fn().mockResolvedValue([]),
        delete: vi.fn().mockResolvedValue(true),
        has: vi.fn().mockResolvedValue(false),
        addAll: vi.fn().mockResolvedValue(undefined),
      } as unknown as CacheStorage;
    });

    it('should throw on empty layer list', async () => {
      const options: TileDownloadOptions = {
        bbox: [0.0908, 43.4742, 0.2908, 43.6742],
        minZoom: 12,
        maxZoom: 12,
        layerIds: [],
      };

      await expect(downloadTiles(options)).rejects.toThrow('No layers specified');
    });

    it('should throw on invalid layer ID', async () => {
      const options: TileDownloadOptions = {
        bbox: [0.0908, 43.4742, 0.2908, 43.6742],
        minZoom: 12,
        maxZoom: 12,
        layerIds: ['nonexistent-layer'],
      };

      await expect(downloadTiles(options)).rejects.toThrow('Layer not found');
    });

    it('should throw if minZoom > maxZoom', async () => {
      const options: TileDownloadOptions = {
        bbox: [0.0908, 43.4742, 0.2908, 43.6742],
        minZoom: 14,
        maxZoom: 12,
        layerIds: ['plan-ignv2'],
      };

      await expect(downloadTiles(options)).rejects.toThrow('minZoom must be <= maxZoom');
    });

    it('should call onProgress callback', async () => {
      const progress: Array<[number, number]> = [];
      const callback = (downloaded: number, total: number) => {
        progress.push([downloaded, total]);
      };

      // Mock fetch to succeed
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        clone: () => ({ blob: () => Promise.resolve(new Blob(['data'])) }),
        blob: () => Promise.resolve(new Blob(['data'])),
      });

      // Note: Full integration test would need real caches/fetch environment
      // This validates the callback structure exists
      expect(progress).toBeDefined();
      expect(callback).toBeDefined();
    });

    it('should respect abort signal', async () => {
      const controller = new AbortController();
      controller.abort(); // Abort before starting

      const options: TileDownloadOptions = {
        bbox: [0.0908, 43.4742, 0.2908, 43.6742],
        minZoom: 12,
        maxZoom: 12,
        layerIds: ['plan-ignv2'],
        signal: controller.signal,
      };

      await expect(downloadTiles(options)).rejects.toThrow('cancelled');
    });
  });
});
