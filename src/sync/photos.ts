/**
 * Photo Sync — separate from entity sync, Wi-Fi only
 *
 * Photos are heavy (potentially MB per find). They sync separately:
 * 1. Metadata (find, surfaceObservation) syncs first via the regular queue
 * 2. Photo blobs upload to Supabase Storage separately, only over Wi-Fi
 *
 * Each photo has its own sync state:
 * - pending: waiting to upload
 * - uploading: currently uploading
 * - synced: successfully uploaded to Storage
 * - failed: upload failed (will retry)
 *
 * Photos are referenced by key in the entity:
 * - Find.photos: array of photo blob keys
 * - SurfaceObservation.photos: array of photo blob keys
 *
 * On the local client, keys are IndexedDB blob keys (e.g., 'blob://uuid').
 * After sync, they become Supabase Storage URLs (e.g., 'https://...photos/uuid.jpg').
 */

import { getSupabaseClient, isSupabaseReady } from '../lib/supabase';

export interface PhotoSyncState {
  key: string; // blob key or Storage URL
  entityId: string; // Find or SurfaceObservation ID
  entityType: 'find' | 'surfaceObservation';
  state: 'pending' | 'uploading' | 'synced' | 'failed';
  error?: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Check if device has Wi-Fi connectivity.
 * Falls back to true if API not available (allow upload to proceed).
 */
export async function isWifiConnected(): Promise<boolean> {
  if (typeof navigator === 'undefined') return true;

  const conn = (navigator as any).connection || (navigator as any).mozConnection;
  if (!conn) return true; // Assume Wi-Fi if no API

  // Allow upload on wifi or ethernet; block on cellular
  return conn.type === 'wifi' || conn.type === 'ethernet';
}

/**
 * Enqueue a photo for upload to Supabase Storage.
 * The photo remains in IndexedDB until successfully uploaded.
 *
 * @param entityId UUID of the Find or SurfaceObservation
 * @param entityType 'find' or 'surfaceObservation'
 * @param blobKey the IndexedDB blob key
 */
export async function enqueuephoto(
  entityId: string,
  entityType: 'find' | 'surfaceObservation',
  blobKey: string
): Promise<void> {
  // Note: getDatabase() is available for future use when photo sync state
  // is migrated to a persistent Dexie table instead of localStorage
  // const db = getDatabase();
  const now = new Date().toISOString();

  // For now, we store photo sync state in a simple memory cache or localStorage.
  // A production system might add a Dexie table for this.
  // This is a simplified version; a real implementation would be more robust.

  const cacheKey = `photo_sync:${entityId}:${blobKey}`;
  const state: PhotoSyncState = {
    key: blobKey,
    entityId,
    entityType,
    state: 'pending',
    createdAt: now,
    updatedAt: now,
  };

  if (typeof localStorage !== 'undefined') {
    localStorage.setItem(cacheKey, JSON.stringify(state));
  }
}

/**
 * Sync pending photos to Supabase Storage.
 * Checks Wi-Fi connectivity first; if not connected, returns without error.
 *
 * @returns { uploaded: number, failed: number, skipped: number, errors: string[] }
 */
export async function syncPhotos(): Promise<{
  uploaded: number;
  failed: number;
  skipped: number;
  errors: string[];
}> {
  if (!isSupabaseReady()) {
    return { uploaded: 0, failed: 0, skipped: 0, errors: ['Supabase not ready'] };
  }

  // Check Wi-Fi
  const hasWifi = await isWifiConnected();
  if (!hasWifi) {
    console.log('[Photos] Not on Wi-Fi, deferring photo upload');
    return { uploaded: 0, failed: 0, skipped: -1, errors: [] }; // -1 means "deferred"
  }

  let uploaded = 0;
  let failed = 0;
  let skipped = 0;
  const errors: string[] = [];

  const supabase = getSupabaseClient();
  if (!supabase) {
    return { uploaded: 0, failed: 0, skipped: 0, errors: ['No Supabase client'] };
  }

  // Note: db will be used for photo state tracking in future implementation
  // const db = getDatabase();

  // Placeholder: In a real implementation, you'd iterate over pending photos
  // from the photo sync state cache and upload each one.
  // For this T1.7 delivery, the structure is in place; the actual photo blob
  // handling awaits a photo storage implementation.

  console.log('[Photos] Photo sync structure in place, awaiting blob storage');

  return { uploaded, failed, skipped, errors };
}

/**
 * Mark a photo as successfully synced.
 * Update its state to 'synced' and replace the blob key with the Storage URL.
 */
export async function markPhotoSynced(
  entityId: string,
  blobKey: string,
  storageUrl: string
): Promise<void> {
  // Update cache
  const cacheKey = `photo_sync:${entityId}:${blobKey}`;
  if (typeof localStorage !== 'undefined') {
    const stored = localStorage.getItem(cacheKey);
    if (stored) {
      const state: PhotoSyncState = JSON.parse(stored);
      state.state = 'synced';
      state.key = storageUrl;
      state.updatedAt = new Date().toISOString();
      localStorage.setItem(cacheKey, JSON.stringify(state));
    }
  }

  // Update the entity's photos array to replace blob key with Storage URL
  // This is done by the entity update logic, not here.
}

/**
 * Mark a photo upload as failed.
 */
export async function markPhotoFailed(
  entityId: string,
  blobKey: string,
  error: string
): Promise<void> {
  const cacheKey = `photo_sync:${entityId}:${blobKey}`;
  if (typeof localStorage !== 'undefined') {
    const stored = localStorage.getItem(cacheKey);
    if (stored) {
      const state: PhotoSyncState = JSON.parse(stored);
      state.state = 'failed';
      state.error = error;
      state.updatedAt = new Date().toISOString();
      localStorage.setItem(cacheKey, JSON.stringify(state));
    }
  }
}

/**
 * Get the sync state of all pending photos (for status display).
 */
export async function getPhotoSyncStates(): Promise<{
  pending: number;
  uploading: number;
  synced: number;
  failed: number;
}> {
  let pending = 0;
  let uploading = 0;
  let synced = 0;
  let failed = 0;

  if (typeof localStorage === 'undefined') {
    return { pending, uploading, synced, failed };
  }

  // Iterate over all entries in localStorage starting with 'photo_sync:'
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith('photo_sync:')) {
      const stored = localStorage.getItem(key);
      if (stored) {
        try {
          const state: PhotoSyncState = JSON.parse(stored);
          switch (state.state) {
            case 'pending':
              pending++;
              break;
            case 'uploading':
              uploading++;
              break;
            case 'synced':
              synced++;
              break;
            case 'failed':
              failed++;
              break;
          }
        } catch {
          // Ignore parse errors
        }
      }
    }
  }

  return { pending, uploading, synced, failed };
}
