import type { VideoExportFormat, VideoExportWriteChunk } from "./videoExportProtocol";

interface SaveFilePickerOptions {
  suggestedName: string;
  types: Array<{
    description: string;
    accept: Record<string, string[]>;
  }>;
}

interface SaveFileHandle {
  createWritable(): Promise<WritableStream<VideoExportWriteChunk>>;
}

interface WindowWithSaveFilePicker extends Window {
  showSaveFilePicker(options: SaveFilePickerOptions): Promise<SaveFileHandle>;
}

export type VideoExportSaveTarget =
  | { kind: "download" }
  | { kind: "cancelled" }
  | { kind: "stream"; writable: WritableStream<VideoExportWriteChunk> };

function filenameBase(title: string): string {
  return title
    .trim()
    .replace(/[\\/:*?"<>|]/g, "-")
    .replace(/\s+/g, " ")
    .slice(0, 80) || "AisenLens-分析视频";
}

export function supportsVideoExportFileStreaming(): boolean {
  return typeof window !== "undefined" && "showSaveFilePicker" in window;
}

export async function requestVideoExportSaveTarget({ title, format }: { title: string; format: VideoExportFormat }): Promise<VideoExportSaveTarget> {
  if (!supportsVideoExportFileStreaming()) return { kind: "download" };
  const extension = format === "webm" ? "webm" : "mp4";
  const mimeType = extension === "webm" ? "video/webm" : "video/mp4";
  try {
    const handle = await (window as unknown as WindowWithSaveFilePicker).showSaveFilePicker({
      suggestedName: `${filenameBase(title)}.${extension}`,
      types: [{ description: "分析视频", accept: { [mimeType]: [`.${extension}`] } }],
    });
    return { kind: "stream", writable: await handle.createWritable() };
  } catch (error) {
    if (typeof error === "object" && error !== null && "name" in error && error.name === "AbortError") {
      return { kind: "cancelled" };
    }
    throw error;
  }
}
