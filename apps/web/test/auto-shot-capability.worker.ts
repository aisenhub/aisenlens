import { runAutoShotCapabilityVerification } from "./auto-shot-capability.verification"

self.addEventListener("message", async () => {
  try {
    self.postMessage({ ok: true, result: await runAutoShotCapabilityVerification() })
  } catch (error) {
    self.postMessage({ ok: false, error: error instanceof Error ? error.message : String(error) })
  }
})
