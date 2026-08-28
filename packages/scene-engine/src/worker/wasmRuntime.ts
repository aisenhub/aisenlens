import { sceneEngineError } from "../api/errors.js";
import type { SceneEvent } from "../api/types.js";
import type { SceneDetectionConfig } from "../api/types.js";

export const ASEN_ABI_VERSION = 1;

export interface WasmAbiModule {
  _asen_abi_version(): number;
  _asen_create(config: number, outEngine: number): number;
  _asen_destroy(engine: number): number;
  _asen_reserve_frame(engine: number, width: number, height: number, pixelFormat: number, layout: number): number;
  _asen_process_frame(engine: number, frame: number, event: number, emitted: number): number;
  _asen_flush(engine: number, event: number, emitted: number): number;
  _asen_read_events(engine: number, offset: bigint, events: number, capacity: number, written: number, total: number): number;
  _asen_export_checkpoint(engine: number, configHash: bigint, buffer: number, capacity: number, required: number): number;
  _asen_import_checkpoint(engine: number, buffer: number, size: number, configHash: bigint): number;
  _malloc(size: number): number;
  _free(pointer: number): void;
  HEAPU8?: Uint8Array;
  wasmMemory?: WebAssembly.Memory;
}

export type WasmModuleFactory = () => Promise<WasmAbiModule>;

export interface WasmFramePlane {
  data: Uint8Array;
  strideBytes: number;
  sizeBytes: number;
}

export interface WasmFrameInput {
  pixelFormat: number;
  bitDepth: number;
  fullRange: boolean;
  codedWidth: number;
  codedHeight: number;
  visibleX: number;
  visibleY: number;
  visibleWidth: number;
  visibleHeight: number;
  matrix: number;
  primaries: number;
  transfer: number;
  /** Source presentation rotation in clockwise degrees. The baseline ABI currently analyzes coded pixels as-is. */
  rotation?: 0 | 90 | 180 | 270;
  presentationIndex: number;
  timestampUs: number;
  durationUs: number;
  planes: readonly WasmFramePlane[];
}

export interface WasmFrameBuffer {
  readonly layout: { planeCount: number; strides: number[]; sizes: number[]; totalBytes: number };
  readonly planes: readonly Uint8Array[];
  /** A single WASM-backed allocation suitable for VideoSample.copyTo(). */
  readonly copyDestination: Uint8Array;
  readonly planeOffsets: readonly number[];
  write(frame: WasmFrameInput): void;
}

export interface WasmRuntime {
  readonly abiVersion: number;
  reserveFrame(width: number, height: number, pixelFormat: number): WasmFrameBuffer;
  processFrame(frame: WasmFrameInput): SceneEvent[];
  flush(): SceneEvent[];
  readEvents(offset?: bigint, capacity?: number): { events: SceneEvent[]; total: bigint };
  exportCheckpoint(configHash: bigint): Uint8Array;
  importCheckpoint(checkpoint: Uint8Array, configHash: bigint): void;
  dispose(): void;
}

const CONFIG_SIZE = 64;
const FRAME_SIZE = 96;
const LAYOUT_SIZE = 32;
const EVENT_SIZE = 72;
const POINTER_SIZE = 4;

function statusMessage(status: number): string {
  return `Scene engine ABI call failed (status ${status})`;
}

function detectorCode(kind: SceneDetectionConfig["hardCut"]["kind"]): number {
  return kind === "content" ? 1 : 2;
}

function assertSafeIndex(value: number, name: string) {
  if (!Number.isSafeInteger(value) || value < 0) throw sceneEngineError("INVALID_FRAME", `${name} must be a non-negative safe integer`);
}

export async function createWasmRuntime(factory: WasmModuleFactory, config: SceneDetectionConfig): Promise<WasmRuntime> {
  let module: WasmAbiModule;
  try {
    module = await factory();
  } catch (cause) {
    throw sceneEngineError("WASM_INIT_FAILED", "Unable to instantiate scene engine WASM", { cause: cause instanceof Error ? cause.message : String(cause) });
  }
  if (module._asen_abi_version() !== ASEN_ABI_VERSION) {
    throw sceneEngineError("WASM_INIT_FAILED", "Unsupported scene engine ABI version", { expected: ASEN_ABI_VERSION, actual: module._asen_abi_version() });
  }

  let buffer: ArrayBuffer | SharedArrayBuffer | undefined;
  let heap = module.HEAPU8;
  const refreshViews = () => {
    const memoryBuffer = module.wasmMemory?.buffer;
    if (memoryBuffer && memoryBuffer !== buffer) {
      buffer = memoryBuffer;
      heap = new Uint8Array(memoryBuffer);
    }
    if (!heap) throw sceneEngineError("WASM_INIT_FAILED", "WASM linear memory is unavailable");
    return heap;
  };
  const view = () => new DataView(refreshViews().buffer);
  const u8 = () => refreshViews();
  const alloc = (size: number) => {
    const pointer = module._malloc(size);
    if (!pointer) throw sceneEngineError("WASM_INIT_FAILED", `WASM allocation failed (${size} bytes)`);
    return pointer;
  };
  const free = (pointer: number | undefined) => {
    if (pointer) module._free(pointer);
  };
  const writeConfig = (pointer: number) => {
    const data = view();
    data.setUint32(pointer, 1, true);
    data.setUint8(pointer + 4, detectorCode(config.hardCut.kind));
    data.setUint8(pointer + 5, config.fade ? 1 : 0);
    data.setUint8(pointer + 6, config.fade?.mode === "ceiling" ? 1 : 0);
    data.setUint8(pointer + 7, config.fade?.emitFinalFade ? 1 : 0);
    data.setUint32(pointer + 8, config.analysis.maxWidth, true);
    data.setUint32(pointer + 12, 54, true);
    data.setInt32(pointer + 16, config.hardCut.kind === "content" ? config.hardCut.threshold : 2700, true);
    data.setInt32(pointer + 20, config.hardCut.weights.luma, true);
    data.setInt32(pointer + 24, config.hardCut.weights.hue, true);
    data.setInt32(pointer + 28, config.hardCut.weights.saturation, true);
    data.setBigInt64(pointer + 32, BigInt(config.minimumSceneDurationUs), true);
    data.setUint32(pointer + 40, config.hardCut.kind === "adaptive" ? config.hardCut.adaptiveThreshold : 3000, true);
    data.setUint32(pointer + 44, config.hardCut.kind === "adaptive" ? config.hardCut.windowWidth : 2, true);
    data.setInt32(pointer + 48, config.hardCut.kind === "adaptive" ? config.hardCut.minimumContentScore : 1500, true);
    data.setInt32(pointer + 52, config.fade?.threshold ?? 12, true);
    data.setInt32(pointer + 56, config.fade?.bias ?? 0, true);
  };

  const configPointer = alloc(CONFIG_SIZE);
  const enginePointerPointer = alloc(POINTER_SIZE);
  let engine = 0;
  let disposed = false;
  try {
    writeConfig(configPointer);
    const status = module._asen_create(configPointer, enginePointerPointer);
    if (status !== 0) throw sceneEngineError("INVALID_CONFIG", statusMessage(status), { status });
    engine = view().getUint32(enginePointerPointer, true);
    if (!engine) throw sceneEngineError("WASM_INIT_FAILED", "WASM returned an empty engine handle");
  } finally {
    free(configPointer);
    free(enginePointerPointer);
  }

  let framePointer = 0;
  let planePointers: number[] = [];
  let frameDataPointer = 0;
  let frameBuffer: WasmFrameBuffer | undefined;
  const ensureLive = () => {
    if (disposed) throw sceneEngineError("INTERNAL_ERROR", "Scene engine runtime has been disposed");
  };
  const readEvents = (pointer: number, count: number): SceneEvent[] => {
    const data = view();
    const events: SceneEvent[] = [];
    for (let index = 0; index < count; index += 1) {
      const base = pointer + index * EVENT_SIZE;
      const type = data.getUint8(base) === 1 ? "fade" : "hard-cut";
      const source = data.getUint8(base + 2);
      const detector = source === 2 ? "adaptive" : source === 3 ? "threshold" : "content";
      const timestampUs = Number(data.getBigInt64(base + 8, true));
      const presentationIndex = Number(data.getBigUint64(base + 16, true));
      const transitionStartUs = Number(data.getBigInt64(base + 48, true));
      const transitionEndUs = Number(data.getBigInt64(base + 56, true));
      events.push({
        kind: type,
        detector,
        timestampUs,
        presentationIndex,
        score: data.getInt32(base + 24, true),
        threshold: data.getInt32(base + 28, true),
        strength: null,
        evidence: {
          deltaLuma: data.getInt32(base + 32, true),
          deltaHue: data.getInt32(base + 36, true),
          deltaSaturation: data.getInt32(base + 40, true),
        },
        transitionRange: transitionStartUs === 0 && transitionEndUs === 0 ? null : { startUs: transitionStartUs, endUs: transitionEndUs },
      });
    }
    return events;
  };
  const readSingle = (call: (event: number, emitted: number) => number) => {
    const eventPointer = alloc(EVENT_SIZE);
    const emittedPointer = alloc(1);
    try {
      const status = call(eventPointer, emittedPointer);
      if (status !== 0) throw sceneEngineError("INVALID_FRAME", statusMessage(status), { status });
      return view().getUint8(emittedPointer) ? readEvents(eventPointer, 1) : [];
    } finally {
      free(eventPointer);
      free(emittedPointer);
    }
  };

  const runtime: WasmRuntime = {
    abiVersion: ASEN_ABI_VERSION,
    reserveFrame(width, height, pixelFormat) {
      ensureLive();
      assertSafeIndex(width, "width");
      assertSafeIndex(height, "height");
      const layoutPointer = alloc(LAYOUT_SIZE);
      try {
        const status = module._asen_reserve_frame(engine, width, height, pixelFormat, layoutPointer);
        if (status !== 0) throw sceneEngineError("INVALID_FRAME", statusMessage(status), { status });
        const data = view();
        const planeCount = data.getUint32(layoutPointer, true);
        const strides = [0, 1, 2].slice(0, planeCount).map((index) => data.getUint32(layoutPointer + 4 + index * 4, true));
        const sizes = [0, 1, 2].slice(0, planeCount).map((index) => data.getUint32(layoutPointer + 16 + index * 4, true));
        const totalBytes = data.getUint32(layoutPointer + 28, true);
        if (frameDataPointer !== 0) free(frameDataPointer);
        free(framePointer);
        const offsets = sizes.map((_, index) => sizes.slice(0, index).reduce((sum, size) => sum + size, 0));
        frameDataPointer = alloc(totalBytes);
        planePointers = offsets.map((offset) => frameDataPointer + offset);
        framePointer = alloc(FRAME_SIZE);
        const planes = planePointers.map((pointer, index) => u8().subarray(pointer, pointer + sizes[index]));
        frameBuffer = {
          layout: { planeCount, strides, sizes, totalBytes },
          planes,
          copyDestination: u8().subarray(frameDataPointer, frameDataPointer + totalBytes),
          planeOffsets: offsets,
          write(frame) {
            if (frame.planes.length !== planeCount) throw sceneEngineError("INVALID_FRAME", "Frame plane count does not match reserved layout");
            const dataView = view();
            frame.planes.forEach((plane, index) => {
              if (plane.data.byteLength < sizes[index]) throw sceneEngineError("INVALID_FRAME", "Frame plane is smaller than reserved layout");
              const expected = planes[index];
              const sameBackingView = plane.data.buffer === expected.buffer && plane.data.byteOffset === expected.byteOffset;
              if (!sameBackingView) u8().set(plane.data.subarray(0, sizes[index]), planePointers[index]);
              const planeOffset = framePointer + 4 + index * 12;
              dataView.setUint32(planeOffset, planePointers[index], true);
              dataView.setUint32(planeOffset + 4, sizes[index], true);
              dataView.setUint32(planeOffset + 8, plane.strideBytes, true);
            });
            dataView.setUint8(framePointer, frame.pixelFormat);
            dataView.setUint8(framePointer + 1, planeCount);
            dataView.setUint8(framePointer + 2, frame.bitDepth);
            dataView.setUint8(framePointer + 3, frame.fullRange ? 1 : 0);
            dataView.setUint32(framePointer + 40, frame.codedWidth, true);
            dataView.setUint32(framePointer + 44, frame.codedHeight, true);
            dataView.setUint32(framePointer + 48, frame.visibleX, true);
            dataView.setUint32(framePointer + 52, frame.visibleY, true);
            dataView.setUint32(framePointer + 56, frame.visibleWidth, true);
            dataView.setUint32(framePointer + 60, frame.visibleHeight, true);
            dataView.setUint8(framePointer + 64, frame.matrix);
            dataView.setUint8(framePointer + 65, frame.primaries);
            dataView.setUint8(framePointer + 66, frame.transfer);
            dataView.setBigUint64(framePointer + 72, BigInt(frame.presentationIndex), true);
            dataView.setBigInt64(framePointer + 80, BigInt(frame.timestampUs), true);
            dataView.setBigInt64(framePointer + 88, BigInt(frame.durationUs), true);
          },
        };
        return frameBuffer;
      } finally {
        free(layoutPointer);
      }
    },
    processFrame(frame) {
      ensureLive();
      if (!frameBuffer) throw sceneEngineError("INVALID_FRAME", "reserveFrame must be called before processFrame");
      frameBuffer.write(frame);
      return readSingle((event, emitted) => module._asen_process_frame(engine, framePointer, event, emitted));
    },
    flush() {
      ensureLive();
      return readSingle((event, emitted) => module._asen_flush(engine, event, emitted));
    },
    readEvents(offset = 0n, capacity = 128) {
      ensureLive();
      const eventsPointer = alloc(EVENT_SIZE * capacity);
      const writtenPointer = alloc(4);
      const totalPointer = alloc(8);
      try {
        const status = module._asen_read_events(engine, offset, eventsPointer, capacity, writtenPointer, totalPointer);
        if (status !== 0) throw sceneEngineError("INTERNAL_ERROR", statusMessage(status), { status });
        const data = view();
        return { events: readEvents(eventsPointer, data.getUint32(writtenPointer, true)), total: data.getBigUint64(totalPointer, true) };
      } finally {
        free(eventsPointer);
        free(writtenPointer);
        free(totalPointer);
      }
    },
    exportCheckpoint(configHash) {
      ensureLive();
      const requiredPointer = alloc(4);
      try {
        let status = module._asen_export_checkpoint(engine, configHash, 0, 0, requiredPointer);
        if (status !== 0) throw sceneEngineError("INVALID_CHECKPOINT", statusMessage(status), { status });
        const required = view().getUint32(requiredPointer, true);
        const checkpointPointer = alloc(required);
        try {
          status = module._asen_export_checkpoint(engine, configHash, checkpointPointer, required, requiredPointer);
          if (status !== 0) throw sceneEngineError("INVALID_CHECKPOINT", statusMessage(status), { status });
          return new Uint8Array(u8().slice(checkpointPointer, checkpointPointer + required));
        } finally {
          free(checkpointPointer);
        }
      } finally {
        free(requiredPointer);
      }
    },
    importCheckpoint(checkpoint, configHash) {
      ensureLive();
      const pointer = alloc(checkpoint.byteLength);
      try {
        u8().set(checkpoint, pointer);
        const status = module._asen_import_checkpoint(engine, pointer, checkpoint.byteLength, configHash);
        if (status !== 0) throw sceneEngineError("INVALID_CHECKPOINT", statusMessage(status), { status });
      } finally {
        free(pointer);
      }
    },
    dispose() {
      if (disposed) return;
      disposed = true;
    if (frameDataPointer !== 0) free(frameDataPointer);
      planePointers = [];
      free(framePointer);
      framePointer = 0;
      if (engine) module._asen_destroy(engine);
      engine = 0;
    },
  };
  return runtime;
}
