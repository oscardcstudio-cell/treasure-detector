/**
 * Public API for backup/restore operations.
 */

export { exportDatabase, saveBackupToFile, setupAutoExport, getLastBackupMetadata, clearBackupMetadata } from './export';

export { isDatabaseEmpty, detectDataLoss, importBackup, loadBackupFile, setupLossDetection } from './restore';

export { InstallBanner } from './InstallBanner';

export { StorageMeter } from './StorageMeter';

export type { BackupPayload, BackupMetadata, PhotoData } from './types';
