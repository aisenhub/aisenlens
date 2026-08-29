import { openMediaDecoder } from "../../../packages/scene-engine/src/worker/mediaDecoder"

self.addEventListener("message", async () => {
  try {
    const response = await fetch("/test/test.mov")
    if (!response.ok) throw new Error(`无法读取顺序解码素材：${response.status}`)
    const decoder = await openMediaDecoder(await response.blob())
    const firstFrames: Array<{ timestampUs: number; durationUs: number; presentationIndex: number; rotation?: number; pixelFormat: number; planeCount: number }> = []
    let lastFrame: { timestampUs: number; durationUs: number; presentationIndex: number; rotation?: number; pixelFormat: number; planeCount: number } | null = null
    let frameCount = 0
    let timestampsMonotonic = true
    let previousTimestampUs: number | null = null
    try {
      for await (const frame of decoder.frames()) {
        const summary = {
          timestampUs: frame.timestampUs,
          durationUs: frame.durationUs,
          presentationIndex: frame.presentationIndex,
          rotation: frame.rotation,
          pixelFormat: frame.pixelFormat,
          planeCount: frame.planes.length,
        }
        if (firstFrames.length < 12) firstFrames.push(summary)
        if (previousTimestampUs !== null && summary.timestampUs < previousTimestampUs) timestampsMonotonic = false
        previousTimestampUs = summary.timestampUs
        lastFrame = summary
        frameCount += 1
      }
      self.postMessage({
        ok: true,
        result: {
          durationUs: decoder.durationUs,
          codedWidth: decoder.codedWidth,
          codedHeight: decoder.codedHeight,
          frameCount,
          firstFrames,
          lastFrame,
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
