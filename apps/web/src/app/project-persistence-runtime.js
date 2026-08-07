import { createProjectSaveController } from '../dom/project-save.js';
import { createProjectSaveService } from '../features/project/project-save.js';
import {
  writeProjectBinaryFile,
  writeProjectScreenshotAsset,
  writeProjectDataFiles,
  writeProjectManifest
} from '../features/project/project-writer.js';

export function createProjectPersistenceRuntime({
  service = {},
  controller = {}
} = {}) {
  const saveService = createProjectSaveService({
    ...service,
    writeProjectDataFiles,
    writeProjectManifest,
    writeProjectBinaryFile,
    writeProjectScreenshotAsset
  });
  const saveController = createProjectSaveController({
    ...controller,
    saveService
  });
  return {
    saveService,
    saveController,
    serializeProjectShots: saveService.serializeProjectShots,
    flushShotsToDatabase: saveService.flushShotsToDatabase,
    saveToFolder: saveController.saveToFolder
  };
}
