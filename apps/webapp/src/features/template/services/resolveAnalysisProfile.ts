import type {
  AnalysisProfileFieldUsage,
  AnalysisSurface,
  FieldDefinitionSnapshot,
  FieldSurfaceSettings,
  ProjectAnalysisProfileSnapshot,
  ResolvedAnalysisField,
  ResolvedAnalysisProfile,
  TemplateFieldKind,
} from "../types.ts"

const supportedKinds = new Set<TemplateFieldKind>(["single-select", "multi-select", "text", "number", "boolean"])

export function defaultSurfaceSettings(kind: TemplateFieldKind, surface: AnalysisSurface): FieldSurfaceSettings {
  return {
    visible: true,
    widget: kind === "text" ? "textarea" : kind === "multi-select" ? "multi-chips" : kind === "number" ? "number" : kind === "boolean" ? "boolean" : "chips",
    density: surface === "shot_table" ? "compact" : "normal",
    showDescription: surface !== "shot_table" && surface !== "report",
    showReferenceTerms: surface === "detail_panel" || surface === "focus_mode",
  }
}

function usageOrder(left: AnalysisProfileFieldUsage, right: AnalysisProfileFieldUsage): number {
  return left.order - right.order || left.fieldId.localeCompare(right.fieldId)
}

function issue(fieldId: string | undefined, message: string, severity: "warning" | "error" = "error") {
  return { fieldId, severity, message }
}

export default function resolveAnalysisProfile(profile: ProjectAnalysisProfileSnapshot, surface: AnalysisSurface = "detail_panel"): ResolvedAnalysisProfile {
  const definitions = new Map(profile.fieldDefinitions.map((definition) => [definition.fieldId, definition]))
  const sections = [...profile.sections].sort((left, right) => left.order - right.order)
  const issues = profile.fieldDefinitions.flatMap((definition) => {
    const result = []
    if (!definition.fieldId) result.push(issue(undefined, "存在没有身份的字段定义。"))
    if (!supportedKinds.has(definition.kind)) result.push(issue(definition.fieldId, `字段“${definition.label}”的类型不受支持。`))
    if ((definition.kind === "single-select" || definition.kind === "multi-select") && definition.options.length === 0) result.push(issue(definition.fieldId, `字段“${definition.label}”没有可用选项。`, "warning"))
    const optionIds = new Set<string>()
    definition.options.forEach((option) => {
      if (!option.id || optionIds.has(option.id)) result.push(issue(definition.fieldId, `字段“${definition.label}”包含重复或空的 optionId。`))
      optionIds.add(option.id)
    })
    return result
  })
  const fields: ResolvedAnalysisField[] = [...profile.fieldUsages].sort(usageOrder).map((usage) => {
    const definition = definitions.get(usage.fieldId)
    if (!definition) {
      issues.push(issue(usage.fieldId, `当前模板引用了缺失的字段定义“${usage.fieldId}”。`))
      return {
        definition: {
          fieldId: usage.fieldId,
          definitionVersion: 0,
          origin: "project",
          semanticKey: `missing.${usage.fieldId}`,
          label: "缺失字段",
          description: "该字段定义不可用，原始值仍会保留。",
          scope: "shot",
          kind: "text",
          options: [],
          referenceTerms: [],
          allowsNotApplicable: false,
        },
        usage,
        surface: defaultSurfaceSettings("text", surface),
        issues: ["字段定义缺失，已禁用新写入。"],
      }
    }
    const fieldIssues: string[] = []
    if (!supportedKinds.has(definition.kind)) fieldIssues.push("字段类型不受支持。")
    const surfaceSettings = usage.presentation[surface] ?? defaultSurfaceSettings(definition.kind, surface)
    return { definition, usage, surface: surfaceSettings, issues: fieldIssues }
  })
  return { profile, fields, sections, issues }
}

export function getResolvedField(profile: ProjectAnalysisProfileSnapshot, fieldId: string, surface: AnalysisSurface = "detail_panel"): ResolvedAnalysisField | null {
  return resolveAnalysisProfile(profile, surface).fields.find((field) => field.definition.fieldId === fieldId) ?? null
}

export function getDefinition(profile: ProjectAnalysisProfileSnapshot, fieldId: string): FieldDefinitionSnapshot | null {
  return profile.fieldDefinitions.find((definition) => definition.fieldId === fieldId) ?? null
}
