import projectRepository from "./projectRepository";
import type { ProjectRecoverySnapshot } from "../types";

const SNAPSHOT_INTERVAL_MS = 30_000;

export async function createProjectRecoverySnapshot(projectId: string) {
  const [project, shots, groups, markers, template] = await Promise.all([projectRepository.getProject(projectId), projectRepository.listProjectShots(projectId), projectRepository.listProjectShotGroups(projectId), projectRepository.listProjectAnnotationMarkers(projectId), projectRepository.getProjectTemplate(projectId)]);
  if (!project) return null;
  const snapshot: ProjectRecoverySnapshot = { id: crypto.randomUUID(), projectId, createdAt: new Date().toISOString(), project, shots, groups, markers, template };
  await projectRepository.saveProjectRecoverySnapshot(snapshot);
  return snapshot;
}

export async function restoreProjectRecoverySnapshot(snapshotId: string, projectId: string) {
  const snapshots = await projectRepository.listProjectRecoverySnapshots(projectId);
  const snapshot = snapshots.find((item) => item.id === snapshotId);
  if (!snapshot) throw new Error("恢复快照不存在或已被清理。");
  await projectRepository.updateProject({ ...snapshot.project, id: projectId });
  await projectRepository.replaceProjectShots(projectId, snapshot.shots.map((shot) => ({ ...shot, projectId })));
  await projectRepository.replaceProjectShotGroups(projectId, snapshot.groups.map((group) => ({ ...group, projectId })));
  await projectRepository.replaceProjectAnnotationMarkers(projectId, snapshot.markers.map((marker) => ({ ...marker, projectId })));
  if (snapshot.template) await projectRepository.saveProjectTemplate({ ...snapshot.template, projectId });
  else await projectRepository.deleteProjectTemplate(projectId);
}

export async function getStorageUsage() {
  if (!navigator.storage?.estimate) return null;
  const estimate = await navigator.storage.estimate();
  return { usage: estimate.usage ?? 0, quota: estimate.quota ?? 0 };
}

export { SNAPSHOT_INTERVAL_MS };
