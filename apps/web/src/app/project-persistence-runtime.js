import { createProjectSaveController } from '../dom/project-save.js';
import { createProjectSaveService } from '../features/project/project-save.js';

export function createProjectPersistenceRuntime({
  service = {},
  controller = {}
} = {}) {
  const saveService = createProjectSaveService(service);
  const saveController = createProjectSaveController({
    ...controller,
    saveService
  });
  return {
    saveService,
    saveController,
    serializeProjectShots: saveService.serializeProjectShots,
    flushShotsToDatabase: saveService.flushShotsToDatabase,
    saveToBrowser: saveController.saveToBrowser
  };
}
