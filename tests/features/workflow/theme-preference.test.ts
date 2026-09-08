import assert from "node:assert/strict"
import test from "node:test"
import { normalizeThemePreference, resolveThemePreference } from "../../../apps/web/src/hooks/useAppTheme.ts"

test("normalizes unknown preference to dark and resolves system explicitly", () => {
  assert.equal(normalizeThemePreference("unexpected"), "dark")
  assert.equal(resolveThemePreference("system", "light"), "light")
  assert.equal(resolveThemePreference("system", "dark"), "dark")
  assert.equal(resolveThemePreference("light", "dark"), "light")
})
