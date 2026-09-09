import projectRepository from "../../project/services/projectRepository.ts"
import type { ResearchContext, ResearchRange, ResearchTarget } from "../types.ts"
import { researchTargetKey } from "../types.ts"

export function createResearchRange(input: Omit<ResearchRange, "id" | "createdAt" | "updatedAt" | "revision">): ResearchRange {
  const now = new Date().toISOString()
  return { ...input, id: crypto.randomUUID(), createdAt: now, updatedAt: now, revision: 1 }
}

export function createResearchContext(input: Omit<ResearchContext, "id" | "createdAt" | "updatedAt" | "revision">): ResearchContext {
  const now = new Date().toISOString()
  return { ...input, id: crypto.randomUUID(), createdAt: now, updatedAt: now, revision: 1 }
}

export async function readResearchTarget(projectId: string, target: ResearchTarget) {
  const [ranges, contexts] = await Promise.all([projectRepository.listProjectResearchRanges(projectId), projectRepository.listProjectResearchContexts(projectId)])
  return {
    range: target.kind === "range" ? ranges.find((item) => item.id === target.id) ?? null : null,
    context: contexts.find((item) => researchTargetKey(projectId, item.target) === researchTargetKey(projectId, target)) ?? null,
  }
}

export async function saveResearchRange(range: ResearchRange) {
  await projectRepository.saveProjectResearchRange(range)
  return range
}

export async function saveResearchContext(context: ResearchContext) {
  await projectRepository.saveProjectResearchContext(context)
  return context
}

export async function removeResearchRange(projectId: string, rangeId: string) {
  await projectRepository.deleteProjectResearchRange(projectId, rangeId)
}
