import { aisenHubClient } from "./client"

function createIdempotencyKey() {
  return globalThis.crypto.randomUUID()
}

export function redeemAisenLensCode(code: string) {
  return aisenHubClient.redeem(code, createIdempotencyKey())
}
