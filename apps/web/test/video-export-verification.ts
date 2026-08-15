import { ALL_FORMATS, BlobSource, Input } from "mediabunny"
import projectRepository from "../src/features/project/services/projectRepository"
import {
  getVideoExportCapabilities,
  startVideoExport,
} from "../src/features/export/services/videoExportService"
import type { VideoExportWriteChunk } from "../src/features/export/services/videoExportProtocol"

function createTestAudioBlob(durationSeconds: number, sampleRate = 48_000): Blob {
  const frameCount = Math.max(1, Math.round(durationSeconds * sampleRate))
  const buffer = new ArrayBuffer(44 + frameCount * 2)
  const view = new DataView(buffer)
  const writeText = (offset: number, value: string) => {
    for (let index = 0; index < value.length; index += 1) {
      view.setUint8(offset + index, value.charCodeAt(index))
    }
  }
  writeText(0, "RIFF")
  view.setUint32(4, 36 + frameCount * 2, true)
  writeText(8, "WAVE")
  writeText(12, "fmt ")
  view.setUint32(16, 16, true)
  view.setUint16(20, 1, true)
  view.setUint16(22, 1, true)
  view.setUint32(24, sampleRate, true)
  view.setUint32(28, sampleRate * 2, true)
  view.setUint16(32, 2, true)
  view.setUint16(34, 16, true)
  writeText(36, "data")
  view.setUint32(40, frameCount * 2, true)
  for (let frame = 0; frame < frameCount; frame += 1) {
    const sample = Math.round(Math.sin((frame / sampleRate) * Math.PI * 2 * 440) * 0.2 * 32_767)
    view.setInt16(44 + frame * 2, sample, true)
  }
  return new Blob([buffer], { type: "audio/wav" })
}

async function inspectExport(blob: Blob) {
  const output = new Input({ source: new BlobSource(blob), formats: ALL_FORMATS })
  try {
    const [videoTrack, audioTrack, duration] = await Promise.all([
      output.getPrimaryVideoTrack(),
      output.getPrimaryAudioTrack(),
      output.computeDuration(),
    ])
    return {
      width: videoTrack?.displayWidth ?? null,
      height: videoTrack?.displayHeight ?? null,
      hasAudio: audioTrack !== null,
      duration,
    }
  } finally {
    output.dispose()
  }
}

async function collectExportStream(readable: ReadableStream<VideoExportWriteChunk>): Promise<ArrayBuffer> {
  const reader = readable.getReader()
  const chunks: VideoExportWriteChunk[] = []
  let length = 0
  try {
    while (true) {
      const next = await reader.read()
      if (next.done) break
      const chunk = next.value
      chunks.push({ ...chunk, data: chunk.data.slice() })
      length = Math.max(length, chunk.position + chunk.data.byteLength)
    }
  } finally {
    reader.releaseLock()
  }
  const output = new Uint8Array(length)
  for (const chunk of chunks) output.set(chunk.data, chunk.position)
  return output.buffer
}

export async function runVideoExportBrowserVerification() {
  const mediaResponse = await fetch("/test/test.mov")
  if (!mediaResponse.ok) throw new Error("无法读取导出测试视频。")
  const source = await mediaResponse.blob()
  const now = new Date().toISOString()
  const frameRate = 30
  const durationFrames = 3
  const durationSeconds = durationFrames / frameRate
  let project = await projectRepository.createProject({ title: "视频导出集成测试" })
  const videoAsset = {
    id: crypto.randomUUID(),
    projectId: project.id,
    kind: "video" as const,
    origin: "imported" as const,
    name: "test.mov",
    status: "linked" as const,
    source: {
      name: "test.mov",
      size: source.size,
      lastModified: Date.now(),
      mimeType: "video/quicktime",
    },
    metadata: {
      durationSeconds,
      durationFrames,
      frameRate,
      width: 320,
      height: 180,
      hasAudio: false,
      audioChannelCount: null,
      audioSampleRate: null,
    },
    linkedAt: now,
    relinkedAt: null,
    createdAt: now,
    updatedAt: now,
  }
  const audioBlob = createTestAudioBlob(durationSeconds)
  const audioAsset = {
    id: crypto.randomUUID(),
    projectId: project.id,
    kind: "audio" as const,
    origin: "recorded" as const,
    name: "verification-tone.wav",
    status: "linked" as const,
    source: {
      name: "verification-tone.wav",
      size: audioBlob.size,
      lastModified: Date.now(),
      mimeType: "audio/wav",
    },
    metadata: {
      durationSeconds,
      durationFrames: null,
      frameRate: null,
      width: null,
      height: null,
      hasAudio: true,
      audioChannelCount: 1,
      audioSampleRate: 48_000,
    },
    linkedAt: now,
    relinkedAt: null,
    createdAt: now,
    updatedAt: now,
  }
  project = await projectRepository.updateProject({
    ...project,
    primaryVideoAssetId: videoAsset.id,
    mediaAssets: [videoAsset, audioAsset],
    audioTracks: [
      {
        id: crypto.randomUUID(),
        projectId: project.id,
        name: "验证音轨",
        order: 0,
        muted: false,
        gainDb: 0,
        clips: [
          {
            id: crypto.randomUUID(),
            assetId: audioAsset.id,
            startFrame: 0,
            inFrame: 0,
            durationFrames,
            gainDb: 0,
            muted: false,
            fadeInFrames: 1,
            fadeOutFrames: 1,
          },
        ],
      },
    ],
    compositionOverlay: {
      ...project.compositionOverlay,
      enabled: true,
      guide: "thirds",
    },
    contentOverlay: {
      ...project.contentOverlay,
      enabled: true,
      showDescription: true,
      showAnalysis: true,
      showDuration: true,
    },
  })
  await Promise.all([
    projectRepository.saveMediaAssetBlob(videoAsset.id, source),
    projectRepository.saveMediaAssetBlob(audioAsset.id, audioBlob),
  ])
  await projectRepository.replaceProjectShots(project.id, [
    {
      id: crypto.randomUUID(),
      projectId: project.id,
      order: 0,
      startFrame: 0,
      endFrame: durationFrames - 1,
      status: "confirmed",
      detection: { runId: null, kind: "manual", confidence: null },
      primaryScreenshotId: null,
      screenshotIds: [],
      firstFrameScreenshotId: null,
      lastFrameScreenshotId: null,
      analysisFields: {},
      description: "用于验证分析信息图层。",
      notes: "用于验证画面分析图层。",
      createdAt: now,
      updatedAt: now,
    },
  ])

  const capabilities = (await getVideoExportCapabilities(320, 180)).filter(
    (item) => item.supported,
  )
  if (!capabilities.length) throw new Error("当前浏览器没有可用的视频编码器。")
  const exports = []
  for (const capability of capabilities) {
    const includeAudio = capability.audioSupported
    const progress: Array<{ phase: string; completedFrames: number }> = []
    const exportJob = startVideoExport({
      project,
      settings: {
        format: capability.format,
        width: 320,
        height: 180,
        frameRate,
        bitrate: 1_000_000,
        includeAudio,
        includeOriginalAudio: false,
        includeContentOverlay: true,
        includeCompositionOverlay: true,
      },
      onProgress: (entry) => progress.push(entry),
    })
    const exported = await exportJob.result
    if (!exported.blob) throw new Error("Blob 下载回退没有生成文件。")
    const stream = new TransformStream<VideoExportWriteChunk, VideoExportWriteChunk>()
    const streamedBytes = collectExportStream(stream.readable)
    const streamedJob = startVideoExport({
      project,
      settings: {
        format: capability.format,
        width: 320,
        height: 180,
        frameRate,
        bitrate: 1_000_000,
        includeAudio,
        includeOriginalAudio: false,
        includeContentOverlay: true,
        includeCompositionOverlay: true,
      },
      writable: stream.writable,
    })
    const streamed = await streamedJob.result
    const streamedBlob = new Blob([await streamedBytes], { type: streamed.mimeType })
    exports.push({
      format: capability.format,
      audioSupported: capability.audioSupported,
      mimeType: exported.mimeType,
      size: exported.blob.size,
      progress,
      ...(await inspectExport(exported.blob)),
      streamed: {
        streamed: streamed.streamed,
        hasBlob: streamed.blob !== null,
        size: streamedBlob.size,
        ...(await inspectExport(streamedBlob)),
      },
    })
  }

  const cancellationProject = {
    ...project,
    mediaAssets: project.mediaAssets.map((asset) =>
      asset.id === videoAsset.id
        ? {
            ...asset,
            metadata: asset.metadata
              ? { ...asset.metadata, durationSeconds: 3, durationFrames: 90 }
              : null,
          }
        : asset,
    ),
  }
  let cancellationJob: ReturnType<typeof startVideoExport> | null = null
  const cancellationProgress: Array<{ phase: string; completedFrames: number }> = []
  cancellationJob = startVideoExport({
    project: cancellationProject,
    settings: {
      format: capabilities[0].format,
      width: 320,
      height: 180,
      frameRate,
      bitrate: 1_000_000,
      includeAudio: false,
      includeOriginalAudio: false,
      includeContentOverlay: false,
      includeCompositionOverlay: false,
    },
    onProgress: (entry) => {
      cancellationProgress.push(entry)
      if (entry.phase === "encoding-video" && entry.completedFrames === 1) {
        cancellationJob?.cancel()
      }
    },
  })
  let cancellationMessage = ""
  try {
    await cancellationJob.result
  } catch (error) {
    cancellationMessage = error instanceof Error ? error.message : String(error)
  }

  return { capabilities, exports, cancellationProgress, cancellationMessage }
}
