import { openMediaDecoder } from "../../../packages/scene-engine/src/worker/mediaDecoder"

self.addEventListener("message", async () => {
  try {
    const response = await fetch("/test/test.mov")
    if (!response.ok) throw new Error(`无法读取顺序解码素材：${response.status}`)
    const decoder = await openMediaDecoder(await response.blob())
    const frames: Array<{ timestampUs: number; durationUs: number; presentationIndex: number; rotation?: number; pixelFormat: number; planeCount: number }> = []
    try {
      for await (const frame of decoder.frames()) {
        frames.push({
          timestampUs: frame.timestampUs,
          durationUs: frame.durationUs,
          presentationIndex: frame.presentationIndex,
          rotation: frame.rotation,
          pixelFormat: frame.pixelFormat,
          planeCount: frame.planes.length,
        })
        if (frames.length >= 12) break
      }
      const timestampsMonotonic = frames.every((frame, index) => index === 0 || frame.timestampUs >= frames[index - 1].timestampUs)
      self.postMessage({
        ok: true,
        result: {
          durationUs: decoder.durationUs,
          codedWidth: decoder.codedWidth,
          codedHeight: decoder.codedHeight,
          frames,
          timestampsMonotonic,
          stats: { ...decoder.stats },
        },
      })
    } finally {
      decoder.dispose()
    }
  } catch (error) {
    self.postMessage({ ok: false, error: error instanceof Error ? error.message : String(error) })
  }
})
