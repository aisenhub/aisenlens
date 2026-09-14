import projectRepository, { setProjectRepositoryFaultInjector, type ProjectRepositoryFaultPoint } from "../src/features/project/services/projectRepository"
import { createCalibrationDraft } from "../src/features/shot-calibration/services/calibrationDraftService"
import type { AutoShotTaskRecord } from "../src/features/auto-shot/types"
import type { AutoShotMediaIdentity } from "../src/features/auto-shot/mediaIdentity"
import type { ProjectTemplateSnapshotRecord, StoredShotRecord } from "../src/features/project/types"

const identity: AutoShotMediaIdentity = {
  identitySchema: "aisenlens-auto-shot-media-identity",
  schemaVersion: 1,
  contentDigestStrategy: "sha256-file-v1",
  contentDigest: "a".repeat(64),
  size: 1_000,
  codec: "vp9",
  codedWidth: 640,
  codedHeight: 360,
  displayWidth: 640,
  displayHeight: 360,
  rotation: 0,
  durationUs: 333_333,
  mediaIdentityDigest: "b".repeat(64),
}

const config = {
  hardCut: { kind: "content" as const, threshold: 0.3, weights: { hue: 0.3, saturation: 0.3, luma: 0.4 } },
  fade: null,
  minimumSceneDurationUs: 100_000,
  analysis: { maxWidth: 96, temporalSampling: { kind: "every-frame" as const } },
  diagnostics: "summary" as const,
}

function makeShot(projectId: string, id = "shot:seed"): StoredShotRecord {
  const timestamp = new Date(0).toISOString()
  return {
    id,
    projectId,
    order: 0,
    startFrame: 0,
    endFrame: 10,
    status: "confirmed",
    detection: null,
    primaryScreenshotId: null,
    screenshotIds: [],
    firstFrameScreenshotId: null,
    lastFrameScreenshotId: null,
    analysisFields: {},
    description: "seed",
    notes: "",
    createdAt: timestamp,
    updatedAt: timestamp,
  }
}

function makeTemplate(projectId: string): ProjectTemplateSnapshotRecord {
  const timestamp = new Date(0).toISOString()
  return { id: `template:${projectId}`, projectId, name: "fixture", version: 1, fields: [], createdAt: timestamp, updatedAt: timestamp }
}

function makeTask(projectId: string): AutoShotTaskRecord {
  const timestamp = new Date(0).toISOString()
  return {
    id: `task:${projectId}`,
    projectId,
    mediaIdentity: identity,
    review: { excludedCandidateIds: [], updatedAt: null, appliedAt: null },
    controlSnapshot: null,
    config,
    status: "completed",
    engineVersion: null,
    configHash: null,
    progress: { processedUs: 333_333, durationUs: 333_333, decodedFrames: 10, candidateCount: 0 },
    candidates: [],
    checkpoint: null,
    result: null,
    error: null,
    createdAt: timestamp,
    updatedAt: timestamp,
  }
}

async function createFixture() {
  const project = await projectRepository.createProject({ title: "校准事务 fixture" })
  await projectRepository.replaceProjectShots(project.id, [makeShot(project.id)])
  await projectRepository.saveProjectTemplate(makeTemplate(project.id))
  await projectRepository.saveAutoShotTask(makeTask(project.id))
  const state = await projectRepository.readProjectEditorState(project.id)
  if (!state) throw new Error("无法读取事务 fixture")
  const draft = createCalibrationDraft({
    projectId: project.id,
    mediaIdentity: identity,
    mediaSource: { name: "fixture.webm", size: 1_000, lastModified: 0, mimeType: "video/webm" },
    frameRate: 30,
    totalFrames: 10,
    timingMode: "cfr",
    presentationTimestamps: Array.from({ length: 10 }, (_, frame) => frame / 30),
    presentationDurations: Array.from({ length: 10 }, () => 1 / 30),
    baseProjectUpdatedAt: state.project.updatedAt,
    task: await projectRepository.getAutoShotTask(project.id, identity),
    shots: state.shots,
  })
  await projectRepository.saveCalibrationDraft(draft)
  return { project, state, draft, task: await projectRepository.getAutoShotTask(project.id, identity) }
}

export async function runShotCalibrationApplyTransactionVerification() {
  const failurePoints: ProjectRepositoryFaultPoint[] = ["project-write", "shots-write", "groups-write", "markers-write", "template-write", "task-write", "draft-receipt-write"]
  const failures: Array<{ point: ProjectRepositoryFaultPoint; rolledBack: boolean; message: string }> = []

  for (const point of failurePoints) {
    const fixture = await createFixture()
    setProjectRepositoryFaultInjector((activePoint) => {
      if (activePoint === point) throw new Error(`injected:${point}`)
    })
    let message = ""
    try {
      await projectRepository.applyCalibrationDraft({ state: fixture.state, draft: fixture.draft, expectedUpdatedAt: fixture.state.project.updatedAt, recoverySnapshotId: `recovery:${point}`, task: fixture.task })
    } catch (error) {
      message = error instanceof Error ? error.message : String(error)
    } finally {
      setProjectRepositoryFaultInjector(null)
    }
    const after = await projectRepository.readProjectEditorState(fixture.project.id)
    const draftAfter = await projectRepository.getCalibrationDraft(fixture.project.id, identity)
    const taskAfter = await projectRepository.getAutoShotTask(fixture.project.id, identity)
    const rolledBack = Boolean(after && draftAfter && taskAfter
      && after.project.updatedAt === fixture.state.project.updatedAt
      && after.shots.length === fixture.state.shots.length
      && after.groups.length === fixture.state.groups.length
      && after.markers.length === fixture.state.markers.length
      && JSON.stringify(after.template) === JSON.stringify(fixture.state.template)
      && draftAfter.status === "editing"
      && draftAfter.revision === fixture.draft.revision
      && taskAfter.review.appliedAt === fixture.task?.review.appliedAt)
    failures.push({ point, rolledBack, message })
    await projectRepository.deleteProject(fixture.project.id)
  }

  const idempotencyFixture = await createFixture()
  const applied = await projectRepository.applyCalibrationDraft({ state: idempotencyFixture.state, draft: idempotencyFixture.draft, expectedUpdatedAt: idempotencyFixture.state.project.updatedAt, recoverySnapshotId: "recovery:idempotency", task: idempotencyFixture.task })
  const appliedState = await projectRepository.readProjectEditorState(idempotencyFixture.project.id)
  const reapplied = await projectRepository.applyCalibrationDraft({ state: appliedState!, draft: idempotencyFixture.draft, expectedUpdatedAt: applied.updatedAt, recoverySnapshotId: "recovery:idempotency-repeat", task: idempotencyFixture.task })
  const storedAppliedDraft = await projectRepository.getCalibrationDraft(idempotencyFixture.project.id, identity)
  const idempotent = Boolean(appliedState && storedAppliedDraft?.status === "applied" && reapplied.updatedAt === applied.updatedAt && appliedState.shots.length === 1 && appliedState.shots[0]?.id === "shot:seed")
  await projectRepository.deleteProject(idempotencyFixture.project.id)

  const result = { failurePoints: failures, allFaultsRolledBack: failures.every((item) => item.rolledBack && item.message.startsWith("injected:")), idempotent }
  if (!result.allFaultsRolledBack || !result.idempotent) throw new Error(`校准事务验证失败: ${JSON.stringify(result)}`)
  return result
}
