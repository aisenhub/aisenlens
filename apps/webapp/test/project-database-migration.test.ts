import assert from "node:assert/strict";
import test from "node:test";
import {
  PROJECT_DATABASE_MIGRATION_VERSION,
  PROJECT_DATABASE_SCHEMA_VERSION,
  planProjectDatabaseMigration,
} from "../src/features/project/services/projectDatabaseMigration.ts";
import { RuntimeContractError } from "../src/types/runtime.ts";

test("project database migration is forward-only and explicitly versioned", () => {
  assert.equal(PROJECT_DATABASE_SCHEMA_VERSION, 18);
  assert.equal(PROJECT_DATABASE_MIGRATION_VERSION, 18);
  assert.deepEqual(planProjectDatabaseMigration(0, 18), {
    fromVersion: 0,
    toVersion: 18,
    migrationVersion: 18,
    strategy: "fresh-create",
    rollback: "indexeddb-upgrade-transaction-abort",
    destructiveDowngrade: false,
  });
  assert.equal(planProjectDatabaseMigration(17, 18).strategy, "additive-forward");
});

test("project database migration rejects downgrade and unsupported target versions", () => {
  for (const input of [[19, 18], [17, 19], [-1, 18]] as const) {
    assert.throws(
      () => planProjectDatabaseMigration(input[0], input[1]),
      (error) => error instanceof RuntimeContractError
        && error.code === "MIGRATION_FAILED"
        && error.context.operation === "plan-project-database-migration",
    );
  }
});
