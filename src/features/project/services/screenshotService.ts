import { getCompositionOverlayScreenshotSignature, type CompositionOverlaySettings } from "../../composition-overlay/types";
import { decodeVideoFrameCanvas } from "../../video/services/frameThumbnailService";
import { renderVideoOverlayCanvas } from "../../video/services/videoOverlayCanvasRenderer";
import type { ScreenshotRecord } from "../types";
import projectRepository from "./projectRepository";

function canvasBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error("无法编码当前视频画面。"));
    }, "image/jpeg", 0.92);
  });
}

async function saveCanvasScreenshot(projectId: string, frame: number, canvas: HTMLCanvasElement, compositionOverlay?: CompositionOverlaySettings): Promise<ScreenshotRecord> {
  const context = canvas.getContext("2d");
  if (!context) throw new Error("当前浏览器无法创建截图画布。");
  renderVideoOverlayCanvas(context, {
    frame,
    width: canvas.width,
    height: canvas.height,
    compositionOverlay: compositionOverlay?.enabled && compositionOverlay.includeInScreenshots ? compositionOverlay : null,
  });
  const blob = await canvasBlob(canvas);
  const screenshot: ScreenshotRecord = { id: crypto.randomUUID(), projectId, frame, capturedAt: new Date().toISOString(), width: canvas.width, height: canvas.height, mimeType: "image/jpeg", size: blob.size, compositionOverlayIncluded: Boolean(compositionOverlay?.enabled && compositionOverlay.includeInScreenshots), compositionOverlaySignature: compositionOverlay ? getCompositionOverlayScreenshotSignature(compositionOverlay) : "none" };
  await projectRepository.saveScreenshot(screenshot, blob);
  return screenshot;
}

export async function captureVideoFrameScreenshot({ projectId, sourceUrl, frame, frameRate, durationSeconds, compositionOverlay }: { projectId: string; sourceUrl: string; frame: number; frameRate: number; durationSeconds: number; compositionOverlay?: CompositionOverlaySettings }): Promise<ScreenshotRecord> {
  const canvas = await decodeVideoFrameCanvas({ sourceUrl, frame, frameRate, durationSeconds });
  return saveCanvasScreenshot(projectId, frame, canvas, compositionOverlay);
}

export async function loadScreenshotUrl(screenshotId: string | null): Promise<string | null> {
  if (!screenshotId) return null;
  const resource = await projectRepository.getScreenshot(screenshotId);
  return resource ? URL.createObjectURL(resource.blob) : null;
}
