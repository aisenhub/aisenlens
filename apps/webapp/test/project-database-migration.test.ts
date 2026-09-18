import assert from "node:assert/strict";
import test from "node:test";
import {
  PROJECT_DATABASE_DEV_RESET_CUTOFF,
  PROJECT_DATABASE_MIGRATION_VERSION,
  PROJECT_DATABASE_SCHEMA_VERSION,
  planProjectDatabaseMigration,
} from "../src/features/project/services/projectDatabaseMigration.ts";
import { RuntimeContractError } from "../src/types/runtime.ts";

test("project database v19 freezes the new model and resets development-era v18 data", () => {
  assert.equal(PROJECT_DATABASE_SCHEMA_VERSION, 19);
  assert.equal(PROJECT_DATABASE_MIGRATION_VERSION, 19);
  assert.equal(PROJECT_DATABASE_DEV_RESET_CUTOFF, 18);
  assert.deepEqual(planProjectDatabaseMigration(0, 19), {
    fromVersion: 0,
    toVersion: 19,
    migrationVersion: 19,
    strategy: "fresh-create",
    rollback: "indexeddb-upgrade-transaction-abort",
    destructiveDowngrade: false,
    resetDevelopmentData: false,
  });
  assert.deepEqual(planProjectDatabaseMigration(18, 19), {
    fromVersion: 18,
    toVersion: 19,
    migrationVersion: 19,
    strategy: "development-reset",
    rollback: "indexeddb-upgrade-transaction-abort",
    destructiveDowngrade: false,
    resetDevelopmentData: true,
  });
});

test("project database migration rejects downgrade and unsupported target versions", () => {
  for (const input of [[20, 19], [18, 20], [-1, 19]] as const) {
    assert.throws(
      () => planProjectDatabaseMigration(input[0], input[1]),
      (error) => error instanceof RuntimeContractError
        && error.code === "MIGRATION_FAILED"
        && error.context.operation === "plan-project-database-migration",
    );
  }
});