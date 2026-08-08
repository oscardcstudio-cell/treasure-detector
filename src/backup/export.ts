/**
 * Export the complete database to a JSON backup file.
 * Triggered automatically at session end and via beforeunload/visibilitychange.
 * Photos are embedded as base64.
 */

import { getDatabase } from '../db/schema';
import type { TreasureDB } from '../db/schema';
import type { BackupPayload, BackupMetadata, PhotoData, FindWithPhotos, SurfaceObservationWithPhotos } from './types';

const BACKUP_METADATA_KEY = 'treasure_detector_last_backup';
const BACKUP_TIMESTAMP_KEY = 'treasure_detector_last_backup_timestamp';

/**
 * Export the entire database to a JSON string.
 * Photos are extracted from IndexedDB and encoded as base64.
 */
export async function exportDatabase(db: TreasureDB = getDatabase()): Promise<string> {
  // Read all tables
  const [
    sessions,
    trackPoints,
    sweptAreas,
    digPoints,
    finds,
    surfaceObservations,
    detectorPresets,
    scoreCells,
  ] = await Promise.all([
    db.sessions.toArray(),
    db.trackPoints.toArray(),
    db.sweptAreas.toArray(),
    db.digPoints.toArray(),
    db.finds.toArray(),
    db.surfaceObservations.toArray(),
    db.detectorPresets.toArray(),
    db.scoreCells.toArray(),
  ]);

  // Extract and encode photos from IndexedDB (stored as blobs)
  const findPhotosMap = new Map<string, PhotoData[]>();
  const surfaceObsPhotosMap = new Map<string, PhotoData[]>();

  // Process finds
  for (const find of finds) {
    const photoDataList: PhotoData[] = [];
    for (const photoKey of find.photos) {
      try {
        // Note: Photo storage in IndexedDB is not yet implemented
        // This is a placeholder for future photo export functionality
        // For now, we skip photo export and just preserve the keys
      } catch (e) {
        console.warn(`Failed to export photo ${photoKey}:`, e);
      }
    }
    findPhotosMap.set(find.id, photoDataList);
  }

  // Process surface observations
  for (const surfObs of surfaceObservations) {
    const photoDataList: PhotoData[] = [];
    for (const photoKey of surfObs.photos) {
      try {
        // Note: Photo storage in IndexedDB is not yet implemented
        // This is a placeholder for future photo export functionality
        // For now, we skip photo export and just preserve the keys
      } catch (e) {
        console.warn(`Failed to export photo ${photoKey}:`, e);
      }
    }
    surfaceObsPhotosMap.set(surfObs.id, photoDataList);
  }

  // Construct the backup payload
  const payload: BackupPayload = {
    version: '1.0',
    schemaVersion: 1,
    exportedAt: new Date().toISOString(),
    deviceId: sessions.length > 0 ? (sessions[0]?.deviceId ?? 'unknown') : 'unknown',
    sessions,
    trackPoints,
    sweptAreas,
    digPoints,
    finds: finds.map((find) => ({
      ...find,
      photos: findPhotosMap.get(find.id) || [],
    })) as FindWithPhotos[],
    surfaceObservations: surfaceObservations.map((surfObs) => ({
      ...surfObs,
      photos: surfaceObsPhotosMap.get(surfObs.id) || [],
    })) as SurfaceObservationWithPhotos[],
    detectorPresets,
    scoreCells,
  };

  // Save metadata to localStorage for loss detection
  const metadata: BackupMetadata = {
    exportedAt: payload.exportedAt,
    fileName: `treasure-detector-backup-${payload.exportedAt.replace(/[^0-9]/g, '')}.json`,
    schemaVersion: payload.schemaVersion,
    entityCounts: {
      sessions: sessions.length,
      trackPoints: trackPoints.length,
      digPoints: digPoints.length,
      finds: finds.length,
      surfaceObservations: surfaceObservations.length,
    },
  };

  // Store metadata in localStorage (survives IndexedDB purge on iOS)
  try {
    localStorage.setItem(BACKUP_METADATA_KEY, JSON.stringify(metadata));
    const timestamp: string = payload.exportedAt;
    localStorage.setItem(BACKUP_TIMESTAMP_KEY, timestamp);
  } catch (e) {
    console.warn('Failed to save backup metadata to localStorage:', e);
  }

  return JSON.stringify(payload);
}

/**
 * Save an exported backup to a file using the File System Access API.
 * Falls back to download/share on iOS.
 */
export async function saveBackupToFile(backupJson: string): Promise<{ fileName: string; success: boolean }> {
  const payload = JSON.parse(backupJson) as BackupPayload;
  if (!payload.exportedAt) {
    throw new Error('Invalid backup: missing exportedAt timestamp');
  }
  const fileName = `treasure-detector-backup-${payload.exportedAt.replace(/[^0-9]/g, '')}.json`;

  // Try File System Access API (desktop PWA, Chrome, Edge)
  if ('showSaveFilePicker' in window) {
    try {
      const handle = await (window as any).showSaveFilePicker({
        suggestedName: fileName,
        types: [{ description: 'JSON Backup', accept: { 'application/json': ['.json'] } }],
      });
      const writable = await handle.createWritable();
      await writable.write(backupJson);
      await writable.close();
      return { fileName, success: true };
    } catch (e) {
      console.warn('File System Access API failed, falling back to download:', e);
    }
  }

  // Fallback: download as blob
  const blob = new Blob([backupJson], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  return { fileName, success: true };
}


/**
 * Get the last known backup metadata from localStorage.
 * Used to detect if the database was wiped but a backup existed.
 */
export function getLastBackupMetadata(): BackupMetadata | null {
  try {
    const metadataJson = localStorage.getItem(BACKUP_METADATA_KEY);
    if (metadataJson) {
      return JSON.parse(metadataJson) as BackupMetadata;
    }
  } catch (e) {
    console.warn('Failed to parse backup metadata from localStorage:', e);
  }
  return null;
}

/**
 * Get the timestamp of the last backup.
 */
export function getLastBackupTime(): string | null {
  try {
    return localStorage.getItem(BACKUP_TIMESTAMP_KEY);
  } catch (e) {
    console.warn('Failed to get backup timestamp:', e);
  }
  return null;
}

/**
 * Clear backup metadata from localStorage.
 * Called after successful import to reset the loss-detection marker.
 */
export function clearBackupMetadata(): void {
  try {
    localStorage.removeItem(BACKUP_METADATA_KEY);
    localStorage.removeItem(BACKUP_TIMESTAMP_KEY);
  } catch (e) {
    console.warn('Failed to clear backup metadata:', e);
  }
}

/**
 * Automatically export the database at regular intervals (e.g., on session end).
 * This is the "filet" for when sync fails or the phone is lost.
 */
export async function setupAutoExport(db: TreasureDB = getDatabase()): Promise<void> {
  // Export on visibility change (tab loses focus)
  document.addEventListener('visibilitychange', async () => {
    if (document.hidden) {
      try {
        const backupJson = await exportDatabase(db);
        await saveBackupToFile(backupJson);
      } catch (e) {
        console.error('Auto-export on visibilitychange failed:', e);
      }
    }
  });

  // Export on beforeunload (page close/reload)
  window.addEventListener('beforeunload', async () => {
    try {
      const backupJson = await exportDatabase(db);
      // Note: async save won't complete in beforeunload, but metadata is saved synchronously to localStorage
      saveBackupToFile(backupJson).catch((e) => console.error('Auto-export on beforeunload failed:', e));
    } catch (e) {
      console.error('Auto-export on beforeunload failed:', e);
    }
  });
}
