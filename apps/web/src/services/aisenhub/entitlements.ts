import { aisenHubClient } from "./client"

export function getAisenLensEntitlements() {
  return aisenHubClient.getEntitlements()
}

export function checkAisenLensAccess(featureCode: string) {
  return aisenHubClient.checkAccess(featureCode)
}
