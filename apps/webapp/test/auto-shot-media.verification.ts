export async function runAutoShotMediaVerification() {
  return await new Promise((resolve, reject) => {
    const worker = new Worker("/test/auto-shot-media.worker.ts", { type: "module" })
    const finish = (callback: () => void) => {
      worker.terminate()
      callback()
    }
    worker.onmessage = (event) => {
      if (event.data?.ok) finish(() => resolve(event.data.result))
      else finish(() => reject(new Error(event.data?.error ?? "顺序解码验证失败")))
    }
    worker.onerror = (event) => finish(() => reject(new Error(event.message)))
    worker.postMessage({})
  })
}
