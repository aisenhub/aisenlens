import type { SceneEngineError, SceneEngineErrorCode } from "./types.js";

export class SceneEngineException extends Error implements SceneEngineError {
  readonly name = "SceneEngineException";

  constructor(
    readonly code: SceneEngineErrorCode,
    message: string,
    readonly details?: Readonly<Record<string, unknown>>,
  ) {
    super(message);
  }
}

export function toSceneEngineError(error: unknown): SceneEngineError {
  if (error instanceof SceneEngineException) return error;
  if (error instanceof Error) {
    return { code: "INTERNAL_ERROR", message: error.message };
  }
  return { code: "INTERNAL_ERROR", message: "Unknown scene-engine failure" };
}

export function sceneEngineError(
  code: SceneEngineErrorCode,
  message: string,
  details?: Readonly<Record<string, unknown>>,
): SceneEngineException {
  return new SceneEngineException(code, message, details);
}
