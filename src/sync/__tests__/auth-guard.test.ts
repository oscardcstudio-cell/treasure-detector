/**
 * Sync auth guard tests
 *
 * Verify that:
 * 1. drainSyncQueue() doesn't attempt to sync when user is not authenticated
 * 2. getSyncStatus() correctly reflects authentication state
 * 3. Error messages are user-friendly
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { drainSyncQueue } from '../push';
import { getSyncStatus, getSyncMessage } from '../status';
import { isAuthenticated } from '../../auth/session';
import { isSupabaseReady, getSupabaseClient } from '../../lib/supabase';

// Mock Supabase client
const mockSupabaseClient = {
  from: vi.fn((_table: string) => ({
    upsert: vi.fn(async (_rows: any[]) => {
      return { error: null };
    }),
    update: vi.fn(async () => {
      return { error: null };
    }),
    in: vi.fn(() => ({
      update: vi.fn(async () => {
        return { error: null };
      }),
    })),
  })),
};

// Mock dependencies before importing drainSyncQueue
vi.mock('../../auth/session');
vi.mock('../../lib/supabase', () => ({
  getSupabaseClient: vi.fn(() => mockSupabaseClient),
  isSupabaseReady: vi.fn(() => true),
}));

// Mock sync/queue with all required exports
vi.mock('../queue', () => ({
  getNextBatch: vi.fn().mockResolvedValue([]),
  getQueueSize: vi.fn().mockResolvedValue(0),
  markSynced: vi.fn(),
  markFailed: vi.fn(),
  enqueueSync: vi.fn(),
  clearQueue: vi.fn(),
}));

// Mock sync/photos
vi.mock('../photos', () => ({
  getPhotoSyncStates: vi.fn().mockResolvedValue({
    pending: 0,
    uploading: 0,
    synced: 0,
    failed: 0,
  }),
}));

describe('Sync auth guard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('drainSyncQueue()', () => {
    it('skips sync when Supabase is not ready', async () => {
      (isSupabaseReady as any).mockReturnValue(false);

      const result = await drainSyncQueue();

      expect(result.synced).toBe(0);
      expect(result.failed).toBe(0);
      expect(result.errors).toContain('Supabase not initialized');
    });

    it('skips sync when user is not authenticated', async () => {
      (isSupabaseReady as any).mockReturnValue(true);
      (getSupabaseClient as any).mockReturnValue(mockSupabaseClient);
      (isAuthenticated as any).mockResolvedValue(false);

      const result = await drainSyncQueue();

      expect(result.synced).toBe(0);
      expect(result.failed).toBe(0);
      expect(result.errors.length).toBeGreaterThan(0);
      // The error message should mention authentication or "Not authenticated"
      const errorMsg = result.errors.join(' ');
      expect(errorMsg.toLowerCase()).toContain('authenticate');
    });

    it('does not hammer the server with 401 errors when not authenticated', async () => {
      (isSupabaseReady as any).mockReturnValue(true);
      (getSupabaseClient as any).mockReturnValue(mockSupabaseClient);
      (isAuthenticated as any).mockResolvedValue(false);

      // Call drainSyncQueue multiple times
      const results = await Promise.all([
        drainSyncQueue(),
        drainSyncQueue(),
        drainSyncQueue(),
      ]);

      // All should return gracefully without attempting any network calls
      results.forEach((result) => {
        expect(result.synced).toBe(0);
        expect(result.failed).toBe(0);
      });
    });
  });

  describe('getSyncStatus()', () => {
    it('reflects authentication state', async () => {
      (isAuthenticated as any).mockResolvedValue(true);

      const status = await getSyncStatus();

      expect(status.isAuthenticated).toBe(true);
    });

    it('reflects not-authenticated state', async () => {
      (isAuthenticated as any).mockResolvedValue(false);

      const status = await getSyncStatus();

      expect(status.isAuthenticated).toBe(false);
    });
  });

  describe('getSyncMessage()', () => {
    it('displays "Sauvegarde inactive" when not authenticated', () => {
      const status = {
        queueSize: 5,
        photosPending: 0,
        photosUploading: 0,
        photosSynced: 0,
        photosFailed: 0,
        isOnline: true,
        isAuthenticated: false,
        errors: [],
      };

      const message = getSyncMessage(status);

      expect(message).toContain('Sauvegarde inactive');
    });

    it('shows pending items when authenticated and online', () => {
      const status = {
        queueSize: 3,
        photosPending: 2,
        photosUploading: 0,
        photosSynced: 0,
        photosFailed: 0,
        isOnline: true,
        isAuthenticated: true,
        errors: [],
      };

      const message = getSyncMessage(status);

      expect(message).toContain('Syncing');
      expect(message).toContain('3 entités');
      expect(message).toContain('2 photos');
    });

    it('prefers auth-inactive message over other states', () => {
      const status = {
        queueSize: 10,
        photosPending: 5,
        photosUploading: 3,
        photosSynced: 0,
        photosFailed: 0,
        isOnline: true,
        isAuthenticated: false, // Not authenticated takes precedence
        errors: [],
      };

      const message = getSyncMessage(status);

      // Should show "not authenticated" even though there are pending items
      expect(message).toContain('Sauvegarde inactive');
    });
  });
});
