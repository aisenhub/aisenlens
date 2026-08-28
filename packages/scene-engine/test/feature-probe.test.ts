import assert from "node:assert/strict";
import test from "node:test";
import { createWasmBackendSelector, selectWasmBackend, simdProbeBytes, supportsWasmSimd } from "../src/worker/featureProbe.js";

test("SIMD feature probe validates once and is resilient to validation failures", () => {
  assert.equal(supportsWasmSimd(), true);
  assert.equal(supportsWasmSimd(() => false), false);
  assert.equal(supportsWasmSimd(() => { throw new Error("probe failure"); }), false);
  assert.equal(selectWasmBackend({ supportsSimd: true }), "wasm-simd");
  assert.equal(selectWasmBackend({ supportsSimd: false }), "wasm-baseline");
  assert.equal(selectWasmBackend({ supportsSimd: true, preferSimd: false }), "wasm-baseline");
  assert.equal(selectWasmBackend({ force: "wasm-baseline", supportsSimd: true }), "wasm-baseline");
  let validateCalls = 0;
  const select = createWasmBackendSelector({ validate: () => { validateCalls += 1; return true; } });
  assert.equal(select(), "wasm-simd");
  assert.equal(select(), "wasm-simd");
  assert.equal(validateCalls, 1);
  const baselineDefault = createWasmBackendSelector({ preferSimd: false, validate: () => true });
  assert.equal(baselineDefault(), "wasm-baseline");
  const copy = simdProbeBytes();
  copy[0] = 99;
  assert.equal(simdProbeBytes()[0], 0);
});
