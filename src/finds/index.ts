/**
 * Public API for T1.4 (finds and digs).
 * Exported components and utilities for integration into the main app.
 */

// Components
export { QuickActions } from './QuickActions';
export type { QuickActionsProps } from './QuickActions';

export { SignalForm } from './SignalForm';
export type { SignalFormProps } from './SignalForm';

export { FindForm } from './FindForm';
export type { FindFormProps } from './FindForm';

export { SurfaceObsForm } from './SurfaceObsForm';
export type { SurfaceObsFormProps } from './SurfaceObsForm';

export { FindsList } from './list';
export type { FindsListProps } from './list';

// Camera utilities
export {
  captureAndCompressPhoto,
  estimatePhotoSize,
  getPhotoBlob,
} from '../platform/camera';
export type { PhotoKey } from '../platform/camera';

// Exchange (export/import)
export {
  exportSessionAsGeoJSON,
  exportFindsAsGeoJSON,
  exportTracksAsGPX,
  importFindsFromGeoJSON,
  importTracksFromGPX,
  downloadFile,
  readFileAsText,
} from './exchange';

/**
 * Expected integration points for T1.4:
 *
 * 1. QuickActions component props:
 *    - currentPosition: { coord: [lon, lat], accuracyM: number } from GPS module
 *    - sessionId: string from active session
 *    - onDigCreated: callback to insert DigPoint into Dexie
 *    - lastSignalDefaults: inherited DetectorSignal from previous dig
 *    - presetId: from scoring engine if in a scored zone
 *
 * 2. Signal/Find/SurfaceObs forms:
 *    - triggered by user from detail view
 *    - onSignalChange, onFindSave, onSave callbacks insert into Dexie
 *
 * 3. Camera capture:
 *    - input[capture=environment] → captureAndCompressPhoto()
 *    - blob stored with blob key in Dexie (e.g., in a photos table)
 *    - key referenced in Find.photos and SurfaceObservation.photos
 *
 * 4. Exchange:
 *    - End of session: exportSessionAsGeoJSON() + exportTracksAsGPX()
 *    - + exportFindsAsGeoJSON() for finds
 *    - Files offered via downloadFile()
 *    - Import: file input → readFileAsText() → importFindsFromGeoJSON/importTracksFromGPX()
 *    - Reimport creates DigPoints and Finds in Dexie, must not duplicate
 *
 * 5. FindsList:
 *    - Query all DigPoints and Finds from Dexie
 *    - Pass digs and finds Map
 *    - Handle soft delete via onDelete callback
 */
