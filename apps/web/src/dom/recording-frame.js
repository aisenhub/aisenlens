import { drawImageContain } from './recording-canvas.js';

export function drawRecordingFrame(context, {
  width,
  height,
  video,
  drawTable
} = {}) {
  if (!context || !width || !height || typeof drawTable !== 'function') return;
  const videoHeight = Math.round(width * 9 / 16);
  const tableHeight = Math.max(1, height - videoHeight);
  context.fillStyle = '#F4F6F8';
  context.fillRect(0, 0, width, height);
  context.fillStyle = '#111827';
  context.fillRect(0, 0, width, videoHeight);
  if (video && video.readyState >= 2 && video.videoWidth && video.videoHeight) {
    drawImageContain(context, video, 0, 0, width, videoHeight);
  } else {
    context.fillStyle = '#CBD5E1';
    context.font = '16px system-ui,-apple-system,"Segoe UI","Microsoft YaHei",sans-serif';
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillText('视频加载中', width / 2, videoHeight / 2);
  }
  drawTable(context, 0, videoHeight, width, tableHeight);
}
