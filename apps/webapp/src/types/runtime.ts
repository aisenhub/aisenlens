export const RUNTIME_CONTRACT_VERSION = 1 as const;

export type RuntimeRevision = string | number;

export type RuntimeSubsystem =
  | "application"
  | "persistence"
  | "worker"
  | "media"
  | "provider"
  | "import"
  | "export"
  | "migration";

export type RuntimeErrorCode =
  | "VALIDATION_ERROR"
  | "REVISION_CONFLICT"
  | "PERSISTENCE_UNAVAILABLE"
  | "STORAGE_QUOTA_EXCEEDED"
  | "DATA_CORRUPTION"
  | "TRANSACTION_ABORTED"
  | "WORKER_FAILED"
  | "TASK_CANCELLED"
  | "MEDIA_DECODE_ERROR"
  | "PROVIDER_UNAVAILABLE"
  | "PROVIDER_RATE_LIMITED"
  | "EXPORT_FAILED"
  | "MIGRATION_FAILED";

export type RuntimeRecoveryAction =
  | "retry"
  | "reload"
  | "rebase"
  | "free-space"
  | "readonly"
  | "restore-backup"
  | "export-diagnostics"
  | "relink-media"
  | "reduce-input";

export interface RuntimeErrorContext {
  subsystem: RuntimeSubsystem;
  operation: string;
  entityId?: string;
  taskId?: string;
  schemaVersion?: number;
  revision?: RuntimeRevision;
}

export interface RuntimeErrorOptions {
  code: RuntimeErrorCode;
  message: string;
  context: RuntimeErrorContext;
  retryable?: boolean;
  recoveryActions?: readonly RuntimeRecoveryAction[];
  cause?: unknown;
}

export class RuntimeContractError extends Error {
  readonly code: RuntimeErrorCode;
  readonly context: RuntimeErrorContext;
  readonly retryable: boolean;
  readonly recoveryActions: readonly RuntimeRecoveryAction[];
  readonly originalCause: unknown;

  constructor(options: RuntimeErrorOptions) {
    super(options.message);
    this.name = "RuntimeContractError";
    this.code = options.code;
    this.context = options.context;
    this.retryable = options.retryable ?? false;
    this.recoveryActions = options.recoveryActions ?? [];
    this.originalCause = options.cause;
  }
}

export function isRuntimeContractError(error: unknown): error is RuntimeContractError {
  return error instanceof RuntimeContractError;
}

type RuntimeContextDetails = Partial<Omit<RuntimeErrorContext, "subsystem" | "operation">>;

function getCauseName(cause: unknown): string | null {
  if (!cause || typeof cause !== "object" || !("name" in cause)) return null;
  const name = (cause as { name?: unknown }).name;
  return typeof name === "string" ? name : null;
}

export function createRevisionConflictError(
  operation: string,
  expected: RuntimeRevision,
  actual: RuntimeRevision | null,
  entityId?: string,
): RuntimeContractError {
  return new RuntimeContractError({
    code: "REVISION_CONFLICT",
    message: "数据已被更新，请重新加载后再应用当前修改。",
    context: {
      subsystem: "persistence",
      operation,
      ...(entityId ? { entityId } : {}),
      revision: actual ?? undefined,
    },
    retryable: false,
    recoveryActions: ["reload", "rebase"],
    cause: { expected, actual },
  });
}

export function createValidationError(
  operation: string,
  message: string,
  context: RuntimeContextDetails = {},
): RuntimeContractError {
  return new RuntimeContractError({
    code: "VALIDATION_ERROR",
    message,
    context: { subsystem: "application", operation, ...context },
    retryable: false,
  });
}

export function toPersistenceRuntimeError(
  cause: unknown,
  operation: string,
  context: RuntimeContextDetails = {},
  fallbackCode: RuntimeErrorCode = "PERSISTENCE_UNAVAILABLE",
): RuntimeContractError {
  if (isRuntimeContractError(cause)) return cause;

  const name = getCauseName(cause);
  let code = fallbackCode;
  let retryable = true;
  let recoveryActions: readonly RuntimeRecoveryAction[] = ["retry", "reload"];

  if (name === "QuotaExceededError") {
    code = "STORAGE_QUOTA_EXCEEDED";
    retryable = false;
    recoveryActions = ["free-space", "export-diagnostics"];
  } else if (name === "AbortError") {
    code = "TRANSACTION_ABORTED";
    recoveryActions = ["retry"];
  } else if (name === "DataCloneError" || name === "DataError" || name === "ConstraintError") {
    code = "VALIDATION_ERROR";
    retryable = false;
    recoveryActions = [];
  }

  const message =
    cause instanceof Error && cause.message.trim()
      ? cause.message
      : code === "STORAGE_QUOTA_EXCEEDED"
        ? "浏览器本地存储空间不足，项目数据未保存。"
        : code === "TRANSACTION_ABORTED"
          ? "本地项目数据事务已取消，修改未保存。"
          : "本地项目数据暂时不可用。";

  return new RuntimeContractError({
    code,
    message,
    context: { subsystem: "persistence", operation, ...context },
    retryable,
    recoveryActions,
    cause,
  });
}

export interface RuntimeDiagnosticRecord {
  contractVersion: typeof RUNTIME_CONTRACT_VERSION;
  code: RuntimeErrorCode;
  subsystem: RuntimeSubsystem;
  operation: string;
  retryable: boolean;
  durationMs?: number;
  taskId?: string;
  schemaVersion?: number;
  revision?: RuntimeRevision;
}

export function toRuntimeDiagnostic(
  error: RuntimeContractError,
  durationMs?: number,
): RuntimeDiagnosticRecord {
  return {
    contractVersion: RUNTIME_CONTRACT_VERSION,
    code: error.code,
    subsystem: error.context.subsystem,
    operation: error.context.operation,
    retryable: error.retryable,
    ...(durationMs === undefined ? {} : { durationMs }),
    ...(error.context.taskId ? { taskId: error.context.taskId } : {}),
    ...(error.context.schemaVersion === undefined ? {} : { schemaVersion: error.context.schemaVersion }),
    ...(error.context.revision === undefined ? {} : { revision: error.context.revision }),
  };
}

export type RuntimeTaskStatus = "queued" | "running" | "succeeded" | "failed" | "cancelled";
export type RuntimeTaskSuspension = "paused" | "interrupted" | null;

export interface RuntimeTaskLifecycleState {
  status: RuntimeTaskStatus;
  suspension: RuntimeTaskSuspension;
}

export interface RuntimeTaskEnvelope {
  taskId: string;
  kind: string;
  status: RuntimeTaskStatus;
  suspension: RuntimeTaskSuspension;
  dependencyRevision: RuntimeRevision | null;
  cancelRequested: boolean;
  retryEligible: boolean;
}

export function canApplyRuntimeTaskResult(
  task: Pick<RuntimeTaskEnvelope, "status" | "dependencyRevision" | "cancelRequested">,
  currentRevision: RuntimeRevision | null,
): boolean {
  return task.status === "succeeded"
    && !task.cancelRequested
    && task.dependencyRevision === currentRevision;
}

export type ProviderSecretOwnership = "server-owned" | "user-owned";

export interface ProviderBoundaryContract {
  secretOwnership: ProviderSecretOwnership;
  frontendSecretAllowed: false;
  contextSelection: "explicit-minimum";
  canonicalWritePolicy: "candidate-only";
}

export function createProviderBoundaryContract(secretOwnership: ProviderSecretOwnership): ProviderBoundaryContract {
  return {
    secretOwnership,
    frontendSecretAllowed: false,
    contextSelection: "explicit-minimum",
    canonicalWritePolicy: "candidate-only",
  };
}

export interface ExternalInputPolicy {
  maxBytes: number;
  allowedSchemaVersions?: readonly number[];
}

export function validateExternalInput(
  input: { byteLength: number; schemaVersion?: number | null },
  policy: ExternalInputPolicy,
  operation: string,
): void {
  if (!Number.isSafeInteger(input.byteLength) || input.byteLength < 0) {
    throw createValidationError(operation, "外部输入大小无效。");
  }
  if (input.byteLength > policy.maxBytes) {
    throw createValidationError(operation, "外部输入超过允许大小。");
  }
  if (
    input.schemaVersion !== undefined
    && input.schemaVersion !== null
    && policy.allowedSchemaVersions
    && !policy.allowedSchemaVersions.includes(input.schemaVersion)
  ) {
    throw createValidationError(operation, "外部输入版本不受支持。", { schemaVersion: input.schemaVersion });
  }
}
