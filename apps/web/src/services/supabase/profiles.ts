import type { UserProfile } from "../../features/auth/types";
import { supabase } from "./client";
import { getCurrentUserRole } from "./entitlements";

interface ProfileRow {
  id: string;
  display_name: string | null;
  created_at: string;
}

function getFallbackDisplayName(email: string) {
  return email.split("@")[0] || "AisenLens 用户";
}

export async function getCurrentProfile(): Promise<UserProfile | null> {
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError) throw userError;
  if (!user || !user.email) return null;

  const [{ data, error }, role] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, display_name, created_at")
      .eq("id", user.id)
      .maybeSingle(),
    getCurrentUserRole(user.id),
  ]);

  if (error) throw error;

  const profile = data as ProfileRow | null;
  return {
    id: user.id,
    email: user.email,
    displayName: profile?.display_name || user.user_metadata.display_name || getFallbackDisplayName(user.email),
    createdAt: profile?.created_at || user.created_at,
    role,
  };
}

export async function updateCurrentDisplayName(displayName: string) {
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError) throw userError;
  if (!user || !user.email) throw new Error("当前未登录。");

  const { data, error } = await supabase
    .from("profiles")
    .update({ display_name: displayName.trim() })
    .eq("id", user.id)
    .select("id, display_name, created_at")
    .single();

  if (error) throw error;

  const profile = data as ProfileRow;
  const role = await getCurrentUserRole(user.id);
  return {
    id: user.id,
    email: user.email,
    displayName: profile.display_name || getFallbackDisplayName(user.email),
    createdAt: profile.created_at,
    role,
  } satisfies UserProfile;
}
