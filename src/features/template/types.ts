export type TemplateFieldKind = "single-select" | "multi-select" | "text" | "number" | "boolean";

export type AnalysisFieldValue = string | string[] | number | boolean | null;

export interface TemplateReferenceTerm {
  label: string;
  hint: string;
}

export interface TemplateField {
  id: string;
  label: string;
  kind: TemplateFieldKind;
  order: number;
  options: string[];
  referenceTerms: TemplateReferenceTerm[];
  required: boolean;
  isFixed: boolean;
}

export interface ProjectTemplateSnapshot {
  id: string;
  projectId: string;
  name: string;
  version: number;
  fields: TemplateField[];
  createdAt: string;
  updatedAt: string;
}
