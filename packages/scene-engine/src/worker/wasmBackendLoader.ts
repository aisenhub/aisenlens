import type { WasmBackend } from "./featureProbe.js";

export interface WasmBackendLoaderOptions<TModule> {
  selectBackend: () => WasmBackend;
  loadModule: (backend: WasmBackend) => Promise<TModule>;
  versionForBackend?: (backend: WasmBackend) => string;
}

export interface WasmBackendSelection {
  backend: WasmBackend;
  version: string;
}

/**
 * Loads one fixed WASM backend per worker lifetime. SIMD may fall back only
 * while initialization is still pending; a running task never changes backend.
 */
export function createWasmBackendLoader<TModule>(options: WasmBackendLoaderOptions<TModule>) {
  let selectedBackend = options.selectBackend();
  let initialized = false;
  let selection: WasmBackendSelection | undefined;
  const modulePromises = new Map<WasmBackend, Promise<TModule>>();

  const versionForBackend = options.versionForBackend ?? ((backend) => backend === "wasm-simd" ? "wasm-media-simd" : "wasm-media");

  function moduleFor(backend: WasmBackend): Promise<TModule> {
    const existing = modulePromises.get(backend);
    if (existing) return existing;
    const promise = options.loadModule(backend);
    modulePromises.set(backend, promise);
    return promise;
  }

  async function initialize(): Promise<WasmBackendSelection> {
    if (selection) return selection;
    try {
      await moduleFor(selectedBackend);
    } catch (error) {
      if (selectedBackend !== "wasm-simd") throw error;
      selectedBackend = "wasm-baseline";
      await moduleFor(selectedBackend);
    }
    initialized = true;
    selection = { backend: selectedBackend, version: versionForBackend(selectedBackend) };
    return selection;
  }

  async function module(): Promise<TModule> {
    if (!initialized) await initialize();
    return moduleFor(selectedBackend);
  }

  function reset(): void {
    selectedBackend = options.selectBackend();
    initialized = false;
    selection = undefined;
    modulePromises.clear();
  }

  return { initialize, module, moduleFor, reset, get backend() { return selectedBackend; } };
}
