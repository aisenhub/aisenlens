import { RuntimeContractError } from "../../../types/runtime.ts";

export const PROJECT_DATABASE_SCHEMA_VERSION = 19 as const;
export const PROJECT_DATABASE_MIGRATION_VERSION = 19 as const;
export const PROJECT_DATABASE_DEV_RESET_CUTOFF = 18 as const;

export interface ProjectDatabaseMigrationPlan {
  fromVersion: number;
  toVersion: typeof PROJECT_DATABASE_SCHEMA_VERSION;
  migrationVersion: typeof PROJECT_DATABASE_MIGRATION_VERSION;
  strategy: "fresh-create" | "development-reset";
  rollback: "indexeddb-upgrade-transaction-abort";
  destructiveDowngrade: false;
  resetDevelopmentData: boolean;
}

export function planProjectDatabaseMigration(
  oldVersion: number,
  newVersion: number | null,
): ProjectDatabaseMigrationPlan {
  const targetVersion = newVersion ?? PROJECT_DATABASE_SCHEMA_VERSION;
  const validVersion = (value: number) => Number.isSafeInteger(value) && value >= 0;

  if (
    !validVersion(oldVersion)
    || !validVersion(targetVersion)
    || targetVersion !== PROJECT_DATABASE_SCHEMA_VERSION
    || oldVersion > targetVersion
  ) {
    throw new RuntimeContractError({
      code: "MIGRATION_FAILED",
      message: "本地项目仓库版本不受支持，已停止迁移。",
      context: {
        subsystem: "migration",
        operation: "plan-project-database-migration",
        schemaVersion: targetVersion,
        revision: oldVersion,
      },
      retryable: false,
      recoveryActions: ["export-diagnostics"],
      cause: { oldVersion, newVersion },
    });
  }

  const resetDevelopmentData = oldVersion > 0 && oldVersion <= PROJECT_DATABASE_DEV_RESET_CUTOFF;
  return {
    fromVersion: oldVersion,
    toVersion: PROJECT_DATABASE_SCHEMA_VERSION,
    migrationVersion: PROJECT_DATABASE_MIGRATION_VERSION,
    strategy: oldVersion === 0 ? "fresh-create" : "development-reset",
    rollback: "indexeddb-upgrade-transaction-abort",
    destructiveDowngrade: false,
    resetDevelopmentData,
  };
}

export function resetDevelopmentDatabaseStores(transaction: IDBTransaction, database: IDBDatabase): void {
  for (const storeName of Array.from(database.objectStoreNames)) {
    transaction.objectStore(storeName).clear();
  }
}