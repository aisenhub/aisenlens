import { sceneEngineError } from "../api/errors.js";
import type { WasmFrameBuffer, WasmRuntime } from "./wasmRuntime.js";

/** First-generation pool: one runtime-owned buffer, reused until its layout changes. */
export class SingleFrameBufferPool {
  private current: { key: string; buffer: WasmFrameBuffer } | null = null;
  private released = false;

  constructor(private readonly runtime: WasmRuntime) {}

  acquire(width: number, height: number, pixelFormat: number): WasmFrameBuffer {
    if (this.released) throw sceneEngineError("INTERNAL_ERROR", "Frame buffer pool has been disposed");
    const key = `${width}x${height}:${pixelFormat}`;
    if (!this.current || this.current.key !== key) this.current = { key, buffer: this.runtime.reserveFrame(width, height, pixelFormat) };
    return this.current.buffer;
  }

  release(): void {
    if (this.released) return;
    this.current = null;
    this.released = true;
  }
}
