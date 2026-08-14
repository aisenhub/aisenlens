export type ShotGroupKind = "scene" | "section" | "sequence";

export interface ShotGroupRecord {
  id: string;
  projectId: string;
  kind: ShotGroupKind;
  title: string;
  summary: string;
  shotIds: string[];
  createdAt: string;
  updatedAt: string;
}
