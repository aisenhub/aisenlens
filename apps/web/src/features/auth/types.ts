export interface UserProfile {
  id: string;
  email: string;
  displayName: string;
  createdAt: string;
  status: "active" | "disabled" | "deletion_pending" | "deleted";
  hasSupporterFeedbackAccess: boolean;
}
