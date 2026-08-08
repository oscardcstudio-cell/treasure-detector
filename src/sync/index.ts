/**
 * Sync module — public API
 *
 * Exports:
 * - drainSyncQueue(): manually trigger sync
 * - setupNetworkListener(): listen to network events
 * - getSyncStatus(): get current sync status
 * - getSyncMessage(): human-readable sync message
 * - getSyncColor(): visual indicator color
 */

export { drainSyncQueue, setupNetworkListener } from './push';
export { getSyncStatus, getSyncMessage, getSyncColor, recordSyncSuccess } from './status';
export type { SyncStatus } from './status';
