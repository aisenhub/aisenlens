import { createStateMachine } from '../../app/state-machine.js';

function createRecordingMachine() {
  return createStateMachine({
    initial: 'idle',
    transitions: {
      idle: { prepare: 'preparing' },
      preparing: { start: 'recording', cancel: 'stopping', fail: 'stopping' },
      recording: { pause: 'paused', stop: 'stopping', cancel: 'stopping' },
      paused: { resume: 'recording', stop: 'stopping', cancel: 'stopping' },
      stopping: { reset: 'idle' }
    }
  });
}

function syncRecordingFlags(state, status) {
  state.status = status;
  state.active = ['preparing', 'recording', 'paused'].includes(status);
  state.started = ['recording', 'paused'].includes(status);
  state.paused = status === 'paused';
  if (status === 'idle') state.cancelled = false;
  return state;
}

export function transitionRecordingState(state, event, payload) {
  if (!state.machine?.transition(event, payload)) return false;
  syncRecordingFlags(state, state.machine.state);
  return true;
}

export function createRecordingState() {
  return {
    status: 'idle',
    machine: createRecordingMachine(),
    active: false,
    started: false,
    paused: false,
    cancelled: false,
    recorder: null,
    stream: null,
    canvas: null,
    context: null,
    videoTrack: null,
    manualFrameCapture: false,
    mediaTime: 0,
    lastFrameTime: 0,
    frameId: 0,
    progressTimer: 0,
    imageCache: new Map(),
    tableEntries: [],
    tableColumns: [],
    tableCacheCanvas: null,
    tableCacheKey: '',
    usesVideoFrameCallback: false,
    width: 720,
    height: 960,
    frameRate: 30,
    audioContext: null,
    audioSourceNode: null,
    audioGainNode: null,
    audioDestination: null
  };
}

export function prepareRecordingState(state, { width, height, frameRate } = {}) {
  state.width = Number(width) || state.width;
  state.height = Number(height) || state.height;
  state.frameRate = Number(frameRate) || state.frameRate;
  state.machine?.reset('idle');
  transitionRecordingState(state, 'prepare');
  state.cancelled = false;
  state.imageCache.clear();
  return state;
}

export function resetRecordingState(state) {
  state.machine?.reset('idle');
  syncRecordingFlags(state, 'idle');
  state.cancelled = false;
  state.recorder = null;
  state.stream = null;
  state.canvas = null;
  state.context = null;
  state.videoTrack = null;
  state.manualFrameCapture = false;
  state.mediaTime = 0;
  state.lastFrameTime = 0;
  state.frameId = 0;
  state.progressTimer = 0;
  state.usesVideoFrameCallback = false;
  state.imageCache.clear();
  state.tableEntries = [];
  state.tableColumns = [];
  state.tableCacheCanvas = null;
  state.tableCacheKey = '';
  state.audioContext = null;
  state.audioSourceNode = null;
  state.audioGainNode = null;
  state.audioDestination = null;
  return state;
}

export function setRecordingPaused(state, paused) {
  if (paused && state.status === 'preparing') transitionRecordingState(state, 'start');
  transitionRecordingState(state, paused ? 'pause' : 'resume');
  return state;
}
