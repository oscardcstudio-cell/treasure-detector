/**
 * Types for backup/restore operations.
 * Serialization formats for complete database export/import.
 */

import {
  Session,
  TrackPoint,
  SweptArea,
  DigPoint,
  Find,
  SurfaceObservation,
  DetectorPreset,
  ScoreCell,
} from '../db/types';

/**
 * Complete database snapshot for backup.
 * Includes all tables and is versioned for migration compatibility.
 */
export interface BackupPayload {
  // Metadata
  version: '1.0';
  schemaVersion: number; // corresponds to Dexie version
  exportedAt: string; // ISO 8601 UTC timestamp
  deviceId: string; // which device this was exported from

  // Data tables
  sessions: Session[];
  trackPoints: TrackPoint[];
  sweptAreas: SweptArea[];
  digPoints: DigPoint[];
  finds: FindWithPhotos[]; // photos are base64 encoded
  surfaceObservations: SurfaceObservationWithPhotos[];
  detectorPresets: DetectorPreset[];
  scoreCells: ScoreCell[];
}

/**
 * Find with embedded photo data (base64).
 * Photos in IndexedDB are stored as blobs with keys like "photo-{uuid}".
 * For export, we embed the base64-encoded content.
 */
export type FindWithPhotos = Omit<Find, 'photos'> & {
  photos: PhotoData[];
};

/**
 * SurfaceObservation with embedded photo data.
 */
export type SurfaceObservationWithPhotos = Omit<SurfaceObservation, 'photos'> & {
  photos: PhotoData[];
};

/**
 * Photo blob stored as base64 for export.
 */
export interface PhotoData {
  key: string; // original key in IndexedDB (e.g. "photo-{uuid}")
  mimeType: string; // e.g. "image/jpeg", "image/png"
  base64: string; // base64-encoded blob content
  sizeBytes: number; // original size before compression
}

/**
 * Metadata about a backup file.
 * Stored in localStorage to detect loss scenarios.
 */
export interface BackupMetadata {
  exportedAt: string; // ISO timestamp
  fileName: string; // filename that was exported
  schemaVersion: number;
  entityCounts: {
    sessions: number;
    trackPoints: number;
    digPoints: number;
    finds: number;
    surfaceObservations: number;
  };
}
