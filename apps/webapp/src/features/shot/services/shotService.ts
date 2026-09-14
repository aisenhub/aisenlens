import projectRepository from "../../project/services/projectRepository";
import type { ShotRecord } from "../types";

export async function loadProjectShots(projectId: string): Promise<ShotRecord[]> {
  return projectRepository.listProjectShots(projectId);
}

export async function saveProjectShots(projectId: string, shots: ShotRecord[]) {
  return projectRepository.replaceProjectShots(projectId, shots);
}
