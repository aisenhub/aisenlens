import type { AnalysisFieldEntry, AnalysisFieldValue, ProjectAnalysisProfileSnapshot } from "../../template/types.ts"
import { createSetEntry, validateAnalysisFieldEntry } from "../../template/services/templateValidation.ts"
import { getDefinition } from "../../template/services/resolveAnalysisProfile.ts"

export type AnalysisFieldCommand =
  | { kind: "set"; fieldId: string; value: AnalysisFieldValue }
  | { kind: "clear"; fieldId: string }
  | { kind: "unknown"; fieldId: string }
  | { kind: "not_applicable"; fieldId: string }

export interface AnalysisFieldCommandResult {
  values: Record<string, AnalysisFieldEntry>
  changed: boolean
  error: string | null
}

function entriesEqual(left: AnalysisFieldEntry | undefined, right: AnalysisFieldEntry | undefined): boolean {
  if (left?.state !== right?.state) return false
  if (!left || !right || left.state !== "set" || right.state !== "set") return true
  if (Array.isArray(left.value) || Array.isArray(right.value)) {
    const leftValues = left.value
    const rightValues = right.value
    if (!Array.isArray(leftValues) || !Array.isArray(rightValues)) return false
    return leftValues.length === rightValues.length && leftValues.every((value) => rightValues.includes(value))
  }
  return left.value === right.value
}

function commandEntry(profile: ProjectAnalysisProfileSnapshot, command: AnalysisFieldCommand): AnalysisFieldEntry | null {
  const definition = getDefinition(profile, command.fieldId)
  if (!definition) throw new Error("当前字段已移出项目定义目录，无法写入。")
  if (command.kind === "clear") return null
  if (command.kind === "unknown") return { state: "unknown" }
  if (command.kind === "not_applicable") {
    const entry: AnalysisFieldEntry = { state: "not_applicable" }
    const issues = validateAnalysisFieldEntry(definition, entry)
    if (issues.length) throw new Error(issues[0])
    return entry
  }
  return createSetEntry(definition, command.value)
}

export function applyAnalysisFieldCommand(profile: ProjectAnalysisProfileSnapshot, values: Record<string, AnalysisFieldEntry>, command: AnalysisFieldCommand): AnalysisFieldCommandResult {
  try {
    const nextEntry = commandEntry(profile, command)
    const currentEntry = values[command.fieldId]
    if (entriesEqual(currentEntry, nextEntry ?? undefined)) return { values, changed: false, error: null }
    const nextValues = { ...values }
    if (nextEntry === null) delete nextValues[command.fieldId]
    else nextValues[command.fieldId] = nextEntry
    return { values: nextValues, changed: true, error: null }
  } catch (error) {
    return { values, changed: false, error: error instanceof Error ? error.message : "字段值无效。" }
  }
}

export function copyPreviousAnalysisField(profile: ProjectAnalysisProfileSnapshot, previous: Record<string, AnalysisFieldEntry> | undefined, current: Record<string, AnalysisFieldEntry>, fieldId: string): AnalysisFieldCommandResult {
  const source = previous?.[fieldId]
  if (!source || source.state !== "set") return { values: current, changed: false, error: "上一镜没有可复制的已填写值。" }
  const definition = getDefinition(profile, fieldId)
  if (!definition) return { values: current, changed: false, error: "当前字段定义不可用。" }
  const issues = validateAnalysisFieldEntry(definition, source)
  if (issues.length) return { values: current, changed: false, error: issues[0] }
  return applyAnalysisFieldCommand(profile, current, { kind: "set", fieldId, value: source.value })
}

export interface AnalysisBatchPreview {
  targetCount: number
  overwriteCount: number
  outsideScopeCount: number
}

export function previewAnalysisBatch(fieldId: string, selectedShotIds: string[], allShotIds: string[], valuesByShotId: Record<string, Record<string, AnalysisFieldEntry>>): AnalysisBatchPreview {
  const all = new Set(allShotIds)
  const targets = selectedShotIds.filter((id) => all.has(id))
  return { targetCount: targets.length, overwriteCount: targets.filter((id) => Boolean(valuesByShotId[id]?.[fieldId])).length, outsideScopeCount: selectedShotIds.filter((id) => !all.has(id)).length }
}

export function applyAnalysisBatch(profile: ProjectAnalysisProfileSnapshot, valuesByShotId: Record<string, Record<string, AnalysisFieldEntry>>, shotIds: string[], command: AnalysisFieldCommand): AnalysisFieldCommandResult & { valuesByShotId: Record<string, Record<string, AnalysisFieldEntry>> } {
  const nextByShotId = { ...valuesByShotId }
  let changed = false
  for (const shotId of shotIds) {
    if (!valuesByShotId[shotId]) return { values: {}, valuesByShotId, changed: false, error: `镜头 ${shotId} 不存在或已被移除。` }
    const result = applyAnalysisFieldCommand(profile, valuesByShotId[shotId], command)
    if (result.error) return { values: {}, valuesByShotId, changed: false, error: result.error }
    if (result.changed) { nextByShotId[shotId] = result.values; changed = true }
  }
  return { values: {}, valuesByShotId: changed ? nextByShotId : valuesByShotId, changed, error: null }
}

export function analysisEntriesEqual(left: AnalysisFieldEntry | undefined, right: AnalysisFieldEntry | undefined): boolean {
  return entriesEqual(left, right)
}
