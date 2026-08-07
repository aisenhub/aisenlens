export function createWorkerClient(workerSource) {
  let worker = null;
  let workerUrl = '';
  let taskId = 0;
  const tasks = new Map();

  function getWorker() {
    if (worker) return worker;
    if (typeof Worker === 'undefined'
      || typeof Blob === 'undefined'
      || typeof URL === 'undefined'
      || typeof URL.createObjectURL !== 'function') return null;
    try {
      workerUrl = URL.createObjectURL(new Blob([workerSource], { type: 'application/javascript' }));
      worker = new Worker(workerUrl);
    } catch (_) {
      worker = null;
      return null;
    }
    worker.onmessage = event => {
      const task = tasks.get(event.data && event.data.id);
      if (!task) return;
      tasks.delete(event.data.id);
      if (event.data.error) task.reject(new Error(event.data.error));
      else task.resolve(event.data.result);
    };
    worker.onerror = event => {
      const error = new Error(event.message || '图像 Worker 运行失败');
      tasks.forEach(task => task.reject(error));
      tasks.clear();
      worker.terminate();
      worker = null;
    };
    return worker;
  }

  function runTask(type, payload, transfer = []) {
    const activeWorker = getWorker();
    if (!activeWorker) return Promise.reject(new Error('当前浏览器不支持 Web Worker'));
    const id = ++taskId;
    return new Promise((resolve, reject) => {
      tasks.set(id, { resolve, reject });
      try {
        activeWorker.postMessage({ id, type, payload }, transfer);
      } catch (error) {
        tasks.delete(id);
        reject(error);
      }
    });
  }

  function terminate() {
    tasks.forEach(task => task.reject(new Error('图像 Worker 已终止')));
    tasks.clear();
    if (worker) worker.terminate();
    if (workerUrl && typeof URL.revokeObjectURL === 'function') URL.revokeObjectURL(workerUrl);
    worker = null;
    workerUrl = '';
  }

  return { getWorker, runTask, terminate };
}
