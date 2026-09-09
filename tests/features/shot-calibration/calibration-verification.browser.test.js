import assert from "node:assert/strict"
import { mkdir, writeFile } from "node:fs/promises"
import test from "node:test"
import { evaluate, launchBrowser, until, browserPath, root } from "./calibration-browser-harness.js"

test("校准 VFR/PTS、事务故障注入与性能压力矩阵浏览器验证", { timeout: 180_000 }, async (context) => {
  if (!browserPath) { context.skip("未找到 Chrome/Edge；可设置 AISENLENS_CHROME_PATH 后重试。"); return }
  const { client, sessionId } = await launchBrowser(context, "calibration-verification")
  await until(async () => (await evaluate(client, sessionId, "document.body.innerText.includes('项目库')")), "验证浏览器未加载项目库")

  const mediaFrame = await evaluate(client, sessionId, "import('/test/shot-calibration-media-frame.verification.ts').then((module) => module.runShotCalibrationMediaFrameVerification())")
  assert.equal(mediaFrame.fixture.timingMode, "vfr")
  assert.equal(mediaFrame.rationalFrameRates.ntsc24000, "cfr")
  assert.equal(mediaFrame.rationalFrameRates.ntsc30000, "cfr")
  assert.equal(mediaFrame.syntheticVfr, "vfr")

  const transaction = await evaluate(client, sessionId, "import('/test/shot-calibration-apply-transaction.verification.ts').then((module) => module.runShotCalibrationApplyTransactionVerification())")
  assert.equal(transaction.allFaultsRolledBack, true)
  assert.equal(transaction.idempotent, true)

  const performance = await evaluate(client, sessionId, "import('/test/shot-calibration-performance.verification.ts').then((module) => module.runShotCalibrationPerformanceVerification())")
  assert.equal(performance.matrix.length, 3)
  assert.equal(performance.matrix.at(-1).boundaryCount, 3_000)
  assert.equal(performance.commandPressure.finalRevision, 20)

  const report = { generatedAt: new Date().toISOString(), browser: performance.environment, mediaFrame, transaction, performance }
  await mkdir(`${root}/test-results`, { recursive: true })
  await writeFile(`${root}/test-results/shot-calibration-verification.json`, JSON.stringify(report, null, 2), "utf8")
})
