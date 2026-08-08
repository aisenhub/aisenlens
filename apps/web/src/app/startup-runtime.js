import { createExportRuntime } from './export-runtime.js';
import { createProjectPersistenceRuntime } from './project-persistence-runtime.js';
import { createShotClearController } from '../dom/shot-clear-controller.js';
import { createShotClearWorkflow } from './shot-clear-workflow.js';

export function createStartupRuntime({
  exportOptions = {},
  persistenceOptions = {},
  shotClearOptions = {},
  terminateWorker = () => {},
  windowTarget = window
} = {}) {
  const exportRuntime = createExportRuntime(exportOptions);
  const {
    showProgress,
    updateProgressMessage,
    updateDetectionProgress,
    updateProgress,
    hideProgress,
    controller: exportController
  } = exportRuntime;
  exportController.bind();

  const projectPersistenceRuntime = createProjectPersistenceRuntime(persistenceOptions);
  const projectSaveService = projectPersistenceRuntime.saveService;
  const projectSaveController = projectPersistenceRuntime.saveController;
  projectSaveController.bind();

  const { workflow, ...shotClearControllerOptions } = shotClearOptions;
  const shotClearController = createShotClearController({
    ...shotClearControllerOptions,
    ...(workflow ? { clear: createShotClearWorkflow(workflow).clear } : {})
  });
  shotClearController.bind();

  const start = ({ projectSessionController, autosaveController, flushTasks = async () => {}, windowTarget: target = window } = {}) => {
    projectSessionController?.restoreSession?.();
    const flush = async () => {
      try {
        await flushTasks();
        await autosaveController?.flush?.();
      } catch (error) {
        console.error('页面关闭前保存失败', error);
      } finally {
        terminateWorker();
      }
    };
    target.addEventListener?.('pagehide', flush, { once: true });
    target.addEventListener?.('beforeunload', flush, { once: true });
    return { flush };
  };

  const bindWorkerLifecycle = () => {
    windowTarget.addEventListener?.('pagehide', terminateWorker, { once: true });
  };
  return {
    ...exportRuntime,
    exportController,
    projectPersistenceRuntime,
    projectSaveService,
    projectSaveController,
    serializeProjectShots: projectPersistenceRuntime.serializeProjectShots,
    flushShotsToDatabase: projectPersistenceRuntime.flushShotsToDatabase,
    saveToBrowser: projectPersistenceRuntime.saveToBrowser,
    shotClearController,
    start,
    bindWorkerLifecycle
  };
}
