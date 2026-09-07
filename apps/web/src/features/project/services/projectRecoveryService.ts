import projectRepository from "./projectRepository";
import type { ProjectRecoverySnapshot } from "../types";

const SNAPSHOT_INTERVAL_MS = 30_000;

export async function createProjectRecoverySnapshot(projectId: string) {
  const state = await projectRepository.readProjectEditorState(projectId);
  if (!state) return null;
  const snapshot: ProjectRecoverySnapshot = { id: crypto.randomUUID(), projectId, createdAt: new Date().toISOString(), ...state };
  await projectRepository.saveProjectRecoverySnapshot(snapshot);
  return snapshot;
}

export async function restoreProjectRecoverySnapshot(snapshotId: string, projectId: string) {
  const snapshots = await projectRepository.listProjectRecoverySnapshots(projectId);
  const snapshot = snapshots.find((item) => item.id === snapshotId);
  if (!snapshot) throw new Error("恢复快照不存在或已被清理。");
  await projectRepository.restoreProjectRecoverySnapshot({ ...snapshot, projectId });
}

export async function getStorageUsage() {
  if (!navigator.storage?.estimate) return null;
  const estimate = await navigator.storage.estimate();
  return { usage: estimate.usage ?? 0, quota: estimate.quota ?? 0 };
}

export { SNAPSHOT_INTERVAL_MS };
