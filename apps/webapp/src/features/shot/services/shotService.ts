import projectRepository from "../../project/services/projectRepository";
import { analysisEntriesByShotId, shotNotesByShotId } from "../../analysis/services/analysisRecordService.ts";
import type { ShotAnalysisView, ShotRecord } from "../types";

export async function loadProjectShots(projectId: string): Promise<ShotAnalysisView[]> {
  const [shots, analysisRecords] = await Promise.all([
    projectRepository.listProjectShots(projectId),
    projectRepository.listProjectAnalysisRecords(projectId),
  ]);
  const entries = analysisEntriesByShotId(analysisRecords);
  const notes = shotNotesByShotId(analysisRecords);
  return shots.map((shot) => ({
    ...shot,
    analysisFields: entries[shot.id] ?? {},
    description: notes[shot.id]?.content ?? "",
    notes: notes[shot.id]?.analysis ?? "",
  }));
}

export async function saveProjectShots(projectId: string, shots: ShotRecord[]) {
  return projectRepository.replaceProjectShots(projectId, shots);
}