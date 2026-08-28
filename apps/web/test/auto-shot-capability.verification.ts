import { ALL_FORMATS, BlobSource, Input, VideoSampleSink } from "mediabunny"

const FIXTURE_PATH = "/test/test.mov"

export async function runAutoShotCapabilityVerification() {
  const response = await fetch(FIXTURE_PATH)
  if (!response.ok) throw new Error(`无法读取能力验证素材：${response.status}`)
  const input = new Input({ source: new BlobSource(await response.blob()), formats: ALL_FORMATS })
  try {
    const track = await input.getPrimaryVideoTrack()
    if (!track) throw new Error("能力验证素材没有视频轨道。")
    const audioTracks = await input.getAudioTracks()
    const decoderConfig = await track.getDecoderConfig()
    const sink = new VideoSampleSink(track)
    const samples = []
    const errors = []
    try {
      for (const timestamp of [0, 2, 4, 6, 8]) {
        const sample = await sink.getSample(timestamp)
        if (!sample) continue
        try {
          const base = {
          requestedTimestampSeconds: timestamp,
          timestampUs: sample.microsecondTimestamp,
          durationUs: sample.microsecondDuration,
          format: sample.format,
          codedWidth: sample.codedWidth,
          codedHeight: sample.codedHeight,
          displayWidth: sample.displayWidth,
          displayHeight: sample.displayHeight,
          rotation: sample.rotation,
          colorSpace: sample.colorSpace.toJSON(),
          allocationSize: null,
          nativeCopy: "not-attempted",
          i420Copy: "not-attempted",
          rgbaCopy: "not-attempted",
        }
        if (sample.format !== null) {
          base.allocationSize = sample.allocationSize()
          const destination = new Uint8Array(base.allocationSize)
          await sample.copyTo(destination)
          base.nativeCopy = "ok"
          for (const [label, format] of [["i420Copy", "I420"], ["rgbaCopy", "RGBA"]]) {
            try {
              const size = sample.allocationSize({ format })
              await sample.copyTo(new Uint8Array(size), { format })
              base[label] = "ok"
            } catch (error) {
              base[label] = error instanceof Error ? `error:${error.message}` : "error:unknown"
            }
          }
        } else {
          base.nativeCopy = "error:format-null"
          base.i420Copy = "error:format-null"
          base.rgbaCopy = "error:format-null"
        }
          samples.push(base)
        } finally {
          sample.close()
        }
      }
    } catch (error) {
      errors.push(error instanceof Error ? error.message : String(error))
    }
    let syntheticWebmError = null
    try {
      const syntheticResponse = await fetch("/test/fixtures/auto-shot/synthetic.webm")
      const syntheticInput = new Input({ source: new BlobSource(await syntheticResponse.blob()), formats: ALL_FORMATS })
      try {
        const syntheticTrack = await syntheticInput.getPrimaryVideoTrack()
        if (!syntheticTrack) throw new Error("synthetic WebM 没有视频轨道。")
        const syntheticSample = await new VideoSampleSink(syntheticTrack).getSample(0)
        syntheticSample?.close()
      } finally {
        syntheticInput.dispose()
      }
    } catch (error) {
      syntheticWebmError = error instanceof Error ? error.message : String(error)
    }
    return {
      fixture: FIXTURE_PATH,
      track: {
        codec: track.codec,
        displayWidth: track.displayWidth,
        displayHeight: track.displayHeight,
        durationSeconds: await input.computeDuration(),
        decoderConfig: decoderConfig ? { codec: decoderConfig.codec, codedWidth: decoderConfig.codedWidth, codedHeight: decoderConfig.codedHeight, colorSpace: decoderConfig.colorSpace ?? null } : null,
        audioTrackCount: audioTracks.length,
      },
      capabilities: {
        videoDecoder: typeof VideoDecoder !== "undefined",
        videoFrame: typeof VideoFrame !== "undefined",
        offscreenCanvas: typeof OffscreenCanvas !== "undefined",
        crossOriginIsolated: globalThis.crossOriginIsolated,
      },
      samples,
      errors,
      additionalProbes: {
        syntheticWebmVideoSampleSink: syntheticWebmError === null ? "ok" : `error:${syntheticWebmError}`,
      },
    }
  } finally {
    input.dispose()
  }
}
