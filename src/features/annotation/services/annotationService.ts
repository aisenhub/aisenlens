import projectRepository from "../../project/services/projectRepository";
import type { AnnotationMarker } from "../types";

export function loadProjectAnnotationMarkers(projectId: string): Promise<AnnotationMarker[]> {
  return projectRepository.listProjectAnnotationMarkers(projectId);
}

export function saveProjectAnnotationMarker(marker: AnnotationMarker): Promise<void> {
  return projectRepository.saveProjectAnnotationMarker(marker);
}

export function deleteProjectAnnotationMarker(markerId: string): Promise<void> {
  return projectRepository.deleteProjectAnnotationMarker(markerId);
}
