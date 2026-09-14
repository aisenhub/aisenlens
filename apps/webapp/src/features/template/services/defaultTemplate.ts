import { createSystemProfileSnapshot } from "./fieldRegistry"
import type { ProjectAnalysisProfileSnapshot } from "../types"

export function createDefaultProjectTemplate(projectId: string): ProjectAnalysisProfileSnapshot {
  return createSystemProfileSnapshot(projectId, "system.film-basic")
}
