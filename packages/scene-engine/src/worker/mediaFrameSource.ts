import type { SceneEngineCheckpoint } from "../api/types.js";
import { openMediaDecoder, type MediaDecoder } from "./mediaDecoder.js";
import type { WorkerFrameSource } from "./scene-engine.worker.js";
import type { WasmFrameBuffer, WasmFrameInput, WasmRuntime } from "./wasmRuntime.js";

/** Worker-owned source adapter. It keeps Blob/Mediabunny out of the protocol and main thread. */
export class MediaFrameSource implements WorkerFrameSource {
  readonly durationUs: number;
  readonly codedWidth: number;
  readonly codedHeight: number;

  constructor(private readonly decoder: MediaDecoder, private readonly checkpoint?: SceneEngineCheckpoint) {
    this.durationUs = decoder.durationUs;
    this.codedWidth = decoder.codedWidth;
    this.codedHeight = decoder.codedHeight;
  }

  frames(target?: WasmFrameBuffer): AsyncIterable<WasmFrameInput> {
    return this.decoder.frames(this.checkpoint?.resumeAfter, target);
  }

  createFrameTarget(runtime: WasmRuntime): WasmFrameBuffer {
    return runtime.reserveFrame(this.codedWidth, this.codedHeight, this.decoder.pixelFormat);
  }

  dispose(): void {
    this.decoder.dispose();
  }
}

export async function createMediaFrameSource(source: Blob, checkpoint?: SceneEngineCheckpoint): Promise<MediaFrameSource> {
  return new MediaFrameSource(await openMediaDecoder(source), checkpoint);
}
