/**
 * Restore database from a backup JSON file.
 * Handles loss detection and idempotent import.
 */

import { getDatabase } from '../db/schema';
import type { TreasureDB } from '../db/schema';
import type { Find, SurfaceObservation } from '../db/types';
import type { BackupPayload } from './types';
import { getLastBackupMetadata, clearBackupMetadata } from './export';

/**
 * Check if the database appears to be empty.
 */
export async function isDatabaseEmpty(db: TreasureDB = getDatabase()): Promise<boolean> {
  const [sessions, digPoints, finds] = await Promise.all([
    db.sessions.count(),
    db.digPoints.count(),
    db.finds.count(),
  ]);

  return sessions === 0 && digPoints === 0 && finds === 0;
}

/**
 * Check if a loss scenario is detected:
 * - Database is currently empty
 * - A backup metadata exists in localStorage (meaning a backup was made before)
 */
export async function detectDataLoss(db: TreasureDB = getDatabase()): Promise<boolean> {
  const empty = await isDatabaseEmpty(db);
  const metadata = getLastBackupMetadata();
  if (!empty || metadata === null) return false;
  // Une sauvegarde vide n'est pas une perte : ignore les marqueurs à zéro
  // (profils pollués par d'anciens auto-exports sur base vide).
  const counts = metadata.entityCounts;
  const total = counts.sessions + counts.trackPoints + counts.digPoints + counts.finds + counts.surfaceObservations;
  return total > 0;
}

/**
 * Get loss detection info (for UI display).
 */
export function getLossDetectionInfo(): {
  exists: boolean;
  metadata: ReturnType<typeof getLastBackupMetadata>;
} {
  const metadata = getLastBackupMetadata();
  return {
    exists: metadata !== null,
    metadata,
  };
}

/**
 * Import a backup JSON into the database.
 * Idempotent: re-importing the same backup twice does not create duplicates.
 * Uses UUIDs as the key for idempotent upserts.
 */
export async function importBackup(
  backupJson: string,
  db: TreasureDB = getDatabase()
): Promise<{
  success: boolean;
  imported: number;
  error?: string;
}> {
  try {
    const payload = JSON.parse(backupJson) as BackupPayload;

    // Validate schema version
    if (payload.schemaVersion > 1) {
      return {
        success: false,
        imported: 0,
        error: `Backup schema version ${payload.schemaVersion} is newer than supported v1`,
      };
    }

    let importedCount = 0;

    // Import tables in order (respecting FK relationships)
    // Order: sessions → trackPoints → sweptAreas → digPoints → finds → surfaceObservations → presets → scoreCells

    // 1. Sessions
    for (const session of payload.sessions) {
      await db.sessions.put(session);
      importedCount++;
    }

    // 2. TrackPoints
    for (const trackPoint of payload.trackPoints) {
      await db.trackPoints.put(trackPoint);
      importedCount++;
    }

    // 3. SweptAreas
    for (const sweptArea of payload.sweptAreas) {
      await db.sweptAreas.put(sweptArea);
      importedCount++;
    }

    // 4. DigPoints
    for (const digPoint of payload.digPoints) {
      await db.digPoints.put(digPoint);
      importedCount++;
    }

    // 5. Finds (with photo restoration)
    for (const findData of payload.finds) {
      // Restore photos from base64
      const photoKeys: string[] = [];
      for (const photoData of findData.photos) {
        // Note: Photo storage in IndexedDB is not yet implemented
        // For now, we skip photo restoration and just preserve the keys
        photoKeys.push(photoData.key);
      }

      // Import the find entity itself
      const findToImport: Find = {
        ...findData,
        photos: photoKeys,
      };

      await db.finds.put(findToImport);
      importedCount++;
    }

    // 6. SurfaceObservations (with photo restoration)
    for (const surfObsData of payload.surfaceObservations) {
      const photoKeys: string[] = [];
      for (const photoData of surfObsData.photos) {
        // Note: Photo storage in IndexedDB is not yet implemented
        // For now, we skip photo restoration and just preserve the keys
        photoKeys.push(photoData.key);
      }

      const surfObsToImport: SurfaceObservation = {
        ...surfObsData,
        photos: photoKeys,
      };

      await db.surfaceObservations.put(surfObsToImport);
      importedCount++;
    }

    // 7. DetectorPresets
    for (const preset of payload.detectorPresets) {
      await db.detectorPresets.put(preset);
      importedCount++;
    }

    // 8. ScoreCells
    for (const scoreCell of payload.scoreCells) {
      await db.scoreCells.put(scoreCell);
      importedCount++;
    }

    // Clear the loss-detection marker now that we've restored
    clearBackupMetadata();

    return {
      success: true,
      imported: importedCount,
    };
  } catch (e) {
    const errorMsg = e instanceof Error ? e.message : String(e);
    return {
      success: false,
      imported: 0,
      error: errorMsg,
    };
  }
}

/**
 * Load a backup file from disk (File input).
 */
export async function loadBackupFile(file: File): Promise<{
  success: boolean;
  content?: string;
  error?: string;
}> {
  try {
    const content = await file.text();
    // Validate JSON
    JSON.parse(content);
    return { success: true, content };
  } catch (e) {
    const errorMsg = e instanceof Error ? e.message : String(e);
    return { success: false, error: `Invalid backup file: ${errorMsg}` };
  }
}


/**
 * Setup loss detection on app startup.
 * If data was lost, prompt the user to restore.
 */
export async function setupLossDetection(
  db: TreasureDB = getDatabase(),
  onLossDetected?: (metadata: ReturnType<typeof getLastBackupMetadata>) => void
): Promise<void> {
  const lossDetected = await detectDataLoss(db);
  if (lossDetected) {
    const metadata = getLastBackupMetadata();
    console.warn('Data loss detected! Last backup:', metadata);
    if (onLossDetected) {
      onLossDetected(metadata);
    }
  }
}
