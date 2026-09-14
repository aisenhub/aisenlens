import assert from "node:assert/strict"
import test from "node:test"
import {
  createProjectFieldDefinition,
  createProfileDraftFromSystemProfile,
  createSystemProfileSnapshot,
  getSystemFieldDefinition,
} from "../src/features/template/services/fieldRegistry.ts"
import {
  createSetEntry,
  readExistingAnalysisEntries,
  validateAnalysisFieldEntry,
  validateProjectAnalysisProfile,
} from "../src/features/template/services/templateValidation.ts"
import { previewAnalysisBatch } from "../src/features/analysis/services/analysisFieldCommands.ts"

function usage(fieldId: string, order: number) {
  return {
    fieldId,
    sectionId: "observations",
    order,
    required: false,
    core: false,
    presentation: {},
    interaction: { allowQuickEntry: true, allowCopyPrevious: true, allowBatchEdit: true, evidencePolicy: "optional" as const },
  }
}

test("project profile keeps custom definitions and old values when a usage is removed", () => {
  const profile = createSystemProfileSnapshot("project-template-contract")
  const custom = createProjectFieldDefinition(profile.projectId, "custom.texture", {
    label: "纹理",
    description: "记录表面纹理。",
    kind: "single-select",
    options: [{ id: "texture.rough", label: "粗糙", retired: false }],
    referenceTerms: [],
    allowsNotApplicable: true,
  })
  const withCustom = {
    ...profile,
    fieldDefinitions: [...profile.fieldDefinitions, custom],
    fieldUsages: [...profile.fieldUsages, usage(custom.fieldId, profile.fieldUsages.length)],
  }
  const withoutCustomUsage = { ...withCustom, fieldUsages: withCustom.fieldUsages.filter((item) => item.fieldId !== custom.fieldId) }
  const next = createProfileDraftFromSystemProfile(withoutCustomUsage, "system.quick-review")
  assert.equal(next.fieldDefinitions.some((field) => field.fieldId === custom.fieldId), true)
  assert.equal(next.fieldUsages.some((item) => item.fieldId === custom.fieldId), false)
  assert.deepEqual(readExistingAnalysisEntries(next, { [custom.fieldId]: { state: "set", value: "texture.rough" } }).entries, {
    [custom.fieldId]: { state: "set", value: "texture.rough" },
  })
  assert.deepEqual(validateProjectAnalysisProfile(next), [])
  const reenabled = { ...withoutCustomUsage, fieldUsages: [...withoutCustomUsage.fieldUsages, usage(custom.fieldId, withoutCustomUsage.fieldUsages.length)] }
  assert.equal(reenabled.fieldDefinitions.find((field) => field.fieldId === custom.fieldId)?.options[0]?.id, "texture.rough")
  assert.deepEqual(readExistingAnalysisEntries(reenabled, { [custom.fieldId]: { state: "set", value: "texture.rough" } }).entries, {
    [custom.fieldId]: { state: "set", value: "texture.rough" },
  })
})

test("option labels and retired values preserve option identity without allowing new retired writes", () => {
  const field = getSystemFieldDefinition("shot")!
  const option = field.options[0]
  const edited = { ...field, options: field.options.map((item) => item.id === option.id ? { ...item, label: "改名后的景别", retired: true } : item) }
  const existing = { state: "set" as const, value: option.id }
  assert.equal(edited.options[0].id, option.id)
  assert.deepEqual(validateAnalysisFieldEntry(edited, existing, { allowRetiredOptions: true }), [])
  assert.equal(validateAnalysisFieldEntry(edited, existing).length > 0, true)
})

test("false, zero, unknown, not-applicable and explicit empty states remain distinct", () => {
  const booleanField = createProjectFieldDefinition("project-template-contract", "custom.boolean", { label: "开关", description: "", kind: "boolean", options: [], referenceTerms: [], allowsNotApplicable: true })
  const numberField = createProjectFieldDefinition("project-template-contract", "custom.number", { label: "数值", description: "", kind: "number", options: [], referenceTerms: [], allowsNotApplicable: true })
  assert.deepEqual(createSetEntry(booleanField, false), { state: "set", value: false })
  assert.deepEqual(createSetEntry(numberField, 0), { state: "set", value: 0 })
  assert.deepEqual(readExistingAnalysisEntries(createSystemProfileSnapshot("project-template-contract"), {
    shot: { state: "unknown" },
    motion: { state: "not_applicable" },
    color: { state: "set", value: "color.cool" },
  }).entries, {
    shot: { state: "unknown" },
    motion: { state: "not_applicable" },
    color: { state: "set", value: "color.cool" },
  })
})

test("字段变更后的数量与批量预览只计算明确目标", () => {
  const preview = previewAnalysisBatch("shot", ["shot-1", "shot-2", "removed-shot"], ["shot-1", "shot-2"], {
    "shot-1": { shot: { state: "set", value: "shot.wide" } },
    "shot-2": {},
  })
  assert.deepEqual(preview, { targetCount: 2, overwriteCount: 1, outsideScopeCount: 1 })
})
