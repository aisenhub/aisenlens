export function createRecordingOutput(chunks = [], mimeType = 'video/webm', timestamp = Date.now()) {
  const blobType = mimeType || 'video/webm';
  const blob = new Blob(chunks, { type: blobType });
  if (!blob.size) return null;
  const extension = blobType.startsWith('video/mp4') ? 'mp4' : 'webm';
  return {
    blob,
    extension,
    filename: `拉片录制-${timestamp}.${extension}`
  };
}
