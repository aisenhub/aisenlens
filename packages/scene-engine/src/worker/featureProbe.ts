/** Minimal WebAssembly SIMD module used for one-time capability detection. */
const SIMD_PROBE = Uint8Array.from([
  0x00, 0x61, 0x73, 0x6d, 0x01, 0x00, 0x00, 0x00,
  0x01, 0x05, 0x01, 0x60, 0x00, 0x01, 0x7b,
  0x03, 0x02, 0x01, 0x00,
  0x0a, 0x16, 0x01, 0x14, 0x00, 0xfd, 0x0c,
  ...Array(16).fill(0), 0x0b,
]);

export function supportsWasmSimd(validate: (bytes: BufferSource) => boolean = WebAssembly.validate): boolean {
  try {
    return validate(SIMD_PROBE);
  } catch {
    return false;
  }
}

export type WasmBackend = "wasm-baseline" | "wasm-simd";

/** Select once per worker/job boundary; callers must keep the returned backend fixed. */
export function selectWasmBackend(options: { force?: WasmBackend; supportsSimd?: boolean; preferSimd?: boolean } = {}): WasmBackend {
  if (options.force) return options.force;
  const supportsSimd = options.supportsSimd ?? supportsWasmSimd();
  return supportsSimd && options.preferSimd !== false ? "wasm-simd" : "wasm-baseline";
}

/** Creates a worker-scoped selector; the probe runs at most once for its lifetime. */
export function createWasmBackendSelector(options: { force?: WasmBackend; validate?: (bytes: BufferSource) => boolean; preferSimd?: boolean } = {}): () => WasmBackend {
  let selected: WasmBackend | undefined;
  return () => {
    if (!selected) selected = selectWasmBackend({ force: options.force, preferSimd: options.preferSimd, supportsSimd: options.force ? undefined : supportsWasmSimd(options.validate) });
    return selected;
  };
}

export function simdProbeBytes(): Uint8Array {
  return SIMD_PROBE.slice();
}
