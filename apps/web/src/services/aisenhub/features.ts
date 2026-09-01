export const AISENLENS_FEATURES = {
  appAccess: "aisenlens.app.access",
  supporterFeedback: "aisenlens.supporter_feedback",
} as const

export type AisenLensFeatureCode = typeof AISENLENS_FEATURES[keyof typeof AISENLENS_FEATURES]
