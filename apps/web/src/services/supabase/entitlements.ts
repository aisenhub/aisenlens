import type { UserRole } from "../../features/auth/types";
import { supabase } from "./client";

interface EntitlementRow {
  role: UserRole;
}

export interface UserEntitlement {
  role: UserRole;
}

export async function getCurrentUserEntitlement(userId: string): Promise<UserEntitlement> {
  const { data, error } = await supabase
    .from("user_entitlements")
    .select("role")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) throw error;

  const entitlement = data as EntitlementRow | null;
  return {
    role: entitlement?.role ?? "free",
  };
}

export async function getCurrentUserRole(userId: string): Promise<UserRole> {
  return (await getCurrentUserEntitlement(userId)).role;
}
