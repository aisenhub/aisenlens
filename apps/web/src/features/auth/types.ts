export type UserRole = "free" | "supporter" | "patron";

export interface UserProfile {
  id: string;
  email: string;
  displayName: string;
  createdAt: string;
  role: UserRole;
}
