const RECORDING_MIME_CANDIDATES = {
  mp4: [
    'video/mp4;codecs="avc1.42E01E,mp4a.40.2"',
    'video/mp4;codecs="avc1.4D401E,mp4a.40.2"',
    'video/mp4'
  ],
  webm: [
    'video/webm;codecs=vp8,opus',
    'video/webm;codecs=vp9,opus',
    'video/webm'
  ]
};

export function getSupportedRecordingMimeType(format, mediaRecorder = globalThis.MediaRecorder) {
  const candidates = RECORDING_MIME_CANDIDATES[format] || RECORDING_MIME_CANDIDATES.webm;
  if (!mediaRecorder || typeof mediaRecorder.isTypeSupported !== 'function') return '';
  return candidates.find(type => mediaRecorder.isTypeSupported(type)) || '';
}

export function supportsCanvasRecording(
  mediaRecorder = globalThis.MediaRecorder,
  canvasElement = globalThis.HTMLCanvasElement
) {
  return !!(mediaRecorder && canvasElement && typeof canvasElement.prototype?.captureStream === 'function');
}

export function getMediaCapabilities({ video = null } = {}) {
  return {
    mediaRecorder: typeof globalThis.MediaRecorder !== 'undefined',
    canvasCaptureStream: supportsCanvasRecording(),
    videoFrameCallback: !!(video && typeof video.requestVideoFrameCallback === 'function'),
    offscreenCanvas: typeof globalThis.OffscreenCanvas !== 'undefined',
    imageBitmap: typeof globalThis.createImageBitmap === 'function',
    worker: typeof globalThis.Worker !== 'undefined'
  };
}
