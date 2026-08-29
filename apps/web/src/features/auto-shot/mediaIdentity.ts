export type AutoShotMediaIdentityDigestStrategy = "sha256-file-v1" | "sha256-chunk-manifest-4m-v1";

export interface AutoShotMediaIdentity {
  identitySchema: "aisenlens-auto-shot-media-identity";
  schemaVersion: 1;
  contentDigestStrategy: AutoShotMediaIdentityDigestStrategy;
  contentDigest: string;
  size: number;
  codec: string;
  codedWidth: number;
  codedHeight: number;
  displayWidth: number;
  displayHeight: number;
  rotation: 0 | 90 | 180 | 270;
  durationUs: number;
  mediaIdentityDigest: string;
}

const HEX_SHA256 = /^[0-9a-f]{64}$/;

function assertIdentity(identity: AutoShotMediaIdentity): void {
  if (identity.identitySchema !== "aisenlens-auto-shot-media-identity" || identity.schemaVersion !== 1) {
    throw new Error("Unsupported auto-shot media identity schema");
  }
  if (!HEX_SHA256.test(identity.contentDigest) || !HEX_SHA256.test(identity.mediaIdentityDigest)) {
    throw new Error("Auto-shot media identity digests must be lowercase SHA-256 hex");
  }
  if (!Number.isSafeInteger(identity.size) || identity.size < 0) throw new Error("Invalid media size");
  for (const [name, value] of [["codedWidth", identity.codedWidth], ["codedHeight", identity.codedHeight], ["displayWidth", identity.displayWidth], ["displayHeight", identity.displayHeight]] as const) {
    if (!Number.isSafeInteger(value) || value <= 0) throw new Error(`Invalid ${name}`);
  }
  if (!Number.isSafeInteger(identity.durationUs) || identity.durationUs < 0) throw new Error("Invalid media duration");
  if (![0, 90, 180, 270].includes(identity.rotation)) throw new Error("Invalid media rotation");
  if (!identity.codec.trim()) throw new Error("Media codec is required");
}

/** Canonical identity text excludes filenames, MIME labels, and timestamps. */
export function canonicalizeAutoShotMediaIdentity(identity: AutoShotMediaIdentity): string {
  assertIdentity(identity);
  return JSON.stringify([
    "aisenlens-auto-shot-media-identity",
    1,
    identity.size,
    identity.contentDigestStrategy,
    identity.contentDigest,
    identity.codec,
    identity.codedWidth,
    identity.codedHeight,
    identity.displayWidth,
    identity.displayHeight,
    identity.rotation,
    identity.durationUs,
  ]);
}

export function sameAutoShotMediaIdentity(left: AutoShotMediaIdentity, right: AutoShotMediaIdentity): boolean {
  return left.identitySchema === right.identitySchema
    && left.schemaVersion === right.schemaVersion
    && left.contentDigestStrategy === right.contentDigestStrategy
    && left.contentDigest === right.contentDigest
    && left.size === right.size
    && left.codec === right.codec
    && left.codedWidth === right.codedWidth
    && left.codedHeight === right.codedHeight
    && left.displayWidth === right.displayWidth
    && left.displayHeight === right.displayHeight
    && left.rotation === right.rotation
    && left.durationUs === right.durationUs
    && left.mediaIdentityDigest === right.mediaIdentityDigest;
}
