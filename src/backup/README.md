# Backup & Restore System

Implements T1.5 of the project plan: automatic backup and loss detection for iOS data purge scenarios.

## Modules

### `export.ts`
Export the complete IndexedDB database to a JSON backup file.

**Key functions:**
- `exportDatabase()` — serializes all tables and metadata
- `saveBackupToFile()` — writes to disk (File System Access API or download)
- `setupAutoExport()` — hooks into `beforeunload` and `visibilitychange` for automatic exports

**Format:** JSON with versioned schema, photoblobs embedded as base64.

**Design choice - Photo storage:**
Photos are currently stored as photo keys (references), with base64 encoding support prepared for future implementation. Full photo export/restore will be added once photo storage in IndexedDB is finalized.

### `restore.ts`
Detect data loss and restore from backup.

**Key functions:**
- `isDatabaseEmpty()` — check if all critical tables are empty
- `detectDataLoss()` — determine if base was wiped but backup metadata exists
- `importBackup()` — idempotent upsert from JSON (UUIDs prevent duplicates)
- `setupLossDetection()` — hook at app startup

**Loss detection strategy:**
1. Check if database is empty at startup
2. Check if localStorage contains `treasure_detector_last_backup` (survives iOS purge of IndexedDB)
3. If both true, offer restore instead of starting blank

### `types.ts`
Type definitions for backup payloads and metadata.

### `InstallBanner.tsx`
React component: "Install on Home Screen" banner for Safari users.

- Shows once per session (dismissed via sessionStorage)
- Explains iOS 7-day purge behavior
- Disappears if app is already installed (standalone mode detected)

### `StorageMeter.tsx`
React component: storage quota display + export/import buttons.

- Live quota meter (50% orange, 80% red)
- Manual export button
- Manual import button (file picker)
- Status messages (success/error)

## Integration Points

**On app startup:**
```typescript
import { setupLossDetection } from './backup';
import { InstallBanner } from './backup';
import { StorageMeter } from './backup';

await setupLossDetection(db, (metadata) => {
  // Show recovery prompt to user
  showRecoveryDialog(metadata);
});

// Render components in main App
<InstallBanner />
<StorageMeter />
```

**On session end:**
```typescript
import { setupAutoExport } from './backup';

setupAutoExport(db); // called once at app init
// Auto-export fires on beforeunload/visibilitychange
```

**Manual export/import:**
- User clicks buttons in StorageMeter
- StorageMeter handles File API and calls `exportDatabase()` / `importBackup()`

## Schema Versioning

The backup includes `schemaVersion: 1` which corresponds to Dexie v1. When the schema is upgraded:

1. Update `TreasureDB.version(2).stores(...)` in `src/db/schema.ts`
2. Increment `schemaVersion` in `BackupPayload`
3. Add migration upgrade function if data transformation is needed
4. Tests will verify old exports (v1) can be imported into new db (v2)

## Testing

**Unit tests** in `__tests__/`:
- `export-restore.test.ts` — Round-trip export/clear/import; idempotence; empty detection
- `migration.test.ts` — Schema upgrade scenarios (v1→v2 readiness)

Run with:
```bash
npm test -- --run src/backup/__tests__/
```

## Known Limitations & TODOs

1. **Photo storage**: Current implementation preserves photo keys but doesn't serialize blob content. Full photo export/import will be added when photo storage in IndexedDB is implemented. Marked with TODO comments.

2. **iOS testing**: Behavior on iOS cannot be verified in dev environment. Mark scenarios that require iOS device testing as "[DEVICE VALIDATION REQUIRED]".

3. **Network timing**: Auto-export fires on visibility change, but Supabase sync may still be in flight. No conflict, since both are persisted independently (local export + server sync).

## References

- Plan §5.5: "Persistance des données — le trou qui pouvait tout effacer"
- CONTRACTS.md: Backup payload schema
- docs/ONBOARDING.md: Usage instructions for Oscar
