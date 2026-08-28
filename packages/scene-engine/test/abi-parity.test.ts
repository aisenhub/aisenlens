import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import test from "node:test";
import { DEFAULT_SCENE_DETECTION_CONFIG } from "../src/api/config.js";
import { createWasmRuntime } from "../src/worker/wasmRuntime.js";

test("baseline WASM keeps the C ABI event contract for a synthetic content cut", async (context) => {
  const packageRoot = existsSync(resolve(process.cwd(), "dist/wasm")) ? process.cwd() : resolve(process.cwd(), "packages/scene-engine");
  const modulePath = resolve(packageRoot, "dist/wasm/scene-engine.js");
  if (!existsSync(modulePath)) {
    context.skip("run scene-engine:build:wasm before parity tests");
    return;
  }
  const imported = (await import(pathToFileURL(modulePath).href)) as { default: (options?: Record<string, unknown>) => Promise<unknown> };
  const runtime = await createWasmRuntime(
    () => imported.default({ locateFile: (name: string) => resolve(packageRoot, "dist/wasm", name) }) as Promise<never>,
    DEFAULT_SCENE_DETECTION_CONFIG,
  );
  try {
    const width = 96;
    const height = 54;
    const strideBytes = width * 4;
    const black = new Uint8Array(strideBytes * height);
    const white = new Uint8Array(strideBytes * height).fill(255);
    const first = { pixelFormat: 2, bitDepth: 8, fullRange: true, codedWidth: width, codedHeight: height, visibleX: 0, visibleY: 0, visibleWidth: width, visibleHeight: height, matrix: 2, primaries: 2, transfer: 2, presentationIndex: 0, timestampUs: 0, durationUs: 40_000, planes: [{ data: black, strideBytes, sizeBytes: black.byteLength }] };
    const second = { ...first, presentationIndex: 1, timestampUs: 40_000, planes: [{ data: white, strideBytes, sizeBytes: white.byteLength }] };
    runtime.reserveFrame(width, height, 2);
    assert.deepEqual(runtime.processFrame(first), []);
    const events = runtime.processFrame(second);
    assert.equal(events.length, 1);
    assert.equal(events[0]?.kind, "hard-cut");
    assert.equal(events[0]?.detector, "content");
    assert.equal(events[0]?.timestampUs, 40_000);
    assert.equal(events[0]?.score, 3_334);
    assert.equal(events[0]?.threshold, 2_700);
    const stored = runtime.readEvents(0n, 8);
    assert.equal(stored.total, 1n);
    assert.equal(stored.events[0]?.presentationIndex, 1);
    const checkpoint = runtime.exportCheckpoint(123n);
    assert.ok(checkpoint.byteLength > 0);
    runtime.importCheckpoint(checkpoint, 123n);
    assert.deepEqual(runtime.flush(), []);
  } finally {
    runtime.dispose();
  }
});

test("baseline WASM preserves adaptive look-ahead and threshold fade semantics", async (context) => {
  const packageRoot = existsSync(resolve(process.cwd(), "dist/wasm")) ? process.cwd() : resolve(process.cwd(), "packages/scene-engine");
  const modulePath = resolve(packageRoot, "dist/wasm/scene-engine.js");
  if (!existsSync(modulePath)) {
    context.skip("run scene-engine:build:wasm before parity tests");
    return;
  }
  const imported = (await import(pathToFileURL(modulePath).href)) as { default: (options?: Record<string, unknown>) => Promise<unknown> };
  const makeRuntime = (config: typeof DEFAULT_SCENE_DETECTION_CONFIG) =>
    createWasmRuntime(() => imported.default({ locateFile: (name: string) => resolve(packageRoot, "dist/wasm", name) }) as Promise<never>, config);
  const width = 96;
  const height = 54;
  const strideBytes = width * 4;
  const solid = (value: number, presentationIndex: number, timestampUs: number) => ({
    pixelFormat: 2,
    bitDepth: 8,
    fullRange: true,
    codedWidth: width,
    codedHeight: height,
    visibleX: 0,
    visibleY: 0,
    visibleWidth: width,
    visibleHeight: height,
    matrix: 2,
    primaries: 2,
    transfer: 2,
    presentationIndex,
    timestampUs,
    durationUs: 40_000,
    planes: [{ data: new Uint8Array(strideBytes * height).fill(value), strideBytes, sizeBytes: strideBytes * height }],
  });

  const adaptiveConfig = {
    ...DEFAULT_SCENE_DETECTION_CONFIG,
    hardCut: { kind: "adaptive" as const, adaptiveThreshold: 3000, windowWidth: 1, minimumContentScore: 1, weights: { hue: 3333, saturation: 3333, luma: 3334 } },
    minimumSceneDurationUs: 0,
  };
  const adaptive = await makeRuntime(adaptiveConfig);
  try {
    adaptive.reserveFrame(width, height, 2);
    assert.deepEqual(adaptive.processFrame(solid(0, 0, 0)), []);
    assert.deepEqual(adaptive.processFrame(solid(0, 1, 40_000)), []);
    assert.deepEqual(adaptive.processFrame(solid(255, 2, 80_000)), []);
    const adaptiveEvents = adaptive.processFrame(solid(255, 3, 120_000));
    assert.equal(adaptiveEvents[0]?.detector, "adaptive");
    assert.equal(adaptiveEvents[0]?.presentationIndex, 2);
  } finally {
    adaptive.dispose();
  }

  const fadeConfig = {
    ...DEFAULT_SCENE_DETECTION_CONFIG,
    hardCut: { kind: "content" as const, threshold: 10_000, weights: { hue: 3333, saturation: 3333, luma: 3334 } },
    fade: { mode: "floor" as const, threshold: 100, bias: 0, emitFinalFade: false },
    minimumSceneDurationUs: 0,
  };
  const fade = await makeRuntime(fadeConfig);
  try {
    fade.reserveFrame(width, height, 2);
    assert.deepEqual(fade.processFrame(solid(180, 0, 0)), []);
    assert.deepEqual(fade.processFrame(solid(50, 1, 1_000_000)), []);
    const fadeEvents = fade.processFrame(solid(180, 2, 3_000_000));
    assert.equal(fadeEvents[0]?.kind, "fade");
    assert.equal(fadeEvents[0]?.timestampUs, 2_000_000);
    assert.deepEqual(fade.flush(), []);
  } finally {
    fade.dispose();
  }
});
