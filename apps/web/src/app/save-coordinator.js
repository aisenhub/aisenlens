export function createSaveCoordinator({
  save = async () => {},
  debounceMs = 300,
  onState = () => {},
  now = () => Date.now(),
  getProjectId = () => null,
  onDiagnostic = () => {}
} = {}) {
  let timer = null;
  let revision = 0;
  let saving = null;
  let state = 'idle';
  let pending = false;
  let isSaving = false;
  let paused = false;
  let lastSuccessAt = null;
  let lastErrorCode = '';
  let queuedCount = 0;
  let failureCount = 0;
  let lastDurationMs = 0;
  const emit = (next, error = null) => {
    state = next;
    onState({ state, revision, pending, isSaving, paused, lastSuccessAt, currentProjectId: getProjectId(), lastErrorCode, queuedCount, failureCount, lastDurationMs, error });
  };

  const flush = async () => {
    if (timer) { clearTimeout(timer); timer = null; }
    const requestedRevision = revision;
    const requestedProjectId = getProjectId();
    const task = async () => {
      isSaving = true;
      pending = false;
      const startedAt = now();
      emit('saving');
      try {
        await save({ revision: requestedRevision, projectId: requestedProjectId });
        lastDurationMs = Math.max(0, now() - startedAt);
        lastErrorCode = '';
        lastSuccessAt = now();
        isSaving = false;
        emit('saved');
        if (requestedRevision !== revision) schedule();
      } catch (error) {
        lastDurationMs = Math.max(0, now() - startedAt);
        failureCount += 1;
        lastErrorCode = String(error?.code || error?.name || 'SAVE_FAILED');
        pending = true;
        onDiagnostic({ code: lastErrorCode, durationMs: lastDurationMs, projectId: getProjectId(), error });
        isSaving = false;
        emit('failed', error);
        if (requestedRevision !== revision) schedule();
        throw error;
      }
    };
    saving = (saving || Promise.resolve()).then(task, task);
    return saving;
  };
  const armTimer = () => {
    if (paused) { emit('paused'); return; }
    emit('scheduled');
    clearTimeout(timer);
    timer = setTimeout(() => { timer = null; flush().catch(() => {}); }, debounceMs);
  };
  const schedule = () => {
    revision += 1;
    pending = true;
    queuedCount += 1;
    armTimer();
  };
  const markDirty = () => { emit('dirty'); schedule(); };
  const pause = () => {
    paused = true;
    clearTimeout(timer);
    timer = null;
    emit('paused');
  };
  const resume = () => {
    paused = false;
    if (pending) armTimer();
    else emit('idle');
  };
  const cancel = () => { clearTimeout(timer); timer = null; pending = false; emit('idle'); };
  const reset = () => {
    clearTimeout(timer);
    timer = null;
    pending = false;
    revision += 1;
    emit('idle');
  };
  return {
    markDirty,
    schedule,
    flush,
    cancel,
    reset,
    pause,
    resume,
    getState: () => ({ state, revision, pending, isSaving, paused, lastSuccessAt, currentProjectId: getProjectId(), lastErrorCode, queuedCount, failureCount, lastDurationMs, now: now() })
  };
}
