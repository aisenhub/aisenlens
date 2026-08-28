import assert from "node:assert/strict";
import test from "node:test";
import { SingleFrameBufferPool } from "../src/worker/frameBufferPool.js";
import type { WasmFrameBuffer, WasmRuntime } from "../src/worker/wasmRuntime.js";

test("single buffer pool reuses matching layouts and re-reserves on change", () => {
  const calls: Array<[number, number, number]> = [];
  const buffer = {} as WasmFrameBuffer;
  const runtime = { reserveFrame: (width: number, height: number, format: number) => { calls.push([width, height, format]); return buffer; } } as WasmRuntime;
  const pool = new SingleFrameBufferPool(runtime);
  assert.equal(pool.acquire(96, 54, 2), buffer);
  assert.equal(pool.acquire(96, 54, 2), buffer);
  pool.acquire(192, 108, 2);
  assert.deepEqual(calls, [[96, 54, 2], [192, 108, 2]]);
  pool.release();
  pool.release();
  assert.throws(() => pool.acquire(96, 54, 2), { code: "INTERNAL_ERROR" });
});
