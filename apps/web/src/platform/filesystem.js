export async function pickVideoFile({ windowTarget = globalThis, documentTarget = globalThis.document } = {}) {
  if (typeof windowTarget?.showOpenFilePicker === 'function') {
    const [handle] = await windowTarget.showOpenFilePicker({
      types: [{ description: 'Video files', accept: { 'video/*': ['.mp4', '.webm', '.ogg', '.mov', '.mkv', '.avi'] } }]
    });
    return handle.getFile();
  }
  return new Promise((resolve, reject) => {
    const input = documentTarget?.createElement?.('input');
    if (!input) return reject(new Error('File picker is unavailable'));
    input.type = 'file';
    input.accept = 'video/*';
    input.onchange = () => resolve(input.files?.[0] || null);
    input.click();
  });
}
