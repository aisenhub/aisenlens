export const annotationMarkerScopes = [
  "free",
  "film",
  "section",
  "sequence",
  "scene",
  "shot",
] as const;

export type AnnotationMarkerScope = (typeof annotationMarkerScopes)[number];

export const annotationMarkerScopeLabels: Record<AnnotationMarkerScope, string> = {
  free: "自由",
  film: "全片",
  section: "段落",
  sequence: "序列",
  scene: "场景",
  shot: "镜头",
};

export interface AnnotationMarker {
  id: string;
  projectId: string;
  frame: number;
  content: string;
  scope: AnnotationMarkerScope;
  createdAt: string;
  updatedAt: string;
}

/** Only used while upgrading an existing v17 object store. */
export interface LegacyAnnotationMarkerV17 {
  id: string;
  projectId: string;
  frame: number;
  shotId: string | null;
  category: "important" | "composition" | "emotion" | "turning-point";
  label: string;
  note: string;
  createdAt: string;
  updatedAt: string;
}
