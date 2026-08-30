import type { AutoShotPresetRegistry } from "./types";
import { researchPresetRegistry } from "./researchPresetRegistry";

const PROMOTED_PRESET_IDS = ["general", "short-form"] as const;

/**
 * Current production catalog.
 *
 * Values are promoted from the frozen research version 1 definitions so the
 * engine parameters have one source of truth. Future tuning must create a new
 * preset version instead of mutating these values in place.
 */
export const productionPresetRegistry: AutoShotPresetRegistry = Object.freeze(
  Object.fromEntries(
    PROMOTED_PRESET_IDS.map((id) => {
      const preset = researchPresetRegistry[id];
      return [id, {
        ...preset,
        catalog: "production" as const,
        status: "promoted" as const,
        description: id === "general"
          ? "通用与影视叙事内容，适合多数连续镜头视频。"
          : "快节奏剪辑内容，适合镜头切换密集的短视频。",
        sourceNote: "AisenLens production version 1；基于当前人工回归测试晋升，后续调参须生成新版本。",
      }];
    }),
  ),
) as AutoShotPresetRegistry;
