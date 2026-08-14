import type { AnalysisFieldValue, ProjectTemplateSnapshot, TemplateField, TemplateFieldKind, TemplateReferenceTerm } from "../types";

const MAX_FIELDS = 40;
const MAX_OPTIONS = 80;
const MAX_REFERENCE_TERMS = 80;
const MAX_LABEL_LENGTH = 80;
const MAX_TEXT_LENGTH = 5_000;

const fieldKinds = new Set<TemplateFieldKind>(["single-select", "multi-select", "text", "number", "boolean"]);

function normalizeText(value: unknown, limit: number): string {
  return String(value ?? "").trim().slice(0, limit);
}

function normalizeUniqueStrings(values: unknown, limit: number): string[] {
  if (!Array.isArray(values)) return [];
  const seen = new Set<string>();
  return values.map((value) => normalizeText(value, MAX_LABEL_LENGTH)).filter((value) => {
    if (!value || seen.has(value)) return false;
    seen.add(value);
    return true;
  }).slice(0, limit);
}

function normalizeReferenceTerms(value: unknown): TemplateReferenceTerm[] {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  return value.map((term) => ({ label: normalizeText((term as TemplateReferenceTerm | undefined)?.label, MAX_LABEL_LENGTH), hint: normalizeText((term as TemplateReferenceTerm | undefined)?.hint, 240) })).filter((term) => {
    if (!term.label || seen.has(term.label)) return false;
    seen.add(term.label);
    return true;
  }).slice(0, MAX_REFERENCE_TERMS);
}

function normalizeField(field: TemplateField, order: number, usedIds: Set<string>): TemplateField | null {
  const id = normalizeText(field.id, MAX_LABEL_LENGTH);
  const label = normalizeText(field.label, MAX_LABEL_LENGTH);
  if (!id || !label || usedIds.has(id)) return null;
  usedIds.add(id);
  const kind = fieldKinds.has(field.kind) ? field.kind : "single-select";
  const isFixed = Boolean(field.isFixed);
  return {
    id,
    label,
    kind,
    order,
    options: kind === "single-select" || kind === "multi-select" ? normalizeUniqueStrings(field.options, MAX_OPTIONS) : [],
    referenceTerms: kind === "single-select" || kind === "multi-select" ? normalizeReferenceTerms(field.referenceTerms) : [],
    required: Boolean(field.required),
    isFixed,
  };
}

export function normalizeProjectTemplate(template: ProjectTemplateSnapshot): ProjectTemplateSnapshot {
  const usedIds = new Set<string>();
  const fields = template.fields.map((field, index) => normalizeField(field, index, usedIds)).filter((field): field is TemplateField => field !== null).slice(0, MAX_FIELDS).map((field, order) => ({ ...field, order }));
  return {
    ...template,
    name: normalizeText(template.name, MAX_LABEL_LENGTH) || "未命名分析模板",
    fields,
  };
}

function normalizeKnownFieldValue(field: TemplateField, value: AnalysisFieldValue | undefined): AnalysisFieldValue {
  if (field.kind === "single-select") return typeof value === "string" && field.options.includes(value) ? value : null;
  if (field.kind === "multi-select") return Array.isArray(value) ? normalizeUniqueStrings(value, MAX_OPTIONS).filter((item) => field.options.includes(item)) : [];
  if (field.kind === "text") return typeof value === "string" ? value.slice(0, MAX_TEXT_LENGTH) : "";
  if (field.kind === "number") return typeof value === "number" && Number.isFinite(value) ? value : null;
  return typeof value === "boolean" ? value : null;
}

export function normalizeShotAnalysisFields(fields: TemplateField[], values: Record<string, AnalysisFieldValue>): Record<string, AnalysisFieldValue> {
  const normalizedValues = { ...values };
  for (const field of fields) normalizedValues[field.id] = normalizeKnownFieldValue(field, values[field.id]);
  return normalizedValues;
}

function isFieldValueFilled(field: TemplateField, value: AnalysisFieldValue | undefined, description: string): boolean {
  if (field.id === "shot_description") return description.trim().length > 0;
  if (field.kind === "multi-select") return Array.isArray(value) && value.length > 0;
  if (field.kind === "text") return typeof value === "string" && value.trim().length > 0;
  return value !== null && value !== undefined;
}

export interface ShotAnalysisCompleteness {
  filledFieldCount: number;
  totalFieldCount: number;
  missingRequiredFields: TemplateField[];
}

export function getShotAnalysisCompleteness(fields: TemplateField[], values: Record<string, AnalysisFieldValue>, description: string): ShotAnalysisCompleteness {
  const orderedFields = [...fields].sort((left, right) => left.order - right.order);
  return {
    filledFieldCount: orderedFields.filter((field) => isFieldValueFilled(field, values[field.id], description)).length,
    totalFieldCount: orderedFields.length,
    missingRequiredFields: orderedFields.filter((field) => field.required && !isFieldValueFilled(field, values[field.id], description)),
  };
}
