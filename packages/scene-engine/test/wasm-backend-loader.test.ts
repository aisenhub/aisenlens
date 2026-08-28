import assert from "node:assert/strict";
import test from "node:test";
import { createWasmBackendLoader } from "../src/worker/wasmBackendLoader.js";

test("loads SIMD once and keeps the selected backend fixed", async () => {
  const calls: string[] = [];
  const loader = createWasmBackendLoader({
    selectBackend: () => "wasm-simd",
    loadModule: async (backend) => { calls.push(backend); return { backend }; },
  });
  assert.deepEqual(await loader.initialize(), { backend: "wasm-simd", version: "wasm-media-simd" });
  await loader.module();
  await loader.module();
  assert.deepEqual(calls, ["wasm-simd"]);
});

test("falls back to baseline only when SIMD initialization fails", async () => {
  const calls: string[] = [];
  const loader = createWasmBackendLoader({
    selectBackend: () => "wasm-simd",
    loadModule: async (backend) => {
      calls.push(backend);
      if (backend === "wasm-simd") throw new Error("simd missing");
      return { backend };
    },
  });
  assert.deepEqual(await loader.initialize(), { backend: "wasm-baseline", version: "wasm-media" });
  assert.deepEqual(await loader.module(), { backend: "wasm-baseline" });
  assert.deepEqual(calls, ["wasm-simd", "wasm-baseline"]);
});

test("surfaces baseline failure and does not silently retry it", async () => {
  let attempts = 0;
  const loader = createWasmBackendLoader({
    selectBackend: () => "wasm-baseline",
    loadModule: async () => { attempts += 1; throw new Error("baseline broken"); },
  });
  await assert.rejects(loader.initialize(), /baseline broken/);
  await assert.rejects(loader.initialize(), /baseline broken/);
  assert.equal(attempts, 1);
});

test("reset starts a fresh selection for an explicit re-init", async () => {
  let backend: "wasm-baseline" | "wasm-simd" = "wasm-baseline";
  const calls: string[] = [];
  const loader = createWasmBackendLoader({
    selectBackend: () => backend,
    loadModule: async (value) => { calls.push(value); return value; },
  });
  assert.equal((await loader.initialize()).backend, "wasm-baseline");
  backend = "wasm-simd";
  loader.reset();
  assert.equal((await loader.initialize()).backend, "wasm-simd");
  assert.deepEqual(calls, ["wasm-baseline", "wasm-simd"]);
});
