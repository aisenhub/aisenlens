import type { Session } from "@supabase/supabase-js"
import { supabaseAuth } from "./client"

interface SignUpInput {
  email: string
  password: string
  displayName: string
}

export async function signUpWithEmail({
  email,
  password,
  displayName,
}: SignUpInput) {
  const { data, error } = await supabaseAuth.auth.signUp({
    email,
    password,
    options: { data: { display_name: displayName.trim() || undefined } },
  })
  if (error) throw error
  return data
}

export async function signInWithEmail(email: string, password: string) {
  const { data, error } = await supabaseAuth.auth.signInWithPassword({
    email,
    password,
  })
  if (error) throw error
  return data
}

export async function requestPasswordReset(email: string) {
  const { error } = await supabaseAuth.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/reset-password`,
  })
  if (error) throw error
}

export async function updatePassword(password: string) {
  const { data, error } = await supabaseAuth.auth.updateUser({ password })
  if (error) throw error
  return data
}

export async function getCurrentSession() {
  const { data, error } = await supabaseAuth.auth.getSession()
  if (error) throw error
  return data.session
}

export async function getCurrentUser() {
  const { data, error } = await supabaseAuth.auth.getUser()
  if (error) throw error
  return data.user
}

export function onAuthStateChange(
  onSessionChange: (session: Session | null) => void,
) {
  return supabaseAuth.auth.onAuthStateChange((_, session) =>
    onSessionChange(session),
  )
}

export async function signOut() {
  const { error } = await supabaseAuth.auth.signOut()
  if (error) throw error
}
