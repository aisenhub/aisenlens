import { createElement, useEffect, useRef } from "react"
import { createRoot, type Root } from "react-dom/client"
import { resolveSceneDetectionConfig } from "@aisenlens/scene-engine"
import projectRepository from "../src/features/project/services/projectRepository"
import useAutoShotTask from "../src/features/auto-shot/hooks/useAutoShotTask"
import type { AutoShotTaskStatus } from "../src/features/auto-shot/types"

const MEDIA_FINGERPRINT = {
  name: "test.mov",
  size: 0,
  lastModified: 0,
  mimeType: "video/quicktime",
}

const CONFIG = resolveSceneDetectionConfig({
  hardCut: {
    kind: "content",
    threshold: 1800,
    weights: { hue: 3333, saturation: 3333, luma: 3334 },
  },
  fade: null,
  minimumSceneDurationUs: 600_000,
  analysis: { maxWidth: 96, temporalSampling: { kind: "every-frame" } },
  diagnostics: "off",
})

type ProbeCommand = "idle" | "start" | "pause" | "resume" | "cancel"

interface ProbeState {
  projectId: string
  taskId: string | null
  status: AutoShotTaskStatus | null
  decodedFrames: number
  candidates: number
  active: boolean
  error: string | null
}

interface ProbeProps {
  projectId: string
  command: ProbeCommand
  onState: (state: ProbeState) => void
  onCommand?: (command: ProbeCommand) => void
  actionsRef?: { current: { cancel: () => Promise<unknown> } | null }
}

function HookProbe({
  projectId,
  command,
  onState,
  onCommand,
  actionsRef,
}: ProbeProps) {
  const task = useAutoShotTask({
    projectId,
    sourceUrl: "/test/test.mov",
    mediaFingerprint: MEDIA_FINGERPRINT,
    durationSeconds: 99.88,
    frameRate: 25,
    config: CONFIG,
  })
  const issuedCommand = useRef<ProbeCommand>("idle")

  useEffect(() => {
    issuedCommand.current = "idle"
  }, [projectId])

  useEffect(() => {
    onState({
      projectId,
      taskId: task.record?.id ?? null,
      status: task.record?.status ?? null,
      decodedFrames: task.record?.progress.decodedFrames ?? 0,
      candidates: task.record?.candidates.length ?? 0,
      active: task.isActive,
      error: task.error,
    })
  }, [onState, task.error, task.isActive, task.record])

  useEffect(() => {
    if (!actionsRef) return
    actionsRef.current = { cancel: task.cancel }
    return () => {
      if (actionsRef.current?.cancel === task.cancel) actionsRef.current = null
    }
  }, [actionsRef, task.cancel])

  useEffect(() => {
    if (command === "idle" || issuedCommand.current === command) return
    issuedCommand.current = command
    onCommand?.(command)
    const action =
      command === "start"
        ? task.start()
        : command === "pause"
          ? task.pause()
          : command === "resume"
            ? task.start({ resume: true })
            : task.cancel()
    void action.catch((cause) => {
      onState({
        projectId,
        taskId: task.record?.id ?? null,
        status: task.record?.status ?? null,
        decodedFrames: task.record?.progress.decodedFrames ?? 0,
        candidates: task.record?.candidates.length ?? 0,
        active: task.isActive,
        error: cause instanceof Error ? cause.message : "Hook 命令失败",
      })
    })
  }, [command, onCommand, task.cancel, task.pause, task.start])

  return null
}

function wait(milliseconds: number) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds))
}

async function waitFor(
  check: () => boolean,
  message: string,
  timeout = 300_000,
) {
  const deadline = Date.now() + timeout
  while (Date.now() < deadline) {
    if (check()) return
    await wait(150)
  }
  throw new Error(message)
}

async function runProbe(
  projectId: string,
  commands: Array<{
    command: ProbeCommand
    until: (state: ProbeState) => boolean
    label: string
  }>,
  cleanup = true,
) {
  const host = document.createElement("div")
  host.dataset.autoShotHookProbe = projectId
  document.body.append(host)
  let root: Root | null = createRoot(host)
  let latest: ProbeState = {
    projectId,
    taskId: null,
    status: null,
    decodedFrames: 0,
    candidates: 0,
    active: false,
    error: null,
  }
  const onState = (state: ProbeState) => {
    latest = state
  }
  try {
    root.render(
      createElement(HookProbe, { projectId, command: "idle", onState }),
    )
    await wait(250)
    for (const step of commands) {
      if (!root) throw new Error("Hook probe root unexpectedly unavailable")
      root.render(
        createElement(HookProbe, { projectId, command: step.command, onState }),
      )
      await waitFor(
        () => Boolean(latest.error) || step.until(latest),
        `${step.label} 未完成${latest.error ? `：${latest.error}` : ""}`,
      )
      if (latest.error) throw new Error(`${step.label} 失败：${latest.error}`)
    }
    return latest
  } finally {
    root?.unmount()
    root = null
    host.remove()
    if (cleanup) await projectRepository.deleteAutoShotTask(projectId)
  }
}

async function runProjectSwitchProbe() {
  const suffix = crypto.randomUUID()
  const firstProjectId = `hook-switch-first-${suffix}`
  const secondProjectId = `hook-switch-second-${suffix}`
  const host = document.createElement("div")
  document.body.append(host)
  let root: Root | null = createRoot(host)
  let latest: ProbeState = {
    projectId: "",
    taskId: null,
    status: null,
    decodedFrames: 0,
    candidates: 0,
    active: false,
    error: null,
  }
  let lastCommand: ProbeCommand = "idle"
  const actionsRef: { current: { cancel: () => Promise<unknown> } | null } = {
    current: null,
  }
  try {
    const events: ProbeState[] = []
    const onTrackedState = (state: ProbeState) => {
      latest = state
      events.push(state)
    }
    const onCommand = (command: ProbeCommand) => {
      lastCommand = command
    }
    root.render(
      createElement(HookProbe, {
        projectId: firstProjectId,
        command: "idle",
        onState: onTrackedState,
        onCommand,
        actionsRef,
      }),
    )
    await wait(100)
    root.render(
      createElement(HookProbe, {
        projectId: firstProjectId,
        command: "start",
        onState: onTrackedState,
        onCommand,
        actionsRef,
      }),
    )
    await waitFor(
      () =>
        Boolean(latest.error) ||
        (latest.status === "running" && latest.decodedFrames > 12),
      `切换前任务未启动${latest.error ? `：${latest.error}` : ""}`,
    )
    if (latest.error) throw new Error(`切换前任务失败：${latest.error}`)
    const firstTaskId = latest.taskId
    const switchEventIndex = events.length
    root.render(
      createElement(HookProbe, {
        projectId: secondProjectId,
        command: "idle",
        onState: onTrackedState,
        onCommand,
        actionsRef,
      }),
    )
    await wait(100)
    root.render(
      createElement(HookProbe, {
        projectId: secondProjectId,
        command: "start",
        onState: onTrackedState,
        onCommand,
        actionsRef,
      }),
    )
    await waitFor(
      () =>
        Boolean(latest.error) ||
        (latest.status === "running" && latest.decodedFrames > 12),
      `切换后任务未启动${latest.error ? `：${latest.error}` : ""}`,
    )
    if (latest.error) throw new Error(`切换后任务失败：${latest.error}`)
    await wait(2_000)
    if (
      firstTaskId &&
      events
        .slice(switchEventIndex)
        .some((state) => state.taskId === firstTaskId)
    ) {
      throw new Error("旧项目任务的 stale 状态在新项目启动后回写到了 Hook")
    }
    if (!actionsRef.current) throw new Error("切换后 Hook 没有暴露取消命令")
    await actionsRef.current.cancel()
    await waitFor(
      () => Boolean(latest.error) || latest.status === "cancelled",
      `切换后任务未取消${
        latest.error ? `：${latest.error}` : ""
      }，当前状态：${JSON.stringify(latest)}，最后命令：${lastCommand}`,
      30_000,
    )
    if (latest.error) throw new Error(`切换后任务失败：${latest.error}`)
    return { switched: true, cancelled: latest.status }
  } finally {
    root?.unmount()
    root = null
    host.remove()
    await projectRepository.deleteAutoShotTask(firstProjectId)
    await projectRepository.deleteAutoShotTask(secondProjectId)
  }
}

export async function runAutoShotHookLifecycleVerification() {
  const suffix = crypto.randomUUID()
  const resumeProjectId = `hook-resume-${suffix}`
  const cancelProjectId = `hook-cancel-${suffix}`
  const paused = await runProbe(
    resumeProjectId,
    [
      {
        command: "start",
        until: (state) =>
          state.status === "running" && state.decodedFrames > 12,
        label: "Hook 启动",
      },
      {
        command: "pause",
        until: (state) => state.status === "paused",
        label: "Hook 暂停",
      },
    ],
    false,
  )

  const resumeHost = document.createElement("div")
  document.body.append(resumeHost)
  let resumeRoot: Root | null = createRoot(resumeHost)
  let resumed: ProbeState = {
    projectId: resumeProjectId,
    taskId: null,
    status: null,
    decodedFrames: 0,
    candidates: 0,
    active: false,
    error: null,
  }
  const onResumeState = (state: ProbeState) => {
    resumed = state
  }
  try {
    resumeRoot.render(
      createElement(HookProbe, {
        projectId: resumeProjectId,
        command: "idle",
        onState: onResumeState,
      }),
    )
    await waitFor(
      () => resumed.status === "paused",
      "刷新后没有恢复 paused 任务",
    )
    resumeRoot.render(
      createElement(HookProbe, {
        projectId: resumeProjectId,
        command: "resume",
        onState: onResumeState,
      }),
    )
    await waitFor(
      () => Boolean(resumed.error) || resumed.status === "completed",
      `Hook 继续未完成${resumed.error ? `：${resumed.error}` : ""}`,
    )
    if (resumed.error) throw new Error(`Hook 继续失败：${resumed.error}`)
  } finally {
    resumeRoot?.unmount()
    resumeRoot = null
    resumeHost.remove()
    await projectRepository.deleteAutoShotTask(resumeProjectId)
  }

  const cancelled = await runProbe(cancelProjectId, [
    {
      command: "start",
      until: (state) => state.status === "running" && state.decodedFrames > 12,
      label: "Hook 取消前启动",
    },
    {
      command: "cancel",
      until: (state) => state.status === "cancelled",
      label: "Hook 取消",
    },
  ])
  const switched = await runProjectSwitchProbe()
  return {
    paused: paused.status,
    resumed: resumed.status,
    resumedFrames: resumed.decodedFrames,
    resumedCandidates: resumed.candidates,
    cancelled: cancelled.status,
    switched: switched.switched,
    switchedCancelled: switched.cancelled,
  }
}
