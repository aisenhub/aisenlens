import assert from "node:assert/strict";
import test from "node:test";
import { DEFAULT_SCENE_DETECTION_CONFIG } from "../src/api/config.js";
import { createWasmRuntime } from "../src/worker/wasmRuntime.js";
import type { WasmAbiModule } from "../src/worker/wasmRuntime.js";

function fakeModule(): WasmAbiModule {
  const wasmMemory = new WebAssembly.Memory({ initial: 2 });
  const heap = new Uint8Array(wasmMemory.buffer);
  const data = () => new DataView(wasmMemory.buffer);
  let next = 1024;
  const alloc = (size: number) => {
    const pointer = next;
    next += size;
    return pointer;
  };
  return {
    wasmMemory,
    _asen_abi_version: () => 1,
    _malloc: alloc,
    _free: () => undefined,
    _asen_create: (_config, outEngine) => {
      data().setUint32(outEngine, 512, true);
      return 0;
    },
    _asen_destroy: () => 0,
    _asen_reserve_frame: (_engine, _width, _height, _format, layout) => {
      data().setUint32(layout, 1, true);
      data().setUint32(layout + 4, 4, true);
      data().setUint32(layout + 16, 4, true);
      data().setUint32(layout + 28, 4, true);
      return 0;
    },
    _asen_process_frame: (_engine, _frame, event, emitted) => {
      data().setUint8(event, 0);
      data().setUint8(event + 2, 1);
      data().setBigInt64(event + 8, 1_000n, true);
      data().setBigUint64(event + 16, 2n, true);
      data().setInt32(event + 24, 4_000, true);
      data().setInt32(event + 28, 2_700, true);
      heap[emitted] = 1;
      return 0;
    },
    _asen_flush: (_engine, _event, emitted) => {
      heap[emitted] = 0;
      return 0;
    },
    _asen_read_events: (_engine, _offset, _events, _capacity, written, total) => {
      data().setUint32(written, 0, true);
      data().setBigUint64(total, 0n, true);
      return 0;
    },
    _asen_export_checkpoint: (_engine, _hash, _buffer, _capacity, required) => {
      data().setUint32(required, 0, true);
      return 0;
    },
    _asen_import_checkpoint: () => 0,
  };
}

const frame = {
  pixelFormat: 2,
  bitDepth: 8,
  fullRange: true,
  codedWidth: 2,
  codedHeight: 2,
  visibleX: 0,
  visibleY: 0,
  visibleWidth: 2,
  visibleHeight: 2,
  matrix: 0,
  primaries: 0,
  transfer: 0,
  presentationIndex: 2,
  timestampUs: 1_000,
  durationUs: 40_000,
  planes: [{ data: new Uint8Array([1, 2, 3, 4]), strideBytes: 4, sizeBytes: 4 }],
};

test("runtime validates ABI, writes reserved frames and normalizes events", async () => {
  const runtime = await createWasmRuntime(async () => fakeModule(), DEFAULT_SCENE_DETECTION_CONFIG);
  const reserved = runtime.reserveFrame(2, 2, 2);
  assert.deepEqual(reserved.layout, { planeCount: 1, strides: [4], sizes: [4], totalBytes: 4 });
  assert.equal(reserved.copyDestination.buffer, reserved.planes[0]?.buffer);
  assert.deepEqual(reserved.planeOffsets, [0]);
  reserved.write(frame);
  const events = runtime.processFrame(frame);
  assert.equal(events[0]?.detector, "content");
  assert.equal(events[0]?.score, 4_000);
  runtime.dispose();
  runtime.dispose();
  assert.throws(() => runtime.flush(), { code: "INTERNAL_ERROR" });
});

test("runtime rejects ABI mismatch and initialization failures with stable errors", async () => {
  await assert.rejects(() => createWasmRuntime(async () => ({ ...fakeModule(), _asen_abi_version: () => 99 }), DEFAULT_SCENE_DETECTION_CONFIG), { code: "WASM_INIT_FAILED" });
  await assert.rejects(() => createWasmRuntime(async () => { throw new Error("boom"); }, DEFAULT_SCENE_DETECTION_CONFIG), { code: "WASM_INIT_FAILED" });
});
