import { mediaStorageService } from '../../platform/media-storage-service.js';

export function saveProjectVideo(projectId, file) {
  return mediaStorageService.saveVideo(projectId, file);
}

export function loadProjectVideo(projectId) {
  return mediaStorageService.loadVideo(projectId);
}

export function removeProjectMedia(projectId) {
  return mediaStorageService.removeProjectMedia(projectId);
}
