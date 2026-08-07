import { createProgressOverlay } from '../dom/progress.js';
import { createExportController } from '../dom/export-controller.js';

export function createExportRuntime({
  progress = {},
  exportController = {}
} = {}) {
  let cancelExport = () => {};
  const progressRuntime = createProgressOverlay({
    ...progress,
    documentTarget: progress.documentTarget,
    requestStop: () => {
      progress.requestStop?.();
      cancelExport();
    }
  });
  const controller = createExportController({
    ...exportController,
    showProgress: progressRuntime.showProgress,
    updateProgressMessage: progressRuntime.updateProgressMessage,
    updateProgress: progressRuntime.updateProgress,
    hideProgress: progressRuntime.hideProgress
  });
  cancelExport = controller.cancelExport;
  return {
    ...progressRuntime,
    controller,
    cancelExport
  };
}
