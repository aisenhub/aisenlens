import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";
import assert from "node:assert/strict";
import { AISENLENS_FEATURES } from "../src/services/aisenhub/features.ts";

test("AisenLens platform access is defined by feature codes", () => {
  assert.deepEqual(AISENLENS_FEATURES, {
    appAccess: "aisenlens.app.access",
    supporterFeedback: "aisenlens.supporter_feedback",
  });
});

test("AisenLens platform adapters do not depend on product tables or legacy role RPCs", () => {
  const adapterRoot = join(process.cwd(), "src", "services", "aisenhub");
  const source = readdirSync(adapterRoot)
    .filter((name) => name.endsWith(".ts"))
    .map((name) => readFileSync(join(adapterRoot, name), "utf8"))
    .join("\n");

  assert.match(source, /@aisenhub\/platform-client/);
  assert.doesNotMatch(source, /supabase|user_entitlements|supporter.*role|redeem_support_code/i);
});
