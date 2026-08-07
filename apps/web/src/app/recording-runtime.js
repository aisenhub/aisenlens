import {
  drawImageContain,
  drawRoundedPath,
  drawWrappedText
} from '../dom/recording-canvas.js';
import { drawRecordingFrame } from '../dom/recording-frame.js';
import { bindRecordingEvents } from '../dom/recording-bindings.js';
import { createRecordingCaptureController } from '../dom/recording-capture.js';
import { createRecordingTableRenderer } from '../dom/recording-table.js';
import { createRecordingState } from '../features/recording/recording-state.js';

export function createRecordingRuntime({
  elements = {},
  video,
  getEntries,
  getColumns,
  getCellValue,
  getThumbnail,
  getSettings,
  openConfig,
  updateDurations,
  download,
  showToast,
  enableVideoButtons,
  isVideoDecodeFailed = () => false,
  documentTarget = document
} = {}) {
  const state = createRecordingState();
  const table = createRecordingTableRenderer({
    state,
    getEntries,
    getColumns,
    getCellValue,
    getThumbnail,
    video,
    drawImageContain,
    drawRoundedPath,
    drawWrappedText
  });
  const controller = createRecordingCaptureController({
    video,
    recordButton: elements.recordButton,
    modal: elements.modal,
    modalTitle: elements.modalTitle,
    statusLine: elements.statusLine,
    statusText: elements.statusText,
    timeText: elements.timeText,
    progressInner: elements.progressInner,
    pauseButton: elements.pauseButton,
    state,
    getSettings,
    openConfig,
    updateDurations,
    prepareTableCache: table.prepare,
    preloadTableImages: table.preload,
    drawRecordingFrame: (context, recordingState) => drawRecordingFrame(context, {
      width: recordingState.width,
      height: recordingState.height,
      video,
      drawTable: (tableContext, x, y, width, height) => table.draw(tableContext, x, y, width, height)
    }),
    download,
    showToast,
    enableVideoButtons,
    isVideoDecodeFailed
  });

  bindRecordingEvents({
    elements: {
      recordButton: elements.recordButton,
      pauseButton: elements.pauseButton,
      cancelButton: elements.cancelButton,
      closeButton: elements.closeButton,
      modal: elements.modal
    },
    video,
    documentTarget,
    onStart: controller.start,
    onPause: controller.togglePause,
    onCancel: () => controller.stop({ cancel: true }),
    onEnded: controller.stop,
    isActive: controller.isActive
  });

  return {
    state,
    table,
    controller,
    isActive: controller.isActive,
    stop: controller.stop,
    togglePause: controller.togglePause
  };
}
