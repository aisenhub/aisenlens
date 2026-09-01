import type { FeedbackKind } from "../../features/feedback/types"
import { aisenHubClient } from "./client"

export function createFeedbackRequest(input: {
  kind: FeedbackKind
  title: string
  content: string
}) {
  return aisenHubClient.submitFeedback(input)
}

export function canAccessSupporterFeedback() {
  return aisenHubClient
    .checkAccess("aisenlens.supporter_feedback")
    .then(({ data }) => data.allowed)
}
