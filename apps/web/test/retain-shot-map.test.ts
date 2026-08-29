import assert from "node:assert/strict"
import test from "node:test"
import retainShotMap from "../src/features/editor/utils/retainShotMap.ts"

test("retainShotMap keeps only metadata for surviving shots", () => {
  const source = {
    unchanged: { note: "keep" },
    replaced: { note: "drop" },
  }

  assert.deepEqual(retainShotMap(source, new Set(["unchanged"])), {
    unchanged: { note: "keep" },
  })
})
