export function createAudioWaveformState() {
  return {
    jobId: 0,
    status: 'empty',
    duration: 0,
    bins: [],
    maxPeak: 0,
    zoom: null,
    renderFrame: 0
  };
}

export function resetAudioWaveformData(state, status = 'empty') {
  state.status = status;
  state.duration = 0;
  state.bins = [];
  state.maxPeak = 0;
  return state;
}

export function createAutoSaveState() {
  return {
    timer: null,
    revision: 0,
    runPromise: Promise.resolve(),
    snapshotProjectId: null,
    shotSnapshot: new Map(),
    status: 'idle',
    pending: false,
    lastError: null,
    lastSuccessAt: 0
  };
}

export function createApplicationState() {
  return {
    currentProjectId: null,
    currentProjectTitle: null,
    currentProjectVideoFileName: '',
    currentProjectUuid: null,
    currentProjectTimelineViewState: null,
    dirty: false,
    lastEditAt: 0,
    lastSaveAt: 0
  };
}

export function bindApplicationState(target, state) {
  const bindings = {
    currentProjectId: 'currentProjectId',
    currentProjectTitle: 'currentProjectTitle',
    currentProjectVideoFileName: 'currentProjectVideoFileName',
    currentProjectUuid: 'currentProjectUuid',
    currentProjectTimelineViewState: 'currentProjectTimelineViewState',
    __dirty: 'dirty',
    __lastEditAt: 'lastEditAt',
    __lastSaveAt: 'lastSaveAt'
  };
  Object.entries(bindings).forEach(([property, stateKey]) => {
    Object.defineProperty(target, property, {
      configurable: true,
      enumerable: true,
      get: () => state[stateKey],
      set: value => { state[stateKey] = value; }
    });
  });
  return state;
}
