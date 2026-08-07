export function createProjectUuid() {
  if (globalThis.crypto && typeof globalThis.crypto.randomUUID === 'function') {
    return globalThis.crypto.randomUUID();
  }
  return `project-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export function createEntityId(prefix) {
  const safePrefix = String(prefix || 'entity');
  if (globalThis.crypto && typeof globalThis.crypto.randomUUID === 'function') {
    return `${safePrefix}-${globalThis.crypto.randomUUID()}`;
  }
  return `${safePrefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}
