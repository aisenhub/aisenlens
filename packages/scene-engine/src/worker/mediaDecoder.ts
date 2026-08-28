import { ALL_FORMATS, BlobSource, Input, VideoSampleSink, type VideoSample, type VideoSamplePixelFormat } from "mediabunny";
import { sceneEngineError } from "../api/errors.js";
import type { SceneEngineCheckpoint } from "../api/types.js";
import type { WasmFrameBuffer, WasmFrameInput } from "./wasmRuntime.js";

export interface MediaDecoder {
  readonly durationUs: number;
  readonly codedWidth: number;
  readonly codedHeight: number;
  readonly pixelFormat: number;
  readonly stats: MediaDecoderStats;
  frames(checkpoint?: Pick<SceneEngineCheckpoint["resumeAfter"], "timestampUs" | "timestampOrdinal">, target?: WasmFrameBuffer): AsyncGenerator<WasmFrameInput, void, unknown>;
  dispose(): void;
}

export interface MediaDecoderStats {
  openedSamples: number;
  closedSamples: number;
  submittedFrames: number;
  skippedFrames: number;
}

const pixelFormats: Record<Exclude<VideoSamplePixelFormat, "I420P10" | "I420P12" | "I420A" | "I420AP10" | "I420AP12" | "I422" | "I422P10" | "I422P12" | "I422A" | "I422AP10" | "I422AP12" | "I444" | "I444P10" | "I444P12" | "I444A" | "I444AP10" | "I444AP12" | "BGRA" | "BGRX">, number> = {
  I420: 0,
  NV12: 1,
  RGBA: 3,
  RGBX: 2,
};

function requiredEnum(value: string | null, path: string, map: Record<string, number>): number {
  const result = value === null ? undefined : map[value];
  if (result === undefined) throw sceneEngineError("DECODE_FAILED", `${path} metadata is unavailable or unsupported`, { path, value });
  return result;
}

function pixelFormatCode(format: VideoSamplePixelFormat | null): number {
  if (!format || !(format in pixelFormats)) throw sceneEngineError("DECODE_FAILED", "Decoded sample pixel format is unavailable or unsupported", { format });
  return pixelFormats[format as keyof typeof pixelFormats];
}

function planeSlices(sample: VideoSample, format: VideoSamplePixelFormat, target?: WasmFrameBuffer) {
  const allocationSize = sample.allocationSize();
  const destination = target?.copyDestination ?? new Uint8Array(allocationSize);
  if (destination.byteLength < allocationSize) throw sceneEngineError("DECODE_FAILED", "Reserved WASM frame buffer is smaller than decoded sample", { allocationSize, destinationSize: destination.byteLength });
  return sample.copyTo(destination).then((layouts) => {
    if (target && layouts.length !== target.planes.length) throw sceneEngineError("DECODE_FAILED", "Decoded sample plane count does not match the reserved WASM frame buffer", { decodedPlaneCount: layouts.length, reservedPlaneCount: target.planes.length });
    const planes = layouts.map((layout, index) => {
      const offset = layout.offset;
      const end = index + 1 < layouts.length ? layouts[index + 1].offset : allocationSize;
      if (target && (index >= target.planes.length || target.planeOffsets[index] !== offset || target.planes[index].byteLength < end - offset)) {
        throw sceneEngineError("DECODE_FAILED", "Decoded sample layout does not match the reserved WASM frame buffer", { index, offset, expectedOffset: target?.planeOffsets[index], size: end - offset, expectedSize: target?.planes[index]?.byteLength });
      }
      return { data: destination.subarray(offset, end), strideBytes: layout.stride, sizeBytes: end - offset };
    });
    return { planes, format };
  });
}

function metadata(sample: VideoSample) {
  const color = sample.colorSpace;
  return {
    matrix: requiredEnum(color.matrix, "matrix", { "smpte170m": 1, bt709: 2, "bt2020-ncl": 3 }),
    primaries: requiredEnum(color.primaries, "primaries", { "smpte170m": 1, bt709: 2, "bt2020": 3 }),
    transfer: requiredEnum(color.transfer, "transfer", { "smpte170m": 1, bt709: 2, "iec61966-2-1": 2, pq: 3, hlg: 4 }),
    fullRange: color.fullRange ?? false,
  };
}

export async function openMediaDecoder(source: Blob): Promise<MediaDecoder> {
  const input = new Input({ source: new BlobSource(source), formats: ALL_FORMATS });
  try {
    const track = await input.getPrimaryVideoTrack();
    if (!track) throw sceneEngineError("DECODE_FAILED", "Media has no primary video track");
    const durationUs = Math.max(0, Math.round((await input.computeDuration()) * 1_000_000));
    // Decode one sample up front to establish a stable WASM reservation layout.
    // The sample is immediately closed; the real iterator starts from the
    // beginning again so presentation ordinals remain absolute and deterministic.
    const probeSink = new VideoSampleSink(track);
    let firstSample: VideoSample | undefined;
    try {
      for await (const sample of probeSink.samples()) {
        firstSample = sample;
        break;
      }
      if (!firstSample) throw sceneEngineError("DECODE_FAILED", "Media video track yielded no decodable samples");
      const pixelFormat = pixelFormatCode(firstSample.format);
      return new MediabunnyDecoder(input, track, durationUs, pixelFormat);
    } finally {
      if (firstSample) firstSample.close();
    }
  } catch (error) {
    input.dispose();
    if (error instanceof Error && "code" in error) throw error;
    throw sceneEngineError("DECODE_FAILED", "Unable to open media for sequential decoding", { cause: error instanceof Error ? error.message : String(error) });
  }
}

class MediabunnyDecoder implements MediaDecoder {
  readonly codedWidth: number;
  readonly codedHeight: number;
  readonly stats: MediaDecoderStats = { openedSamples: 0, closedSamples: 0, submittedFrames: 0, skippedFrames: 0 };
  constructor(private readonly input: Input, private readonly track: NonNullable<Awaited<ReturnType<Input["getPrimaryVideoTrack"]>>>, readonly durationUs: number, readonly pixelFormat: number) {
    this.codedWidth = track.codedWidth;
    this.codedHeight = track.codedHeight;
  }

  async *frames(checkpoint?: Pick<SceneEngineCheckpoint["resumeAfter"], "timestampUs" | "timestampOrdinal">, target?: WasmFrameBuffer): AsyncGenerator<WasmFrameInput> {
    const sink = new VideoSampleSink(this.track);
    let ordinal = 0;
    // Start from the beginning so ordinal remains absolute and duplicate PTS values are deterministic.
    // Keyframe warm-up can be introduced by the Worker once the demuxer exposes an absolute ordinal anchor.
    for await (const sample of sink.samples()) {
      this.stats.openedSamples += 1;
      try {
        if (checkpoint && (sample.microsecondTimestamp < checkpoint.timestampUs || (sample.microsecondTimestamp === checkpoint.timestampUs && ordinal <= checkpoint.timestampOrdinal))) {
          this.stats.skippedFrames += 1;
          ordinal += 1;
          continue;
        }
        const format = pixelFormatCode(sample.format);
        const copied = await planeSlices(sample, sample.format as VideoSamplePixelFormat, target);
        const color = metadata(sample);
        this.stats.submittedFrames += 1;
        yield {
          pixelFormat: format,
          bitDepth: 8,
          fullRange: color.fullRange,
          codedWidth: sample.codedWidth,
          codedHeight: sample.codedHeight,
          visibleX: 0,
          visibleY: 0,
          visibleWidth: sample.codedWidth,
          visibleHeight: sample.codedHeight,
          matrix: color.matrix,
          primaries: color.primaries,
          transfer: color.transfer,
          rotation: sample.rotation,
          presentationIndex: ordinal,
          timestampUs: sample.microsecondTimestamp,
          durationUs: sample.microsecondDuration,
          planes: copied.planes,
        };
        ordinal += 1;
      } finally {
        sample.close();
        this.stats.closedSamples += 1;
      }
    }
  }

  dispose() {
    this.input.dispose();
  }
}
