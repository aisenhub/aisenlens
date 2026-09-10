import type { ShotGroupRecord } from "../group/types";
import type { ShotData } from "../editor/constants/editorData";
import type { AnalysisFieldEntry, ResolvedAnalysisField } from "../template/types";
import type { ResearchContext, ResearchRange } from "../analysis/types";

export type ExportFormat = "csv" | "html" | "xlsx" | "pdf";

export interface ExportShot extends ShotData {
  description: string;
  notes: string;
  analysisFields: Record<string, AnalysisFieldEntry>;
  screenshotId: string | null;
}

export interface ReportExportInput {
  projectTitle: string;
  shots: ExportShot[];
  groups: ShotGroupRecord[];
  fields: ResolvedAnalysisField[];
  screenshotUrls: Record<string, string | null>;
  researchRanges?: ResearchRange[];
  researchContexts?: ResearchContext[];
}
