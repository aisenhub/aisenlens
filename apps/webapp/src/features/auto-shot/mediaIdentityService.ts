import { canonicalizeAutoShotMediaIdentity, type AutoShotMediaIdentity, type AutoShotMediaIdentityDigestStrategy } from "./mediaIdentity.ts";

const FULL_DIGEST_LIMIT = 32 * 1024 * 1024;
const CHUNK_SIZE = 4 * 1024 * 1024;

export type AutoShotMediaIdentityErrorCode = "MEDIA_METADATA_UNAVAILABLE" | "MEDIA_READ_FAILED" | "MEDIA_DIGEST_CANCELLED";

export class AutoShotMediaIdentityError extends Error {
  readonly code: AutoShotMediaIdentityErrorCode;
  readonly details?: Record<string, unknown>;

  constructor(code: AutoShotMediaIdentityErrorCode, message: string, details?: Record<string, unknown>) {
    super(message);
    this.code = code;
    this.details = details;
    this.name = "AutoShotMediaIdentityError";
  }
}

export interface AutoShotMediaMetadata {
  codec: string;
  codedWidth: number;
  codedHeight: number;
  displayWidth: number;
  displayHeight: number;
  rotation: 0 | 90 | 180 | 270;
  durationUs: number;
}

export interface AutoShotMediaIdentityOptions {
  signal?: AbortSignal;
  onProgress?: (processedBytes: number, totalBytes: number) => void;
  readMetadata?: (file: File, signal?: AbortSignal) => Promise<AutoShotMediaMetadata>;
}

function ensureNotAborted(signal?: AbortSignal): void {
  if (signal?.aborted) throw new AutoShotMediaIdentityError("MEDIA_DIGEST_CANCELLED", "Media identity digest was cancelled");
}

function bytesToHex(bytes: Uint8Array): string {
  return [...bytes].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function sha256(data: ArrayBuffer | Uint8Array): Promise<string> {
  try {
    const bytes = data instanceof Uint8Array ? data : new Uint8Array(data);
    const digest = await crypto.subtle.digest("SHA-256", bytes as BufferSource);
    return bytesToHex(new Uint8Array(digest));
  } catch (error) {
    throw new AutoShotMediaIdentityError("MEDIA_READ_FAILED", "Unable to calculate SHA-256 media digest", { cause: String(error) });
  }
}

async function readSlice(file: File, start: number, end: number, signal?: AbortSignal): Promise<Uint8Array> {
  ensureNotAborted(signal);
  try {
    return new Uint8Array(await file.slice(start, end).arrayBuffer());
  } catch (error) {
    throw new AutoShotMediaIdentityError("MEDIA_READ_FAILED", "Unable to read media bytes", { start, end, cause: String(error) });
  }
}

export async function digestAutoShotContent(file: File, options: Pick<AutoShotMediaIdentityOptions, "signal" | "onProgress"> = {}): Promise<{ strategy: AutoShotMediaIdentityDigestStrategy; digest: string }> {
  const { signal, onProgress } = options;
  ensureNotAborted(signal);
  if (!Number.isSafeInteger(file.size) || file.size < 0) throw new AutoShotMediaIdentityError("MEDIA_READ_FAILED", "Media size is invalid");
  if (file.size === 0) throw new AutoShotMediaIdentityError("MEDIA_READ_FAILED", "Media file is empty");
  if (file.size <= FULL_DIGEST_LIMIT) {
    const bytes = await readSlice(file, 0, file.size, signal);
    onProgress?.(file.size, file.size);
    return { strategy: "sha256-file-v1", digest: await sha256(bytes) };
  }

  const blocks: Array<[number, number, string]> = [];
  for (let offset = 0; offset < file.size; offset += CHUNK_SIZE) {
    const end = Math.min(offset + CHUNK_SIZE, file.size);
    const bytes = await readSlice(file, offset, end, signal);
    if (bytes.byteLength !== end - offset || bytes.byteLength === 0) {
      throw new AutoShotMediaIdentityError("MEDIA_READ_FAILED", "Media chunk is incomplete", { offset, expected: end - offset, actual: bytes.byteLength });
    }
    blocks.push([offset, bytes.byteLength, await sha256(bytes)]);
    onProgress?.(end, file.size);
  }
  const manifest = JSON.stringify(["aisenlens-content-digest", 1, "sha256-chunk-manifest-4m-v1", file.size, CHUNK_SIZE, blocks]);
  return { strategy: "sha256-chunk-manifest-4m-v1", digest: await sha256(new TextEncoder().encode(manifest)) };
}

async function readMediabunnyMetadata(file: File, signal?: AbortSignal): Promise<AutoShotMediaMetadata> {
  ensureNotAborted(signal);
  try {
    const { ALL_FORMATS, BlobSource, Input } = await import("mediabunny");
    const input = new Input({ source: new BlobSource(file), formats: ALL_FORMATS });
    try {
      const track = await input.getPrimaryVideoTrack();
      const duration = await input.computeDuration();
      if (!track) throw new Error("No primary video track");
      const codec = await track.getCodecParameterString();
      if (!codec || !codec.trim()) throw new Error("Video codec parameter string is unavailable");
      const rotation = track.rotation;
      if (![0, 90, 180, 270].includes(rotation)) throw new Error("Unsupported video rotation");
      const metadata: AutoShotMediaMetadata = {
        codec,
        codedWidth: track.codedWidth,
        codedHeight: track.codedHeight,
        displayWidth: track.displayWidth,
        displayHeight: track.displayHeight,
        rotation: rotation as AutoShotMediaMetadata["rotation"],
        durationUs: Math.round(duration * 1_000_000),
      };
      if (![metadata.codedWidth, metadata.codedHeight, metadata.displayWidth, metadata.displayHeight].every((value) => Number.isSafeInteger(value) && value > 0) || !Number.isSafeInteger(metadata.durationUs) || metadata.durationUs < 0) {
        throw new Error("Video track metadata is incomplete");
      }
      return metadata;
    } finally {
      input.dispose();
    }
  } catch (error) {
    if (error instanceof AutoShotMediaIdentityError) throw error;
    throw new AutoShotMediaIdentityError("MEDIA_METADATA_UNAVAILABLE", "无法读取视频轨道的完整媒体身份信息", { cause: String(error) });
  }
}

export async function createAutoShotMediaIdentity(file: File, options: AutoShotMediaIdentityOptions = {}): Promise<AutoShotMediaIdentity> {
  const metadata = await (options.readMetadata ?? readMediabunnyMetadata)(file, options.signal);
  const content = await digestAutoShotContent(file, options);
  const unsignedIdentity = {
    identitySchema: "aisenlens-auto-shot-media-identity" as const,
    schemaVersion: 1 as const,
    contentDigestStrategy: content.strategy,
    contentDigest: content.digest,
    size: file.size,
    codec: metadata.codec,
    codedWidth: metadata.codedWidth,
    codedHeight: metadata.codedHeight,
    displayWidth: metadata.displayWidth,
    displayHeight: metadata.displayHeight,
    rotation: metadata.rotation,
    durationUs: metadata.durationUs,
    mediaIdentityDigest: "0".repeat(64),
  } satisfies AutoShotMediaIdentity;
  const mediaIdentityDigest = await sha256(new TextEncoder().encode(canonicalizeAutoShotMediaIdentity(unsignedIdentity)));
  return { ...unsignedIdentity, mediaIdentityDigest };
}
