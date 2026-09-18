import assert from "node:assert/strict";
import test from "node:test";
import {
  RuntimeContractError,
  canApplyRuntimeTaskResult,
  createProviderBoundaryContract,
  createRevisionConflictError,
  toPersistenceRuntimeError,
  toRuntimeDiagnostic,
  validateExternalInput,
} from "../src/types/runtime.ts";

test("runtime revision conflict is machine-readable and recoverable without content logging", () => {
  const error = createRevisionConflictError("save-project", "rev:1", "rev:2", "project:1");
  assert.equal(error.code, "REVISION_CONFLICT");
  assert.deepEqual(error.recoveryActions, ["reload", "rebase"]);
  assert.equal(error.context.entityId, "project:1");
  assert.equal(error.context.revision, "rev:2");

  const diagnostic = toRuntimeDiagnostic(error, 12);
  assert.deepEqual(diagnostic, {
    contractVersion: 1,
    code: "REVISION_CONFLICT",
    subsystem: "persistence",
    operation: "save-project",
    retryable: false,
    durationMs: 12,
    revision: "rev:2",
  });
  assert.equal("message" in diagnostic, false);
  assert.equal("entityId" in diagnostic, false);
});

test("indexeddb failures map to stable runtime codes", () => {
  const quota = toPersistenceRuntimeError({ name: "QuotaExceededError" }, "save");
  assert.equal(quota.code, "STORAGE_QUOTA_EXCEEDED");
  assert.equal(quota.retryable, false);
  assert.deepEqual(quota.recoveryActions, ["free-space", "export-diagnostics"]);

  const aborted = toPersistenceRuntimeError({ name: "AbortError" }, "save");
  assert.equal(aborted.code, "TRANSACTION_ABORTED");
  assert.equal(aborted.retryable, true);

  const validation = toPersistenceRuntimeError({ name: "DataCloneError" }, "save");
  assert.equal(validation.code, "VALIDATION_ERROR");
  assert.equal(validation.retryable, false);
});

test("runtime task result is applicable only for the current successful dependency revision", () => {
  const base = {
    status: "succeeded" as const,
    dependencyRevision: 7,
    cancelRequested: false,
  };
  assert.equal(canApplyRuntimeTaskResult(base, 7), true);
  assert.equal(canApplyRuntimeTaskResult(base, 8), false);
  assert.equal(canApplyRuntimeTaskResult({ ...base, cancelRequested: true }, 7), false);
  assert.equal(canApplyRuntimeTaskResult({ ...base, status: "failed" }, 7), false);
});

test("provider boundary never permits frontend-owned secrets or direct canonical writes", () => {
  assert.deepEqual(createProviderBoundaryContract("server-owned"), {
    secretOwnership: "server-owned",
    frontendSecretAllowed: false,
    contextSelection: "explicit-minimum",
    canonicalWritePolicy: "candidate-only",
  });
  assert.equal(createProviderBoundaryContract("user-owned").frontendSecretAllowed, false);
});

test("external input policy rejects oversized and unsupported versions before canonical write", () => {
  assert.doesNotThrow(() => validateExternalInput(
    { byteLength: 1024, schemaVersion: 3 },
    { maxBytes: 2048, allowedSchemaVersions: [3] },
    "import-project",
  ));

  assert.throws(
    () => validateExternalInput(
      { byteLength: 4096, schemaVersion: 3 },
      { maxBytes: 2048, allowedSchemaVersions: [3] },
      "import-project",
    ),
    (error) => error instanceof RuntimeContractError && error.code === "VALIDATION_ERROR",
  );

  assert.throws(
    () => validateExternalInput(
      { byteLength: 1024, schemaVersion: 4 },
      { maxBytes: 2048, allowedSchemaVersions: [3] },
      "import-project",
    ),
    (error) => error instanceof RuntimeContractError && error.code === "VALIDATION_ERROR",
  );
});
