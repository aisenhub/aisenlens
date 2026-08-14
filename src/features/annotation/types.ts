export const annotationMarkerCategories = ["important", "composition", "emotion", "turning-point"] as const;

export type AnnotationMarkerCategory = (typeof annotationMarkerCategories)[number];

export interface AnnotationMarker {
  id: string;
  projectId: string;
  frame: number;
  shotId: string | null;
  category: AnnotationMarkerCategory;
  label: string;
  note: string;
  createdAt: string;
  updatedAt: string;
}
