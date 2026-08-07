export function createRecordingRecorder(stream, format, videoBitsPerSecond, MediaRecorderCtor, getMimeType) {
  const mimeType = getMimeType(format);
  if (!mimeType) throw new Error(`浏览器不支持 ${String(format).toUpperCase()} 录制`);
  const recorder = new MediaRecorderCtor(stream, { mimeType, videoBitsPerSecond });
  return { recorder, mimeType: recorder.mimeType || mimeType };
}

export function startRecordingRecorder(recorder, timeslice = 250, timeout = 1500) {
  return new Promise((resolve, reject) => {
    let settled = false;
    let timeoutId = 0;
    const cleanup = () => {
      clearTimeout(timeoutId);
      recorder.removeEventListener('start', handleStart);
      recorder.removeEventListener('error', handleError);
    };
    const finish = callback => value => {
      if (settled) return;
      settled = true;
      cleanup();
      callback(value);
    };
    const handleStart = finish(resolve);
    const handleError = finish(event => reject(event.error || new Error('录制器启动失败')));
    recorder.addEventListener('start', handleStart);
    recorder.addEventListener('error', handleError);
    timeoutId = setTimeout(() => {
      if (recorder.state === 'recording') handleStart();
      else handleError({ error: new Error('录制器启动超时') });
    }, timeout);
    try {
      recorder.start(timeslice);
    } catch (error) {
      finish(reject)(error);
    }
  });
}

export function createRecordingChunkCollector() {
  const chunks = [];
  return {
    chunks,
    onData: event => {
      if (event.data && event.data.size) chunks.push(event.data);
    }
  };
}
