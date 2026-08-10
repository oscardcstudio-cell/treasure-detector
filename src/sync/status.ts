/**
 * Sync Status — aggregate view of sync queue and photo upload state
 *
 * Provides a single interface for UI components to display:
 * - Number of entities pending sync
 * - Number of photos pending upload
 * - Last sync timestamp
 * - Sync errors (if any)
 * - Authentication status (required for sync)
 */

import { getQueueSize } from './queue';
import { getPhotoSyncStates } from './photos';
import { isAuthenticated } from '../auth/session';

export interface SyncStatus {
  queueSize: number; // entities awaiting sync
  photosPending: number;
  photosUploading: number;
  photosSynced: number;
  photosFailed: number;
  lastSyncTime?: string;
  errors: string[];
  isOnline: boolean;
  isAuthenticated: boolean; // required for sync to run
}

let lastSyncTime: string | undefined;

/**
 * Get the current sync status.
 * Called by the SyncBadge component to display status to the user.
 */
export async function getSyncStatus(): Promise<SyncStatus> {
  const queueSize = await getQueueSize();
  const photoStates = await getPhotoSyncStates();

  const isOnline = typeof navigator !== 'undefined' && navigator.onLine;
  const isAuth = await isAuthenticated();

  return {
    queueSize,
    photosPending: photoStates.pending,
    photosUploading: photoStates.uploading,
    photosSynced: photoStates.synced,
    photosFailed: photoStates.failed,
    lastSyncTime,
    errors: [],
    isOnline,
    isAuthenticated: isAuth,
  };
}

/**
 * Record a successful sync.
 * Called by the sync pipeline after drainSyncQueue() completes.
 */
export function recordSyncSuccess(): void {
  lastSyncTime = new Date().toISOString();
}

/**
 * Get a human-readable message for the sync badge.
 * Examples:
 * - "42 en attente" (42 pending)
 * - "Syncing..." (currently uploading)
 * - "OK" (all synced, online)
 * - "Hors ligne" (offline, but data safe in queue)
 * - "Sauvegarde inactive" (not authenticated)
 */
export function getSyncMessage(status: SyncStatus): string {
  if (!status.isAuthenticated) {
    return 'Sauvegarde inactive';
  }

  if (!status.isOnline) {
    return `Hors ligne (${status.queueSize} en attente)`;
  }

  const totalPhotos = status.photosPending + status.photosUploading;
  if (status.queueSize > 0 || totalPhotos > 0) {
    const items = [];
    if (status.queueSize > 0) items.push(`${status.queueSize} entités`);
    if (totalPhotos > 0) items.push(`${totalPhotos} photos`);
    return `Syncing... (${items.join(', ')})`;
  }

  if (status.photosFailed > 0) {
    return `⚠️ ${status.photosFailed} photos échoué`;
  }

  if (lastSyncTime) {
    const syncDate = new Date(lastSyncTime);
    const now = new Date();
    const diffMs = now.getTime() - syncDate.getTime();

    if (diffMs < 60000) {
      return 'Synchronisé à l\'instant';
    } else if (diffMs < 3600000) {
      const mins = Math.floor(diffMs / 60000);
      return `Synchro il y a ${mins} min`;
    }
  }

  return 'OK';
}

/**
 * Get the visual color for the sync badge.
 * Returns: 'green' (synced), 'orange' (pending), 'red' (offline or errors)
 */
export function getSyncColor(status: SyncStatus): 'green' | 'orange' | 'red' | 'grey' {
  if (!status.isAuthenticated) return 'grey';
  if (!status.isOnline) return 'red';
  if (status.photosFailed > 0) return 'red';
  if (status.queueSize > 0 || status.photosPending > 0) return 'orange';
  return 'green';
}
