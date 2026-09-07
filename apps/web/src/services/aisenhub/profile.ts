import type { UserProfile } from "../../features/auth/types"
import { getCurrentUser } from "../auth/auth"
import { getPlatformSession } from "./client"
import { checkAisenLensAccess } from "./entitlements"
import { AISENLENS_FEATURES } from "./features"

export async function getCurrentProfile(): Promise<UserProfile | null> {
  const [platformSession, user] = await Promise.all([
    getPlatformSession(),
    getCurrentUser(),
  ])
  if (!platformSession.data.authenticated || !platformSession.data.identity || !user?.email) return null

  const access = await checkAisenLensAccess(
    AISENLENS_FEATURES.supporterFeedback,
  )
  return {
    id: platformSession.data.identity.userId,
    email: user.email,
    displayName:
      platformSession.data.identity.displayName ??
      user.user_metadata.display_name ??
      user.email.split("@")[0] ??
      "AisenLens 用户",
    createdAt: user.created_at,
    status: platformSession.data.identity.status,
    hasSupporterFeedbackAccess: access.data.allowed,
  }
}
