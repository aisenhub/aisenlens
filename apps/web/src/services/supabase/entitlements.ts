import type { UserRole } from "../../features/auth/types";
import { supabase } from "./client";

interface EntitlementRow {
  role: UserRole;
}

export async function getCurrentUserRole(userId: string): Promise<UserRole> {
  const { data, error } = await supabase
    .from("user_entitlements")
    .select("role")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) throw error;

  return (data as EntitlementRow | null)?.role ?? "free";
}
