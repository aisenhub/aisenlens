import type {
  AnalysisFieldEntry,
  AnalysisFieldValue,
  FieldDefinitionSnapshot,
  ProjectAnalysisProfileSnapshot,
  ResolvedAnalysisProfile,
  TemplateFieldKind,
} from "../types.ts"
import resolveAnalysisProfile from "./resolveAnalysisProfile.ts"

export const TEMPLATE_LIMITS = {
  maxFields: 40,
  maxOptions: 80,
  maxReferenceTerms: 80,
  maxLabelLength: 80,
  maxDescriptionLength: 2_000,
  maxTextLength: 5_000,
} as const

export interface TemplateValidationIssue {
  fieldId?: string
  path: string
  message: string
}

const fieldKinds = new Set<TemplateFieldKind>(["single-select", "multi-select", "text", "number", "boolean"])

export function cloneAnalysisProfile(profile: ProjectAnalysisProfileSnapshot): ProjectAnalysisProfileSnapshot {
  return structuredClone(profile)
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value)
}

function isAnalysisValue(value: unknown): value is AnalysisFieldValue {
  if (typeof value === "string") return value.length <= TEMPLATE_LIMITS.maxTextLength
  if (typeof value === "number") return Number.isFinite(value)
  if (typeof value === "boolean") return true
  return Array.isArray(value) && value.every((item) => typeof item === "string" && item.length <= TEMPLATE_LIMITS.maxTextLength)
}

function isEntry(value: unknown): value is AnalysisFieldEntry {
  if (!isRecord(value) || typeof value.state !== "string") return false
  if (value.state === "unknown" || value.state === "not_applicable") return true
  return value.state === "set" && isAnalysisValue(value.value)
}

export function validateAnalysisFieldEntry(definition: FieldDefinitionSnapshot, entry: AnalysisFieldEntry, options: { allowRetiredOptions?: boolean } = {}): string[] {
  const issues: string[] = []
  if (entry.state === "unknown") return issues
  if (entry.state === "not_applicable") {
    if (!definition.allowsNotApplicable) issues.push(`字段“${definition.label}”不允许标记为不适用。`)
    return issues
  }
  if (!isAnalysisValue(entry.value)) return ["字段值类型或长度无效。"]
  if (definition.kind === "single-select") {
    if (typeof entry.value !== "string") issues.push(`字段“${definition.label}”需要单个 optionId。`)
    else if (!definition.options.some((option) => option.id === entry.value)) issues.push(`字段“${definition.label}”包含未知 optionId。`)
    else if (!options.allowRetiredOptions && definition.options.some((option) => option.id === entry.value && option.retired)) issues.push(`字段“${definition.label}”的选项已停用，不能新选。`)
  } else if (definition.kind === "multi-select") {
    if (!Array.isArray(entry.value)) issues.push(`字段“${definition.label}”需要 optionId 数组。`)
    else {
      const values = entry.value
      const unique = new Set(values)
      if (unique.size !== values.length) issues.push(`字段“${definition.label}”的多选值不能重复。`)
      values.forEach((value) => {
        const option = definition.options.find((item) => item.id === value)
        if (!option) issues.push(`字段“${definition.label}”包含未知 optionId。`)
        else if (!options.allowRetiredOptions && option.retired) issues.push(`字段“${definition.label}”包含已停用选项，不能新写入。`)
      })
    }
  } else if (definition.kind === "text" && typeof entry.value !== "string") issues.push(`字段“${definition.label}”需要文本。`)
  else if (definition.kind === "number" && (typeof entry.value !== "number" || !Number.isFinite(entry.value))) issues.push(`字段“${definition.label}”需要有限数字。`)
  else if (definition.kind === "boolean" && typeof entry.value !== "boolean") issues.push(`字段“${definition.label}”需要布尔值。`)
  return issues
}

export function validateProjectAnalysisProfile(profile: ProjectAnalysisProfileSnapshot): TemplateValidationIssue[] {
  const issues: TemplateValidationIssue[] = []
  if (profile.schemaVersion !== 2) issues.push({ path: "schemaVersion", message: "只支持当前分析 Profile 格式。" })
  if (!profile.projectId || !profile.id) issues.push({ path: "id", message: "Profile 缺少稳定身份。" })
  if (profile.fieldDefinitions.length > TEMPLATE_LIMITS.maxFields) issues.push({ path: "fieldDefinitions", message: `字段定义最多 ${TEMPLATE_LIMITS.maxFields} 个。` })
  if (profile.fieldUsages.length > TEMPLATE_LIMITS.maxFields) issues.push({ path: "fieldUsages", message: `启用字段最多 ${TEMPLATE_LIMITS.maxFields} 个。` })
  const definitionIds = new Set<string>()
  profile.fieldDefinitions.forEach((definition, index) => {
    const path = `fieldDefinitions.${index}`
    if (!definition.fieldId || definitionIds.has(definition.fieldId)) issues.push({ fieldId: definition.fieldId, path, message: "字段 fieldId 必须唯一且非空。" })
    definitionIds.add(definition.fieldId)
    if (!definition.label || definition.label.length > TEMPLATE_LIMITS.maxLabelLength) issues.push({ fieldId: definition.fieldId, path: `${path}.label`, message: `字段名称必须为 1–${TEMPLATE_LIMITS.maxLabelLength} 个字符。` })
    if (definition.description.length > TEMPLATE_LIMITS.maxDescriptionLength) issues.push({ fieldId: definition.fieldId, path: `${path}.description`, message: `字段说明不能超过 ${TEMPLATE_LIMITS.maxDescriptionLength} 个字符。` })
    if (!fieldKinds.has(definition.kind)) issues.push({ fieldId: definition.fieldId, path: `${path}.kind`, message: "字段类型不受支持。" })
    if (definition.options.length > TEMPLATE_LIMITS.maxOptions) issues.push({ fieldId: definition.fieldId, path: `${path}.options`, message: `选项最多 ${TEMPLATE_LIMITS.maxOptions} 个。` })
    const optionIds = new Set<string>()
    definition.options.forEach((option, optionIndex) => {
      if (!option.id || optionIds.has(option.id)) issues.push({ fieldId: definition.fieldId, path: `${path}.options.${optionIndex}.id`, message: "optionId 必须唯一且非空。" })
      optionIds.add(option.id)
      if (!option.label || option.label.length > TEMPLATE_LIMITS.maxLabelLength) issues.push({ fieldId: definition.fieldId, path: `${path}.options.${optionIndex}.label`, message: "选项名称不能为空或超出长度上限。" })
    })
  })
  const usageIds = new Set<string>()
  profile.fieldUsages.forEach((usage, index) => {
    if (usageIds.has(usage.fieldId)) issues.push({ fieldId: usage.fieldId, path: `fieldUsages.${index}`, message: "同一字段不能重复启用。" })
    usageIds.add(usage.fieldId)
    if (!definitionIds.has(usage.fieldId)) issues.push({ fieldId: usage.fieldId, path: `fieldUsages.${index}.fieldId`, message: "usage 引用了不存在的定义。" })
  })
  if (!definitionIds.has("shot_description")) issues.push({ fieldId: "shot_description", path: "fieldDefinitions", message: "画面描述定义必须保留。" })
  if (!usageIds.has("shot_description")) issues.push({ fieldId: "shot_description", path: "fieldUsages", message: "画面描述必须始终启用。" })
  return issues
}

export interface ExistingAnalysisEntriesResult {
  entries: Record<string, AnalysisFieldEntry>
  issues: TemplateValidationIssue[]
}

/**
 * Read existing entries without normalizing them away. This is intentionally
 * separate from validation of new user input so an unrelated save cannot
 * silently replace unknown, retired, or damaged values.
 */
export function readExistingAnalysisEntries(profile: ProjectAnalysisProfileSnapshot | ResolvedAnalysisProfile, values: unknown): ExistingAnalysisEntriesResult {
  const resolved = "fields" in profile ? profile : resolveAnalysisProfile(profile)
  const definitions = new Map(resolved.profile.fieldDefinitions.map((definition) => [definition.fieldId, definition]))
  const entries: Record<string, AnalysisFieldEntry> = isRecord(values) ? structuredClone(values as Record<string, AnalysisFieldEntry>) : {}
  const issues: TemplateValidationIssue[] = []
  Object.entries(entries).forEach(([fieldId, entry]) => {
    const definition = definitions.get(fieldId)
    if (!definition) {
      issues.push({ fieldId, path: `analysisFields.${fieldId}`, message: "值属于未启用或未知字段，已原样保留。" })
      return
    }
    if (!isEntry(entry)) {
      issues.push({ fieldId, path: `analysisFields.${fieldId}`, message: "字段值损坏，已原样保留并限制编辑。" })
      return
    }
    const valueIssues = validateAnalysisFieldEntry(definition, entry, { allowRetiredOptions: true })
    valueIssues.forEach((message) => issues.push({ fieldId, path: `analysisFields.${fieldId}`, message: `${message} 已原样保留。` }))
  })
  return { entries, issues }
}

export function createSetEntry(definition: FieldDefinitionSnapshot, value: AnalysisFieldValue): AnalysisFieldEntry {
  let nextValue = value
  if (definition.kind === "multi-select" && Array.isArray(value)) {
    const allowed = new Set(definition.options.filter((option) => !option.retired).map((option) => option.id))
    nextValue = definition.options.filter((option) => allowed.has(option.id) && value.includes(option.id)).map((option) => option.id)
    if (nextValue.length === 0) throw new Error(`字段“${definition.label}”不能为空；如需移除值，请使用清空。`)
  }
  if (definition.kind === "text" && typeof(nextValue) === "string" && nextValue.trim() === "") throw new Error(`字段“${definition.label}”不能为空；如需移除值，请使用清空。`)
  const entry: AnalysisFieldEntry = { state: "set", value: nextValue }
  const issues = validateAnalysisFieldEntry(definition, entry)
  if (issues.length) throw new Error(issues[0])
  return entry
}

export interface ShotAnalysisCompleteness {
  valueCount: number
  processedCount: number
  filledFieldCount: number
  totalFieldCount: number
  unknownFieldCount: number
  missingRequiredFields: Array<{ fieldId: string; label: string }>
  hasRequiredFields: boolean
  issues: TemplateValidationIssue[]
}

export function getShotAnalysisCompleteness(profile: ProjectAnalysisProfileSnapshot, values: Record<string, AnalysisFieldEntry>, description: string): ShotAnalysisCompleteness {
  const resolved = resolveAnalysisProfile(profile)
  const existing = readExistingAnalysisEntries(resolved, values)
  let valueCount = 0
  let processedCount = 0
  let unknownFieldCount = 0
  const missingRequiredFields: Array<{ fieldId: string; label: string }> = []
  resolved.fields.forEach(({ definition, usage }) => {
    if (definition.fieldId === "shot_description") {
      const filled = description.trim().length > 0
      if (filled) { valueCount += 1; processedCount += 1 }
      if (usage.required && !filled) missingRequiredFields.push({ fieldId: definition.fieldId, label: definition.label })
      return
    }
    const entry = existing.entries[definition.fieldId]
    if (!entry) {
      if (usage.required) missingRequiredFields.push({ fieldId: definition.fieldId, label: definition.label })
      return
    }
    if (entry.state === "set") { valueCount += 1; processedCount += 1 }
    else if (entry.state === "unknown") { processedCount += 1; unknownFieldCount += 1 }
    else if (definition.allowsNotApplicable) processedCount += 1
    if (usage.required && entry.state !== "set" && !(entry.state === "not_applicable" && definition.allowsNotApplicable)) missingRequiredFields.push({ fieldId: definition.fieldId, label: definition.label })
  })
  return {
    valueCount,
    processedCount,
    filledFieldCount: valueCount,
    totalFieldCount: resolved.fields.length,
    unknownFieldCount,
    missingRequiredFields,
    hasRequiredFields: resolved.fields.some((field) => field.usage.required),
    issues: existing.issues,
  }
}
