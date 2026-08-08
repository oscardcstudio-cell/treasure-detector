/**
 * Platform storage utilities: persistence and quota management.
 * Handles navigator.storage.persist() and navigator.storage.estimate().
 */

/**
 * Result of attempting to persist storage.
 */
export interface PersistenceResult {
  persisted: boolean; // whether the request was granted
  reason?: string; // if persisted is false, why
}

/**
 * Storage quota information.
 */
export interface StorageQuotaInfo {
  usage: number; // bytes used
  quota: number; // total quota in bytes
  percentage: number; // usage as percentage of quota
  available: number; // bytes remaining
}

/**
 * Request persistent storage from the browser.
 * This helps the browser avoid clearing the storage after N days of inactivity.
 * Success is NOT guaranteed, especially on iOS Safari.
 * Log the result so the user knows what happened.
 */
export async function requestPersistentStorage(): Promise<PersistenceResult> {
  if (!navigator.storage || !navigator.storage.persist) {
    return {
      persisted: false,
      reason: 'navigator.storage.persist is not available on this device',
    };
  }

  try {
    const persisted = await navigator.storage.persist();
    const reason = persisted
      ? undefined
      : 'Browser denied persistent storage request (may be in private mode or no user interaction)';

    console.log('[Storage] Persistence request result:', {
      persisted,
      reason,
      userAgent: navigator.userAgent,
    });

    return {
      persisted,
      reason,
    };
  } catch (e) {
    const errorMsg = e instanceof Error ? e.message : String(e);
    console.error('[Storage] Error requesting persistent storage:', errorMsg);
    return {
      persisted: false,
      reason: `Error: ${errorMsg}`,
    };
  }
}

/**
 * Get current storage quota usage.
 */
export async function getStorageQuota(): Promise<StorageQuotaInfo | null> {
  if (!navigator.storage || !navigator.storage.estimate) {
    console.warn('[Storage] navigator.storage.estimate is not available');
    return null;
  }

  try {
    const estimate = await navigator.storage.estimate();
    const usage = estimate.usage || 0;
    const quota = estimate.quota || 0;
    const percentage = quota > 0 ? (usage / quota) * 100 : 0;
    const available = quota - usage;

    return {
      usage,
      quota,
      percentage,
      available,
    };
  } catch (e) {
    const errorMsg = e instanceof Error ? e.message : String(e);
    console.error('[Storage] Error estimating storage quota:', errorMsg);
    return null;
  }
}

/**
 * Format storage size in human-readable form.
 */
export function formatStorageSize(bytes: number): string {
  if (bytes === 0) return '0 B';

  const units = ['B', 'KB', 'MB', 'GB'];
  const exponent = Math.floor(Math.log(bytes) / Math.log(1024));
  const size = (bytes / Math.pow(1024, exponent)).toFixed(1);

  return `${size} ${units[exponent]}`;
}

/**
 * Check if storage quota is running low.
 * Returns true if usage is above 80% of quota.
 */
export async function isStorageLow(): Promise<boolean> {
  const quota = await getStorageQuota();
  if (!quota) return false;
  return quota.percentage >= 80;
}

/**
 * Setup periodic storage quota monitoring.
 * Logs quota info and warns if low.
 */
export function setupStorageMonitoring(
  intervalMs: number = 60000, // every minute
  onLow?: (quota: StorageQuotaInfo) => void
): () => void {
  const interval = setInterval(async () => {
    const quota = await getStorageQuota();
    if (quota) {
      console.log('[Storage] Current quota:', {
        usage: formatStorageSize(quota.usage),
        quota: formatStorageSize(quota.quota),
        percentage: quota.percentage.toFixed(1) + '%',
      });

      if (quota.percentage >= 80 && onLow) {
        onLow(quota);
      }
    }
  }, intervalMs);

  // Return cleanup function
  return () => clearInterval(interval);
}

/**
 * Hook to initialize storage at app startup.
 * 1. Request persistent storage
 * 2. Check quota
 * 3. Start monitoring
 */
export async function initializeStorage(): Promise<{
  persistence: PersistenceResult;
  quota: StorageQuotaInfo | null;
}> {
  console.log('[Storage] Initializing storage...');

  const persistence = await requestPersistentStorage();
  const quota = await getStorageQuota();

  console.log('[Storage] Initialized:', {
    persistence,
    quota: quota
      ? {
          usage: formatStorageSize(quota.usage),
          quota: formatStorageSize(quota.quota),
          percentage: quota.percentage.toFixed(1) + '%',
        }
      : null,
  });

  // Start background monitoring
  setupStorageMonitoring(60000);

  return {
    persistence,
    quota,
  };
}
