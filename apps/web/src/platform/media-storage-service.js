import { mediaResourceStore } from './media-resource-store.js';
import { screenshotResourceStore } from './screenshot-resource-store.js';

export function createMediaStorageService({
  mediaStore = mediaResourceStore,
  screenshotStore = screenshotResourceStore
} = {}) {
  return {
    saveVideo: (projectId, file) => mediaStore.saveVideo(projectId, file),
    loadVideo: projectId => mediaStore.loadVideo(projectId),
    removeProjectMedia: projectId => mediaStore.removeProject(projectId),
    saveScreenshots: (projectId, assets) => screenshotStore.save(projectId, assets),
    loadScreenshots: projectId => screenshotStore.load(projectId),
    removeScreenshots: (projectId, shotIds) => screenshotStore.remove(projectId, shotIds),
    pruneScreenshots: (projectId, validShotIds) => screenshotStore.prune(projectId, validShotIds),
    removeProjectScreenshots: projectId => screenshotStore.removeProject(projectId),
    clearScreenshots: () => screenshotStore.clearAll(),
    estimate: () => screenshotStore.estimate()
  };
}

export const mediaStorageService = createMediaStorageService();
