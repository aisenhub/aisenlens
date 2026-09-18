import projectRepository from "../../project/services/projectRepository"
import type { ProjectRecord } from "../../project/types"
import type { ShotRecord } from "../types"
import { applyShotCommand, type ShotCommand } from "./shotCommandService"

export interface ExecuteShotCommandInput { projectId: string; expectedProjectUpdatedAt: string; command: ShotCommand }
export interface ExecuteShotCommandResult { project: ProjectRecord; shots: ShotRecord[]; affectedShotIds: string[] }

export async function executeShotCommand(input: ExecuteShotCommandInput): Promise<ExecuteShotCommandResult> {
  const state = await projectRepository.readProjectEditorState(input.projectId)
  if (!state) throw new Error("项目不存在或已删除。")
  if (state.project.updatedAt !== input.expectedProjectUpdatedAt) throw new Error("Shot 结构已被其他操作更新，请重新载入后再试。")
  const applied = applyShotCommand(state.shots, input.command)
  if (!applied.ok) throw new Error("Shot command rejected: " + applied.code)
  if (applied.affectedShotIds.length === 0) return { project: state.project, shots: state.shots, affectedShotIds: [] }
  const nextGroups = state.groups.map((group) => ({ ...group, shotIds: group.shotIds.filter((id) => applied.shots.some((shot) => shot.id === id)) })).filter((group) => group.shotIds.length > 0)
  const project = await projectRepository.saveProjectEditorState({ ...state, shots: applied.shots.map((shot, order) => ({ ...shot, order })), groups: nextGroups }, input.expectedProjectUpdatedAt)
  return { project, shots: applied.shots, affectedShotIds: applied.affectedShotIds }
}
