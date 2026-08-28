import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import test from "node:test";
import { DEFAULT_SCENE_DETECTION_CONFIG } from "../src/api/config.js";
import { createWasmRuntime } from "../src/worker/wasmRuntime.js";

const packageRoot = existsSync(resolve(process.cwd(), "dist/wasm")) ? process.cwd() : resolve(process.cwd(), "packages/scene-engine");

async function makeRuntime(directory: string) {
  const modulePath = resolve(packageRoot, directory, "scene-engine" + (directory.includes("simd") ? "-simd" : "") + ".js");
  const imported = (await import(pathToFileURL(modulePath).href)) as { default: (options?: Record<string, unknown>) => Promise<unknown> };
  return createWasmRuntime(() => imported.default({ locateFile: (name: string) => resolve(packageRoot, directory, name) }) as Promise<never>, DEFAULT_SCENE_DETECTION_CONFIG);
}

function frameSet(pixelFormat: number, presentationOffset: number) {
  const width = 96;
  const height = 54;
  const strideBytes = width * 4;
  const make = (value: number, presentationIndex: number, timestampUs: number) => ({
    pixelFormat,
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
    planes: pixelFormat === 2
      ? [{ data: new Uint8Array(strideBytes * height).fill(value), strideBytes, sizeBytes: strideBytes * height }]
      : pixelFormat === 0
        ? [
            { data: new Uint8Array(width * height).fill(value), strideBytes: width, sizeBytes: width * height },
            { data: new Uint8Array((width / 2) * (height / 2)).fill(128), strideBytes: width / 2, sizeBytes: (width / 2) * (height / 2) },
            { data: new Uint8Array((width / 2) * (height / 2)).fill(128), strideBytes: width / 2, sizeBytes: (width / 2) * (height / 2) },
          ]
        : [
            { data: new Uint8Array(width * height).fill(value), strideBytes: width, sizeBytes: width * height },
            { data: new Uint8Array(width * (height / 2)).fill(128), strideBytes: width, sizeBytes: width * (height / 2) },
          ],
  });
  return [make(0, presentationOffset, presentationOffset * 40_000), make(255, presentationOffset + 1, (presentationOffset + 1) * 40_000), make(255, presentationOffset + 2, (presentationOffset + 2) * 40_000), make(16, presentationOffset + 3, (presentationOffset + 3) * 40_000)];
}

test("SIMD artifact validates and preserves baseline event parity", async (context) => {
  const baselineWasm = resolve(packageRoot, "dist/wasm/scene-engine.wasm");
  const simdWasm = resolve(packageRoot, "dist/wasm-simd/scene-engine-simd.wasm");
  const simdModule = resolve(packageRoot, "dist/wasm-simd/scene-engine-simd.js");
  if (!existsSync(baselineWasm) || !existsSync(simdWasm) || !existsSync(simdModule)) {
    context.skip("run scene-engine:build:wasm and scene-engine:build:wasm:simd before SIMD parity");
    return;
  }
  assert.equal(WebAssembly.validate(readFileSync(simdWasm)), true);
  const baseline = await makeRuntime("dist/wasm");
  const simd = await makeRuntime("dist/wasm-simd");
  try {
    const fixtures = [{ pixelFormat: 2 }, { pixelFormat: 0 }, { pixelFormat: 1 }];
    const baselineEvents = fixtures.flatMap(({ pixelFormat }, index) => {
      baseline.reserveFrame(96, 54, pixelFormat);
      return frameSet(pixelFormat, index * 4).flatMap((frame) => baseline.processFrame(frame));
    });
    const simdEvents = fixtures.flatMap(({ pixelFormat }, index) => {
      simd.reserveFrame(96, 54, pixelFormat);
      return frameSet(pixelFormat, index * 4).flatMap((frame) => simd.processFrame(frame));
    });
    assert.deepEqual(simdEvents, baselineEvents);
    assert.deepEqual(simd.flush(), baseline.flush());
    assert.equal(baseline.abiVersion, simd.abiVersion);
  } finally {
    baseline.dispose();
    simd.dispose();
  }
});
