export type TemplateFieldKind = "single-select" | "multi-select" | "text" | "number" | "boolean"

export type AnalysisSurface = "detail_panel" | "shot_table" | "focus_mode" | "ai_review" | "report"
export type FieldDensity = "compact" | "normal" | "expanded"
export type FieldWidget = "chips" | "select" | "multi-chips" | "text" | "textarea" | "number" | "boolean"

export type AnalysisFieldValue = string | string[] | number | boolean

export type AnalysisFieldEntry =
  | { state: "set"; value: AnalysisFieldValue }
  | { state: "unknown" }
  | { state: "not_applicable" }

export interface TemplateReferenceTerm {
  label: string
  hint: string
}

export interface FieldOption {
  id: string
  label: string
  retired: boolean
}

export interface FieldGuidance {
  observationTarget: string
  selectionRule: string
  example: string
  counterExample: string
  unknownRule: string
  notApplicableRule: string
}

export interface FieldDefinitionSnapshot {
  fieldId: string
  definitionVersion: number
  origin: "system" | "project"
  semanticKey: string
  label: string
  description: string
  scope: "shot"
  kind: TemplateFieldKind
  options: FieldOption[]
  referenceTerms: TemplateReferenceTerm[]
  allowsNotApplicable: boolean
  guidance?: FieldGuidance
}

export interface FieldSurfaceSettings {
  visible: boolean
  widget: FieldWidget
  density: FieldDensity
  showDescription: boolean
  showReferenceTerms: boolean
}

export interface FieldInteractionPolicy {
  allowQuickEntry: boolean
  allowCopyPrevious: boolean
  allowBatchEdit: boolean
  evidencePolicy: "none" | "optional" | "recommended"
}

export interface AnalysisProfileFieldUsage {
  fieldId: string
  sectionId: string
  order: number
  required: boolean
  core: boolean
  presentation: Partial<Record<AnalysisSurface, FieldSurfaceSettings>>
  interaction: FieldInteractionPolicy
}

export interface AnalysisProfileSection {
  id: string
  label: string
  order: number
  defaultExpanded: boolean
}

export interface ProjectAnalysisProfileSnapshot {
  schemaVersion: 2
  id: string
  projectId: string
  name: string
  version: number
  sourceProfile: { id: string; version: number } | null
  fieldDefinitions: FieldDefinitionSnapshot[]
  sections: AnalysisProfileSection[]
  fieldUsages: AnalysisProfileFieldUsage[]
  createdAt: string
  updatedAt: string
}

export type ProjectTemplateSnapshot = ProjectAnalysisProfileSnapshot

export interface ResolvedAnalysisField {
  definition: FieldDefinitionSnapshot
  usage: AnalysisProfileFieldUsage
  surface: FieldSurfaceSettings
  issues: string[]
}

export interface AnalysisProfileIssue {
  fieldId?: string
  severity: "warning" | "error"
  message: string
}

export interface ResolvedAnalysisProfile {
  profile: ProjectAnalysisProfileSnapshot
  fields: ResolvedAnalysisField[]
  sections: AnalysisProfileSection[]
  issues: AnalysisProfileIssue[]
}
