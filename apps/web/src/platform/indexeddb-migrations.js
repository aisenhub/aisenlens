import { RESOURCE_STATUS, isResourceStatus } from './resource-state.js';

export const DATABASE_MIGRATION_LOG_PREFIX = 'databaseMigration:';

function migrationLog(version, details) {
  return {
    version,
    status: details.failedAssets ? 'completed_with_failures' : 'completed',
    appliedAt: new Date().toISOString(),
    ...details
  };
}

function migrateResourceStore(store, report, complete) {
  const request = store.openCursor();
  request.onsuccess = event => {
    const cursor = event.target.result;
    if (!cursor) {
      complete();
      return;
    }
    const asset = cursor.value;
    if (!isResourceStatus(asset.status)) {
      const canConfirmReady = asset.storage === 'opfs' && Boolean(asset.resourceName);
      const next = {
        ...asset,
        status: canConfirmReady ? RESOURCE_STATUS.READY : RESOURCE_STATUS.FAILED,
        updatedAt: asset.updatedAt || new Date().toISOString()
      };
      if (!canConfirmReady) {
        next.failure = {
          code: 'RESOURCE_MIGRATION_INCOMPLETE',
          message: 'Legacy resource has no verifiable OPFS reference',
          operation: 'database-migration'
        };
        report.failedAssets += 1;
      }
      cursor.update(next);
      report.updatedAssets += 1;
    }
    cursor.continue();
  };
  request.onerror = () => {
    report.failedAssets += 1;
    complete();
  };
}

export function runDatabaseMigrations({ transaction, oldVersion }) {
  if (oldVersion === 0 || oldVersion >= 6) return;
  const report = { updatedAssets: 0, failedAssets: 0 };
  const screenshotStore = transaction.objectStore('screenshotAssets');
  const mediaStore = transaction.objectStore('mediaAssets');
  const settingsStore = transaction.objectStore('settings');
  let remaining = 2;
  const complete = () => {
    remaining -= 1;
    if (remaining !== 0) return;
    settingsStore.put({
      key: `${DATABASE_MIGRATION_LOG_PREFIX}6`,
      value: migrationLog(6, report)
    });
  };
  migrateResourceStore(screenshotStore, report, complete);
  migrateResourceStore(mediaStore, report, complete);
}
