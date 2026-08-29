import type { AutoShotPresetRegistry } from "./types";

/** Production stays empty until a holdout-backed promotion report is committed. */
export const productionPresetRegistry: AutoShotPresetRegistry = Object.freeze({}) as AutoShotPresetRegistry;
