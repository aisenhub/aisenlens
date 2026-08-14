import type { Session } from "@supabase/supabase-js";
import { supabase } from "./client";

interface SignUpInput {
  email: string;
  password: string;
  displayName: string;
}

export async function signUpWithEmail({ email, password, displayName }: SignUpInput) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        display_name: displayName.trim() || undefined,
      },
    },
  });

  if (error) throw error;

  return data;
}

export async function signInWithEmail(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) throw error;

  return data;
}

export async function requestPasswordReset(email: string) {
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/reset-password`,
  });

  if (error) throw error;
}

export async function updatePassword(password: string) {
  const { data, error } = await supabase.auth.updateUser({ password });

  if (error) throw error;

  return data;
}

export async function getCurrentSession() {
  const { data, error } = await supabase.auth.getSession();

  if (error) throw error;

  return data.session;
}

export function onAuthStateChange(onSessionChange: (session: Session | null) => void) {
  return supabase.auth.onAuthStateChange((_, session) => onSessionChange(session));
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();

  if (error) throw error;
}
