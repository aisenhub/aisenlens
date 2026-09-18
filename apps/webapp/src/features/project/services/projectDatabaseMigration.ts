import { RuntimeContractError } from "../../../types/runtime.ts";

export const PROJECT_DATABASE_SCHEMA_VERSION = 18 as const;
export const PROJECT_DATABASE_MIGRATION_VERSION = 18 as const;

export interface ProjectDatabaseMigrationPlan {
  fromVersion: number;
  toVersion: typeof PROJECT_DATABASE_SCHEMA_VERSION;
  migrationVersion: typeof PROJECT_DATABASE_MIGRATION_VERSION;
  strategy: "fresh-create" | "additive-forward";
  rollback: "indexeddb-upgrade-transaction-abort";
  destructiveDowngrade: false;
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
      message: "本地项目仓库版本不受支持，已停止迁移以保护现有数据。",
      context: {
        subsystem: "migration",
        operation: "plan-project-database-migration",
        schemaVersion: targetVersion,
        revision: oldVersion,
      },
      retryable: false,
      recoveryActions: ["readonly", "restore-backup", "export-diagnostics"],
      cause: { oldVersion, newVersion },
    });
  }

  return {
    fromVersion: oldVersion,
    toVersion: PROJECT_DATABASE_SCHEMA_VERSION,
    migrationVersion: PROJECT_DATABASE_MIGRATION_VERSION,
    strategy: oldVersion === 0 ? "fresh-create" : "additive-forward",
    rollback: "indexeddb-upgrade-transaction-abort",
    destructiveDowngrade: false,
  };
}
