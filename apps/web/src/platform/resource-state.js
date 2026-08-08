export const RESOURCE_STATUS = Object.freeze({
  PENDING: 'pending',
  READY: 'ready',
  FAILED: 'failed',
  DELETED: 'deleted'
});

const transitions = Object.freeze({
  [RESOURCE_STATUS.PENDING]: new Set([RESOURCE_STATUS.READY, RESOURCE_STATUS.FAILED, RESOURCE_STATUS.DELETED]),
  [RESOURCE_STATUS.READY]: new Set([RESOURCE_STATUS.FAILED, RESOURCE_STATUS.DELETED]),
  [RESOURCE_STATUS.FAILED]: new Set([RESOURCE_STATUS.PENDING, RESOURCE_STATUS.DELETED]),
  [RESOURCE_STATUS.DELETED]: new Set()
});

export function isResourceStatus(value) {
  return Object.values(RESOURCE_STATUS).includes(value);
}

export function assertResourceTransition(previousStatus, nextStatus) {
  if (!isResourceStatus(nextStatus) || !transitions[previousStatus]?.has(nextStatus)) {
    const error = new Error(`Invalid resource status transition: ${previousStatus} -> ${nextStatus}`);
    error.code = 'RESOURCE_STATUS_TRANSITION_INVALID';
    throw error;
  }
  return nextStatus;
}

export function withResourceStatus(asset, nextStatus, changes = {}) {
  if (asset?.status) assertResourceTransition(asset.status, nextStatus);
  else if (!isResourceStatus(nextStatus)) {
    const error = new Error(`Invalid initial resource status: ${nextStatus}`);
    error.code = 'RESOURCE_STATUS_INVALID';
    throw error;
  }
  return { ...asset, ...changes, status: nextStatus };
}

export function createResourceFailure(error, operation) {
  return {
    code: String(error?.code || error?.name || 'RESOURCE_WRITE_FAILED'),
    message: String(error?.message || 'Resource write failed'),
    operation,
    at: new Date().toISOString()
  };
}
