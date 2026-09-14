import { ALL_FORMATS, BlobSource, Input, VideoSampleSink } from "mediabunny"

const FIXTURE_PATH = "/test/fixtures/auto-shot/synthetic.webm"
const SAMPLE_COUNT = 24
const ANALYSIS_WIDTH = 96
const ANALYSIS_HEIGHT = 54

function percentile(values: number[], fraction: number): number | null {
  if (!values.length) return null
  const ordered = [...values].sort((left, right) => left - right)
  return ordered[Math.max(0, Math.ceil(ordered.length * fraction) - 1)]
}

function summary(values: number[]) {
  return {
    count: values.length,
    totalMilliseconds: values.reduce((sum, value) => sum + value, 0),
    meanMilliseconds: values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null,
    p95Milliseconds: percentile(values, 0.95),
  }
}

function mean(values: number[]) {
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0
}

function eventIndices(signatures: Array<number[] | null>) {
  const scores = signatures.slice(1).map((signature, index) => {
    const previous = signatures[index]
    return signature && previous ? signature.reduce((sum, value, channel) => sum + Math.abs(value - (previous[channel] ?? value)), 0) : 0
  })
  const baseline = mean(scores)
  const deviation = mean(scores.map((score) => Math.abs(score - baseline)))
  const threshold = Math.max(0.05, baseline + deviation * 3)
  return scores.flatMap((score, index) => score >= threshold ? [index + 1] : [])
}

function recallFor(expected: number[], actual: number[]) {
  const used = new Set()
  return expected.length ? expected.filter((target) => actual.some((candidate, index) => !used.has(index) && Math.abs(candidate - target) <= 1 && (used.add(index), true))).length / expected.length : null
}

export async function runAutoShotPathBenchmarkVerification() {
  const response = await fetch(FIXTURE_PATH)
  if (!response.ok) throw new Error(`无法读取像素路径基准素材：${response.status}`)
  const input = new Input({ source: new BlobSource(await response.blob()), formats: ALL_FORMATS })
  try {
    const track = await input.getPrimaryVideoTrack()
    if (!track) throw new Error("像素路径基准素材没有视频轨道。")
    const durationSeconds = await input.computeDuration()
    const sink = new VideoSampleSink(track)
    const decodeTimes: number[] = []
    const nativeCopyTimes: number[] = []
    const rgbaCopyTimes: number[] = []
    const lowResolutionPreprocessTimes: number[] = []
    const nativeBytes: number[] = []
    const rgbaBytes: number[] = []
    let nativeUnsupported = 0
    let rgbaUnsupported = 0
    let lowResolutionUnsupported = 0
    const nativeSignatures: Array<number[] | null> = []
    const rgbaSignatures: Array<number[] | null> = []
    const lowResolutionSignatures: Array<number[] | null> = []
    for (let index = 0; index < SAMPLE_COUNT; index += 1) {
      const timestamp = (durationSeconds * index) / SAMPLE_COUNT
      const decodeStarted = performance.now()
      const sample = await sink.getSample(timestamp)
      decodeTimes.push(performance.now() - decodeStarted)
      if (!sample) {
        nativeSignatures.push(null)
        rgbaSignatures.push(null)
        lowResolutionSignatures.push(null)
        continue
      }
      try {
        if (sample.format === null) {
          nativeUnsupported += 1
          rgbaUnsupported += 1
          nativeSignatures.push(null)
          rgbaSignatures.push(null)
        } else {
          const nativeSize = sample.allocationSize()
          const nativeStarted = performance.now()
          const nativeData = new Uint8Array(nativeSize)
          await sample.copyTo(nativeData)
          nativeCopyTimes.push(performance.now() - nativeStarted)
          nativeBytes.push(nativeSize)
          nativeSignatures.push([mean(nativeData.subarray(0, sample.codedWidth * sample.codedHeight)) / 255])
          try {
            const rgbaSize = sample.allocationSize({ format: "RGBA" })
            const rgbaStarted = performance.now()
            const rgbaData = new Uint8Array(rgbaSize)
            await sample.copyTo(rgbaData, { format: "RGBA" })
            rgbaCopyTimes.push(performance.now() - rgbaStarted)
            rgbaBytes.push(rgbaSize)
            const channels = [0, 0, 0]
            for (let pixel = 0; pixel < rgbaData.length; pixel += 4) {
              channels[0] += rgbaData[pixel]
              channels[1] += rgbaData[pixel + 1]
              channels[2] += rgbaData[pixel + 2]
            }
            const pixelCount = Math.max(1, rgbaData.length / 4)
            rgbaSignatures.push(channels.map((value) => value / pixelCount / 255))
          } catch {
            rgbaUnsupported += 1
            rgbaSignatures.push(null)
          }
        }
        try {
          const canvas = new OffscreenCanvas(ANALYSIS_WIDTH, ANALYSIS_HEIGHT)
          const context = canvas.getContext("2d", { willReadFrequently: true })
          if (!context) throw new Error("2d context unavailable")
          const preprocessStarted = performance.now()
          sample.draw(context, 0, 0, ANALYSIS_WIDTH, ANALYSIS_HEIGHT)
          const pixels = context.getImageData(0, 0, ANALYSIS_WIDTH, ANALYSIS_HEIGHT).data
          lowResolutionPreprocessTimes.push(performance.now() - preprocessStarted)
          const channels = [0, 0, 0]
          for (let pixel = 0; pixel < pixels.length; pixel += 4) {
            channels[0] += pixels[pixel]
            channels[1] += pixels[pixel + 1]
            channels[2] += pixels[pixel + 2]
          }
          const pixelCount = Math.max(1, pixels.length / 4)
          lowResolutionSignatures.push(channels.map((value) => value / pixelCount / 255))
        } catch {
          lowResolutionUnsupported += 1
          lowResolutionSignatures.push(null)
        }
      } finally {
        sample.close()
      }
    }
    return {
      fixture: FIXTURE_PATH,
      sampleCount: SAMPLE_COUNT,
      track: { codec: track.codec, format: "NV12-or-source-reported", codedWidth: track.codedWidth, codedHeight: track.codedHeight },
      paths: {
        decode: summary(decodeTimes),
        nativePlaneCopy: { ...summary(nativeCopyTimes), meanBytes: nativeBytes.length ? nativeBytes.reduce((sum, value) => sum + value, 0) / nativeBytes.length : null, unsupported: nativeUnsupported },
        rgbaCopy: { ...summary(rgbaCopyTimes), meanBytes: rgbaBytes.length ? rgbaBytes.reduce((sum, value) => sum + value, 0) / rgbaBytes.length : null, unsupported: rgbaUnsupported },
        workerOffscreenCanvasLowResolution: { ...summary(lowResolutionPreprocessTimes), width: ANALYSIS_WIDTH, height: ANALYSIS_HEIGHT, unsupported: lowResolutionUnsupported },
      },
      accuracy: (() => {
        const expectedHardCutIndices = [Math.round((2 / durationSeconds) * SAMPLE_COUNT), Math.round((8 / durationSeconds) * SAMPLE_COUNT)]
        const baselineEvents = eventIndices(rgbaSignatures)
        const nativeEvents = eventIndices(nativeSignatures)
        const lowResolutionEvents = eventIndices(lowResolutionSignatures)
        const baselineRecall = recallFor(expectedHardCutIndices, baselineEvents)
        return {
          method: "path-level signature proxy on labelled synthetic fixture",
          expectedHardCutSampleIndices: expectedHardCutIndices,
          frameByFrameRgbaBaseline: { events: baselineEvents, recall: baselineRecall },
          nativePlaneCopy: { events: nativeEvents, recall: recallFor(expectedHardCutIndices, nativeEvents), recallDeltaAgainstRgba: baselineRecall === null ? null : recallFor(expectedHardCutIndices, nativeEvents) - baselineRecall },
          workerOffscreenCanvasLowResolution: { events: lowResolutionEvents, recall: recallFor(expectedHardCutIndices, lowResolutionEvents), recallDeltaAgainstRgba: baselineRecall === null ? null : recallFor(expectedHardCutIndices, lowResolutionEvents) - baselineRecall },
        }
      })(),
    }
  } finally {
    input.dispose()
  }
}
