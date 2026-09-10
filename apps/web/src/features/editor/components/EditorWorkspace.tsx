import { lazy, Suspense, useCallback, useMemo, useState, useRef, useEffect } from "react"
import { toast } from "sonner"
import {
  Bookmark,
  Code2,
  Grid3X3,
  Keyboard,
  LoaderCircle,
  Settings2,
  TriangleAlert,
} from "lucide-react"
import type { LucideIcon } from "lucide-react"
import { FRAMES_PER_SECOND } from "../constants/editor"
import {
  Panel,
  PanelToolId,
  ShotData,
} from "../constants/editorData"
import FrameCapture from "./FrameCapture"
import ShotList from "./ShotList"
import ShotScreenshotGallery from "../../shot/components/ShotScreenshotGallery"
import VideoPlaybackControls from "./VideoPlaybackControls"
import EditorTimeline from "./EditorTimeline"
import VideoPreviewCanvas, {
  closestCanvasAspectPreset,
} from "./VideoPreviewCanvas"
import useVideoPlayback from "../hooks/useVideoPlayback"
import useEditorHistory from "../hooks/useEditorHistory"
import useEditorSaveState from "../hooks/useEditorSaveState"
import useEditorPersistence from "../hooks/useEditorPersistence"
import {
  loadScreenshotUrl,
  captureVideoFrameScreenshot,
} from "../../project/services/screenshotService"
import projectRepository from "../../project/services/projectRepository"
import formatTimecode from "../utils/formatTimecode"
import { Button } from "../../../components/ui/button"
import { Checkbox } from "../../../components/ui/checkbox"
import { Input } from "../../../components/ui/input"
import { Tabs, TabsList, TabsTrigger } from "../../../components/ui/tabs"
import { Textarea } from "../../../components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../../../components/ui/dialog"
import type { MediaAsset } from "../../project/types"
import type { ProjectRecord } from "../../project/types"
import { loadProjectShots } from "../../shot/services/shotService"
import type { ShotDetectionMeta } from "../../shot/types"
import {
  mergeAdjacentShotRanges,
  moveSharedShotBoundary,
} from "../../shot/services/shotBoundaryService"
import {
  getManualShotSplitFailureMessage,
  splitManualShotAtFrame,
} from "../../shot/services/manualShotService"
import { loadOrCreateProjectTemplate } from "../../template/services/templateService"
import { resolveAutoShotTotalFrames } from "../../auto-shot/applyAutoShotCandidates"
import {
  getShotAnalysisCompleteness,
  validateProjectAnalysisProfile,
} from "../../template/services/templateValidation"
import resolveAnalysisProfile from "../../template/services/resolveAnalysisProfile"
import { applyAnalysisFieldCommand, copyPreviousAnalysisField, type AnalysisFieldCommand } from "../../analysis/services/analysisFieldCommands"
import TemplateEditorModal from "../../template/components/TemplateEditorModal"
import type {
  AnalysisFieldEntry,
  ProjectTemplateSnapshot,
} from "../../template/types"
import AnnotationMarkerPanel from "../../annotation/components/AnnotationMarkerPanel"
import { loadProjectAnnotationMarkers } from "../../annotation/services/annotationService"
import type {
  AnnotationMarker,
  AnnotationMarkerCategory,
} from "../../annotation/types"
import { loadOrGenerateWaveform } from "../../video/services/waveformService"
import { normalizeMediaSourceFingerprint } from "../../project/services/mediaService"
import { frameToTimestampFromArrays } from "../../video/services/mediaFrameTimeService"
import useAutoShotTask from "../../auto-shot/hooks/useAutoShotTask"
import prepareDetectionCalibration from "../../shot-calibration/services/prepareDetectionCalibration"
import useAutoShotControl from "../../auto-shot/hooks/useAutoShotControl"
import { getProductionPresetRegistry } from "../../auto-shot/config/resolveAutoShotConfig"
import { listFrontendPresetDefinitions } from "../../auto-shot/config/presetRegistry"
import type { AutoShotCandidate, AutoShotTaskRecord } from "../../auto-shot/types"
const AdvancedSettings = lazy(() => import("../../auto-shot/components/AdvancedSettings"))
const CalibrationWorkbench = lazy(() => import("../../scene-calibration/components/CalibrationWorkbench"))
import { addUncertainRange, attachCalibrationResearchRun, createCalibrationAnnotation, serializeCalibrationAnnotation, updateHardCutAnnotation } from "../../scene-calibration/services/calibrationService"
import type { CalibrationAnnotationRecord } from "../../scene-calibration/types"
import ShotGroupPanel from "../../group/components/ShotGroupPanel"
import ShotGroupInspector from "../../group/components/ShotGroupInspector"
import {
  adjustShotGroupRange,
  createShotGroup,
  getContiguousShotIds,
  getShotGroupIndexes,
  loadProjectShotGroups,
  reconcileShotGroups,
} from "../../group/services/groupService"
import type { ShotGroupKind, ShotGroupRecord } from "../../group/types"
const ReportExportDialog = lazy(() => import("../../export/components/ReportExportDialog"))
import { downloadReport } from "../../export/services/reportExportService"
import type { ExportFormat } from "../../export/types"
const VideoExportDialog = lazy(() => import("../../export/components/VideoExportDialog"))
import {
  startVideoExport,
  type VideoExportJob,
  type VideoExportProgress,
} from "../../export/services/videoExportService"
import { requestVideoExportSaveTarget } from "../../export/services/videoExportFileSaveService"
import type { VideoExportSettings } from "../../export/services/videoExportProtocol"
import {
  createProjectRecoverySnapshot,
  SNAPSHOT_INTERVAL_MS,
} from "../../project/services/projectRecoveryService"
import {
  findMatchingShotIds,
  type ShotSearchFilters,
} from "../../shot/services/shotSearchService"
import CompositionOverlayPanel from "../../composition-overlay/components/CompositionOverlayPanel"
import {
  getCompositionOverlayScreenshotSignature,
  normalizeCompositionOverlaySettings,
  type CompositionDrawingTool,
  type CompositionOverlaySettings,
  type CompositionOverlayShape,
} from "../../composition-overlay/types"
import ContentOverlayPanel from "../../content-overlay/components/ContentOverlayPanel"
import { resolveContentOverlay } from "../../content-overlay/services/contentOverlayResolver"
import {
  normalizeContentOverlaySettings,
  type ContentOverlaySettings,
} from "../../content-overlay/types"
import { EDITOR_SHORTCUT_DEFINITIONS } from "../shortcuts/definitions"
import useEditorShortcuts from "../shortcuts/useEditorShortcuts"
import useMultiTrackAudioPreview from "../../media/hooks/useMultiTrackAudioPreview"
import { saveAudioTracks } from "../../media/services/audioTrackProjectService"
import { canonicalizeSceneDetectionConfig } from "@aisenlens/scene-engine"
import { useProjectSession } from "../session/ProjectSessionProvider"
import type { WorkflowLocation, WorkflowStage, WorkflowView } from "../../workflow/types.ts"
const PrepareView = lazy(() => import("../../workflow/components/PrepareView"))
const CalibrateView = lazy(() => import("../../workflow/components/CalibrateView"))
const OverviewView = lazy(() => import("../../overview/components/OverviewView"))
const AnalyzeWorkspace = lazy(() => import("../../analysis/components/AnalyzeWorkspace"))
const LearnView = lazy(() => import("../../learn/components/LearnView"))
const CreateView = lazy(() => import("../../workflow/components/CreateView"))
import type { LearningSource } from "../../learn/services/deriveLearningSources"
import useResearchWorkbench from "../../analysis/hooks/useResearchWorkbench"
import type { EvidenceRef, ResearchContext, ResearchRange, ResearchTarget } from "../../analysis/types.ts"
import AnalysisFieldEntryInput from "../../analysis/components/AnalysisFieldEntryInput"
import BatchAnalysisPanel from "../../analysis/components/BatchAnalysisPanel"
import { applyAnalysisBatch } from "../../analysis/services/analysisFieldCommands"

interface EditorWorkspaceProps {
  onNavigate: (page: number) => void
  projectTitle: string
  setProjectTitle: (t: string) => void
  videoUrl: string | null
  projectId: string
  project: ProjectRecord
  media: MediaAsset
  isSelectingVideo: boolean
  onImportVideo: () => void
  coverScreenshotId: string | null
  onProjectUpdated: (project: ProjectRecord) => void
  isActive?: boolean
  workflowStage?: WorkflowStage
  workflowView?: WorkflowView
  onWorkflowNavigate?: (stage: WorkflowStage, view?: WorkflowView, research?: Partial<Pick<WorkflowLocation, "mode" | "scopeKind" | "scopeId" | "fromUs" | "toUs" | "targetKind" | "targetId">>) => void
}

interface EditorHistorySnapshot {
  shots: ShotData[]
  shotFrames: Record<string, { first: number; last: number }>
  shotScreenshotIds: Record<string, string[]>
  primaryShotScreenshotIds: Record<string, string | null>
  shotBoundaryScreenshotIds: Record<string, {
    first: string | null
    last: string | null
  }>
  shotNotes: Record<string, { content: string; analysis: string }>
  shotDims: Record<string, Record<string, AnalysisFieldEntry>>
  shotStatuses: Record<string, "draft" | "confirmed">
  template: ProjectTemplateSnapshot | null
  shotDetection: Record<string, ShotDetectionMeta>
  annotationMarkers: AnnotationMarker[]
  shotGroups: ShotGroupRecord[]
  activeShot: number
  currentTime: number
  selectedMarkerId: string | null
  selectedGroupId: string | null
  researchRanges: ResearchRange[]
  researchContexts: ResearchContext[]
}

/* ── constants ── */
const FPS = FRAMES_PER_SECOND
/* ─────────────────────────────────────────────
   EDITOR
───────────────────────────────────────────── */
export default function EditorWorkspace({
  onNavigate,
  project,
  projectTitle,
  setProjectTitle,
  videoUrl,
  projectId,
  media,
  isSelectingVideo,
  onImportVideo,
  coverScreenshotId,
  onProjectUpdated,
  isActive = true,
  workflowStage = "prepare",
  workflowView = "scenes",
  onWorkflowNavigate,
}: EditorWorkspaceProps) {
  const setSessionSelection = useProjectSession((state) => state.setSelection)
  const setSessionPlaybackTime = useProjectSession((state) => state.setPlaybackTime)
  const setSessionResearchTarget = useProjectSession((state) => state.setResearchTarget)
  const setSessionResearchMode = useProjectSession((state) => state.setResearchMode)
  const setSessionResearchScope = useProjectSession((state) => state.setResearchScope)
  const setSessionResearchQueue = useProjectSession((state) => state.setResearchQueue)
  const sessionResearchTargetValue = useProjectSession((state) => state.researchTarget)
  const sessionResearchTarget: ResearchTarget | null = sessionResearchTargetValue && (sessionResearchTargetValue.kind === "shot" || sessionResearchTargetValue.kind === "group" || sessionResearchTargetValue.kind === "range") ? { kind: sessionResearchTargetValue.kind, id: sessionResearchTargetValue.id } : null
  const [mediaProject, setMediaProject] = useState(project)
  const [shots, setShots] = useState<ShotData[]>([])
  const autoShotDetectionRef = useRef<Record<string, ShotDetectionMeta>>({})
  const [activeShot, setActiveShot] = useState(0)
  const [panel, setPanel] = useState<Panel>("frame")
  const [activeTool, setActiveTool] = useState<PanelToolId>(null)
  const [mobilePanel, setMobilePanel] = useState<"shots" | "analysis" | null>(null)
  const [calibrationModeEnabled, setCalibrationModeEnabled] = useState(false)
  const [advancedDetectionEnabled, setAdvancedDetectionEnabled] = useState(false)
  const [maskOn, setMaskOn] = useState(false)
  const [canvasBackgroundColor, setCanvasBackgroundColor] =
    useState<string | null>(null)
  const [previewZoom, setPreviewZoom] = useState(1)
  const [previewAspectPreset, setPreviewAspectPreset] = useState(() =>
    closestCanvasAspectPreset(
      media.metadata?.width ?? 0,
      media.metadata?.height ?? 0,
    ),
  )
  const [compositionOverlay, setCompositionOverlay] = useState(() =>
    normalizeCompositionOverlaySettings(project.compositionOverlay),
  )
  const [contentOverlay, setContentOverlay] = useState(() =>
    normalizeContentOverlaySettings(project.contentOverlay),
  )
  const [compositionDrawingTool, setCompositionDrawingTool] =
    useState<CompositionDrawingTool>("select")
  const [selectedCompositionShapeId, setSelectedCompositionShapeId] =
    useState<string | null>(null)
  const [compositionShapeHistoryIndex, setCompositionShapeHistoryIndex] =
    useState(0)
  const [isPreviewFullscreen, setIsPreviewFullscreen] = useState(false)
  const [fullscreenRequest, setFullscreenRequest] = useState(0)
  const [compositionCancelRequest, setCompositionCancelRequest] = useState(0)
  const [activeShortcutSurface, setActiveShortcutSurface] =
    useState<"preview" | "timeline" | null>("preview")
  const [timelineZoomRequest, setTimelineZoomRequest] = useState<{
    id: number
    direction: -1 | 1
  }>({ id: 0, direction: 1 })
  const [viewRange, setViewRange] = useState<{
    inFrame: number | null
    outFrame: number | null
  }>({ inFrame: null, outFrame: null })
  const [editingTitle, setEditingTitle] = useState(false)
  const [titleDraft, setTitleDraft] = useState(projectTitle)
  const [liteCache, setLiteCache] = useState(128)
  const [openRef, setOpenRef] = useState<string | null>(null)

  const editorSaveBaselineRef = useRef(project.updatedAt)

  useEffect(() => {
    setMediaProject(project)
    editorSaveBaselineRef.current = project.updatedAt
  }, [project, projectId])
  const handleMediaProjectUpdated = useCallback(
    (updatedProject: ProjectRecord) => {
      setMediaProject(updatedProject)
      editorSaveBaselineRef.current = updatedProject.updatedAt
      onProjectUpdated(updatedProject)
    },
    [onProjectUpdated],
  )
  const handleAudioTracksChange = useCallback(
    (audioTracks: import("../../project/types").AudioTrack[]) => {
      void saveAudioTracks(mediaProject, audioTracks)
        .then(handleMediaProjectUpdated)
        .catch(() => undefined)
    },
    [handleMediaProjectUpdated, mediaProject],
  )

  /* per-shot data */
  const [shotFrames, setShotFrames] = useState<Record<string, {
    first: number
    last: number
  }>>({})
  const [shotScreenshotIds, setShotScreenshotIds] =
    useState<Record<string, string[]>>({})
  const [primaryShotScreenshotIds, setPrimaryShotScreenshotIds] =
    useState<Record<string, string | null>>({})
  const [shotBoundaryScreenshotIds, setShotBoundaryScreenshotIds] =
    useState<Record<string, { first: string | null; last: string | null }>>({})
  const [shotScreenshotUrls, setShotScreenshotUrls] =
    useState<Record<string, string | null>>({})
  const [screenshotFrames, setScreenshotFrames] =
    useState<Record<string, number>>({})
  const [
    screenshotCompositionOverlayIncluded,
    setScreenshotCompositionOverlayIncluded,
  ] = useState<Record<string, boolean>>({})
  const [
    screenshotCompositionOverlaySignatures,
    setScreenshotCompositionOverlaySignatures,
  ] = useState<Record<string, string>>({})
  const [hasLoadedScreenshotFrames, setHasLoadedScreenshotFrames] =
    useState(false)
  const [boundaryCaptureRevision, setBoundaryCaptureRevision] = useState(0)
  const [isCapturingScreenshot, setIsCapturingScreenshot] = useState(false)
  const [shotNotes, setShotNotes] = useState<Record<string, {
    content: string
    analysis: string
  }>>({})
  const [shotDims, setShotDims] =
    useState<Record<string, Record<string, AnalysisFieldEntry>>>({})
  const [shotStatuses, setShotStatuses] = useState<Record<string, "draft" | "confirmed">>({})
  const [isBatchAnalysisOpen, setIsBatchAnalysisOpen] = useState(false)
  const [loadedProjectId, setLoadedProjectId] = useState<string | null>(null)
  const [editorLoadError, setEditorLoadError] = useState<string | null>(null)
  const [dataLoadRevision, setDataLoadRevision] = useState(0)
  const [template, setTemplate] = useState<ProjectTemplateSnapshot | null>(null)
  const templateRef = useRef<ProjectTemplateSnapshot | null>(null)
  const [isTemplateEditorOpen, setIsTemplateEditorOpen] = useState(false)
  const [annotationMarkers, setAnnotationMarkers] =
    useState<AnnotationMarker[]>([])
  const [selectedMarkerId, setSelectedMarkerId] = useState<string | null>(null)
  const [visibleMarkerCategories, setVisibleMarkerCategories] =
    useState<AnnotationMarkerCategory[]>([
      "important",
      "composition",
      "emotion",
      "turning-point",
    ])
  const [waveformPeaks, setWaveformPeaks] = useState<number[] | null>(null)
  const [waveformUnavailable, setWaveformUnavailable] = useState(false)
  const [shotGroups, setShotGroups] = useState<ShotGroupRecord[]>([])
  const [selectedShotIds, setSelectedShotIds] = useState<string[]>([])
  const [groupKindDraft, setGroupKindDraft] = useState<ShotGroupKind>("scene")
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null)
  const [loadedShotGroupProjectId, setLoadedShotGroupProjectId] =
    useState<string | null>(null)
  const [collapsedGroupIds, setCollapsedGroupIds] = useState<string[]>([])
  const [isSelectingGroupShots, setIsSelectingGroupShots] = useState(false)
  const [shotSearchFilters, setShotSearchFilters] = useState<ShotSearchFilters>(
    { query: "", groupKind: "all", status: "all" },
  )
  const [isExportDialogOpen, setIsExportDialogOpen] = useState(false)
  const [isExporting, setIsExporting] = useState(false)
  const [isVideoExportDialogOpen, setIsVideoExportDialogOpen] =
    useState(false)
  const [isVideoExporting, setIsVideoExporting] = useState(false)
  const [videoExportProgress, setVideoExportProgress] =
    useState<VideoExportProgress | null>(null)
  const [videoExportError, setVideoExportError] = useState<string | null>(null)
  const shotPlaybackEndRef = useRef<number | null>(null)
  const boundaryCaptureKeysRef = useRef(new Set<string>())
  const boundaryCaptureRetriesRef = useRef(new Map<string, number>())
  const onProjectUpdatedRef = useRef(onProjectUpdated)
  const compositionShapeHistoryRef = useRef<CompositionOverlayShape[][]>([])
  const reversePlaybackTimerRef = useRef<number | null>(null)
  const historyInputActiveRef = useRef(false)
  const videoExportJobRef = useRef<VideoExportJob | null>(null)
  const videoExportCancelledRef = useRef(false)
  const editorLoadRequestRef = useRef(0)

  useEffect(() => {
    templateRef.current = template
  }, [template])

  const titleInputRef = useRef<HTMLInputElement>(null)
  const {
    videoRef,
    currentTime,
    durationSeconds,
    isPlaying: playing,
    playbackRate: speed,
    isMuted,
    status: playbackStatus,
    errorMessage: playbackErrorMessage,
    setCurrentTime,
    previewCurrentTime,
    setPlaying,
    setSpeed,
    setMuted,
    retry: retryVideoPlayback,
    onLoadedMetadata,
    onTimeUpdate,
    onPlay,
    onPause,
    onEnded,
    onSeeking,
    onSeeked,
    onWaiting,
    onCanPlay,
    onError,
  } = useVideoPlayback({
    source: videoUrl,
    initialDurationSeconds: media.metadata?.durationSeconds ?? 0,
  })

  useEffect(() => {
    if (!isActive) setPlaying(false)
  }, [isActive, setPlaying])

  useEffect(() => {
    setSessionPlaybackTime(currentTime)
  }, [currentTime, setSessionPlaybackTime])

  useEffect(() => {
    setSessionSelection({ shotId: shots[activeShot]?.id ?? null })
    if (sessionResearchTargetValue) return
    setSessionResearchTarget(selectedGroupId ? { kind: "group", id: selectedGroupId } : shots[activeShot] ? { kind: "shot", id: shots[activeShot].id } : null)
  }, [activeShot, selectedGroupId, sessionResearchTargetValue, setSessionResearchTarget, setSessionSelection, shots])

  const autoShotMediaFingerprint = useMemo(
    () => (media.source ? normalizeMediaSourceFingerprint(media.source) : null),
    [media.source],
  )
  const [autoShotMediaIdentityDigest, setAutoShotMediaIdentityDigest] = useState<string | null>(null)
  const autoShotControl = useAutoShotControl({
    projectId,
    mediaIdentityDigest: autoShotMediaIdentityDigest,
    catalog: "production",
  })
  const autoShotTask = useAutoShotTask({
    projectId,
    sourceUrl: videoUrl,
    mediaFingerprint: autoShotMediaFingerprint,
    durationSeconds,
    frameRate: media.metadata?.frameRate ?? FRAMES_PER_SECOND,
    resolved: autoShotControl.resolved,
  })
  useEffect(() => {
    setAutoShotMediaIdentityDigest(autoShotTask.mediaIdentityDigest)
  }, [autoShotTask.mediaIdentityDigest])
  const researchWorkbench = useResearchWorkbench({ projectId })
  const researchMediaIdentityDigest = autoShotMediaIdentityDigest ?? "unidentified-media"
  const autoShotPresets = useMemo(
    () => listFrontendPresetDefinitions(getProductionPresetRegistry(), "production"),
    [],
  )
  const autoShotRun: AutoShotTaskRecord | null = autoShotTask.record
  const [calibrationAnnotation, setCalibrationAnnotation] = useState<CalibrationAnnotationRecord | null>(null)

  useEffect(() => {
    if (!autoShotRun) {
      setCalibrationAnnotation(null)
      return
    }
    let cancelled = false
    const fallback = createCalibrationAnnotation({
      projectId,
      fixtureId: `${projectId}:${autoShotRun.mediaIdentity.mediaIdentityDigest.slice(0, 16)}`,
      source: media.source,
      mediaIdentity: autoShotRun.mediaIdentity,
      frameRate: media.metadata?.frameRate ?? FPS,
    })
    const researchRun = autoShotRun.controlSnapshot ? {
        presetId: autoShotRun.controlSnapshot.preset.id,
        presetVersion: autoShotRun.controlSnapshot.preset.version,
        catalog: "research" as const,
        detail: autoShotRun.controlSnapshot.detail,
        config: structuredClone(autoShotRun.config),
        canonicalConfig: canonicalizeSceneDetectionConfig(autoShotRun.config),
        configHash: autoShotRun.configHash ?? "",
        engineVersion: autoShotRun.engineVersion ?? autoShotRun.candidates[0]?.engineVersion ?? "unknown",
        candidateIds: autoShotRun.candidates.map((candidate) => candidate.id),
      } : null

    void projectRepository.getCalibrationAnnotation(projectId, autoShotRun.mediaIdentity)
      .then((stored) => {
        if (cancelled) return
        const annotation = attachCalibrationResearchRun(stored ?? fallback, researchRun)
        setCalibrationAnnotation(annotation)
      })
      .catch(() => {
        if (!cancelled) setCalibrationAnnotation(attachCalibrationResearchRun(fallback, researchRun))
      })
    return () => {
      cancelled = true
    }
  }, [autoShotRun?.id, autoShotRun?.status, autoShotRun?.engineVersion, autoShotRun?.configHash, autoShotRun?.candidates.length, media.metadata?.frameRate, media.source, projectId])

  useMultiTrackAudioPreview({
    mediaAssets: mediaProject.mediaAssets,
    audioTracks: mediaProject.audioTracks,
    frameRate: media.metadata?.frameRate ?? FPS,
    currentTime,
    isPlaying: playing,
    playbackRate: speed,
  })

  const stopReversePlayback = useCallback(() => {
    if (reversePlaybackTimerRef.current === null) return
    window.clearInterval(reversePlaybackTimerRef.current)
    reversePlaybackTimerRef.current = null
  }, [])

  useEffect(() => () => stopReversePlayback(), [stopReversePlayback])

  useEffect(
    () => () => {
      videoExportJobRef.current?.cancel()
    },
    [],
  )

  useEffect(() => {
    if (playing) stopReversePlayback()
  }, [playing, stopReversePlayback])

  const getEditorHistorySnapshot = useCallback(
    (): EditorHistorySnapshot => ({
      shots: structuredClone(shots),
      shotFrames: structuredClone(shotFrames),
      shotScreenshotIds: structuredClone(shotScreenshotIds),
      primaryShotScreenshotIds: structuredClone(primaryShotScreenshotIds),
      shotBoundaryScreenshotIds: structuredClone(shotBoundaryScreenshotIds),
      shotNotes: structuredClone(shotNotes),
      shotDims: structuredClone(shotDims),
      shotStatuses: structuredClone(shotStatuses),
      template: template ? structuredClone(template) : null,
      shotDetection: structuredClone(autoShotDetectionRef.current),
      annotationMarkers: structuredClone(annotationMarkers),
      shotGroups: structuredClone(shotGroups),
      activeShot,
      currentTime,
      selectedMarkerId,
      selectedGroupId,
      researchRanges: structuredClone(researchWorkbench.ranges),
      researchContexts: structuredClone(researchWorkbench.contexts),
    }),
    [
      activeShot,
      annotationMarkers,
      currentTime,
      primaryShotScreenshotIds,
      selectedGroupId,
      selectedMarkerId,
      shotBoundaryScreenshotIds,
      shotDims,
      shotFrames,
      shotGroups,
      shotNotes,
      shotStatuses,
      shotScreenshotIds,
      shots,
      template,
    ],
  )

  const restoreEditorHistorySnapshot = useCallback(
    (snapshot: EditorHistorySnapshot) => {
      setShots(snapshot.shots)
      setShotFrames(snapshot.shotFrames)
      setShotScreenshotIds(snapshot.shotScreenshotIds)
      setPrimaryShotScreenshotIds(snapshot.primaryShotScreenshotIds)
      setShotBoundaryScreenshotIds(snapshot.shotBoundaryScreenshotIds)
      setShotNotes(snapshot.shotNotes)
      setShotDims(snapshot.shotDims)
      setShotStatuses(snapshot.shotStatuses)
      setTemplate(snapshot.template)
      autoShotDetectionRef.current = structuredClone(snapshot.shotDetection)
      setAnnotationMarkers(snapshot.annotationMarkers)
      setShotGroups(snapshot.shotGroups)
      setActiveShot(snapshot.activeShot)
      setCurrentTime(snapshot.currentTime)
      setSelectedMarkerId(snapshot.selectedMarkerId)
      setSelectedGroupId(snapshot.selectedGroupId)
      researchWorkbench.restore(snapshot.researchRanges, snapshot.researchContexts)
    },
    [researchWorkbench.restore],
  )

  const editorHistory = useEditorHistory({
    getSnapshot: getEditorHistorySnapshot,
    onRestore: restoreEditorHistorySnapshot,
  })
  const beginHistoryInput = () => {
    if (historyInputActiveRef.current) return
    historyInputActiveRef.current = true
    editorHistory.commit()
  }
  const endHistoryInput = () => {
    historyInputActiveRef.current = false
  }

  useEffect(() => {
    if (editingTitle && titleInputRef.current) titleInputRef.current.focus()
  }, [editingTitle])

  useEffect(() => {
    setPreviewAspectPreset(
      closestCanvasAspectPreset(
        media.metadata?.width ?? 0,
        media.metadata?.height ?? 0,
      ),
    )
  }, [media.metadata?.height, media.metadata?.width, videoUrl])

  useEffect(() => {
    const settings = normalizeCompositionOverlaySettings(
      project.compositionOverlay,
    )
    setCompositionOverlay(settings)
    setContentOverlay(normalizeContentOverlaySettings(project.contentOverlay))
    compositionShapeHistoryRef.current = [
      settings.shapes.map((shape) => ({
        ...shape,
        start: { ...shape.start },
        end: { ...shape.end },
        ...(shape.control ? { control: { ...shape.control } } : {}),
      })),
    ]
    setCompositionShapeHistoryIndex(0)
    setCompositionDrawingTool("select")
    setSelectedCompositionShapeId(null)
  }, [projectId])

  const updateCompositionOverlay = useCallback(
    (nextSettings: CompositionOverlaySettings) => {
      const normalizedSettings =
        normalizeCompositionOverlaySettings(nextSettings)
      setCompositionOverlay(normalizedSettings)
    },
    [],
  )

  const updateContentOverlay = useCallback(
    (nextSettings: ContentOverlaySettings) => {
      setContentOverlay(normalizeContentOverlaySettings(nextSettings))
    },
    [],
  )

  useEffect(() => {
    if (!template) return
    const validFieldIds = new Set(
      resolveAnalysisProfile(template).fields.map((field) => field.definition.fieldId),
    )
    setContentOverlay((current) => {
      const fieldIds = current.fieldIds.filter((fieldId) =>
        validFieldIds.has(fieldId),
      )
      return fieldIds.length === current.fieldIds.length
        ? current
        : { ...current, fieldIds }
    })
  }, [template])

  const updateCompositionShapes = useCallback(
    (shapes: CompositionOverlayShape[]) => {
      updateCompositionOverlay({ ...compositionOverlay, shapes })
    },
    [compositionOverlay, updateCompositionOverlay],
  )

  const commitCompositionShapeHistory = useCallback(
    (shapes: CompositionOverlayShape[]) => {
      const previous =
        compositionShapeHistoryRef.current[compositionShapeHistoryIndex] ?? []
      const next = shapes.map((shape) => ({
        ...shape,
        start: { ...shape.start },
        end: { ...shape.end },
        ...(shape.control ? { control: { ...shape.control } } : {}),
      }))
      if (JSON.stringify(previous) === JSON.stringify(next)) return
      const history = [
        ...compositionShapeHistoryRef.current.slice(
          0,
          compositionShapeHistoryIndex + 1,
        ),
        next,
      ]
      compositionShapeHistoryRef.current = history
      setCompositionShapeHistoryIndex(history.length - 1)
    },
    [compositionShapeHistoryIndex],
  )

  const restoreCompositionShapeHistory = useCallback(
    (index: number) => {
      const shapes = compositionShapeHistoryRef.current[index]
      if (!shapes) return
      setCompositionShapeHistoryIndex(index)
      setSelectedCompositionShapeId(null)
      updateCompositionOverlay({
        ...compositionOverlay,
        shapes: shapes.map((shape) => ({
          ...shape,
          start: { ...shape.start },
          end: { ...shape.end },
          ...(shape.control ? { control: { ...shape.control } } : {}),
        })),
      })
    },
    [compositionOverlay, updateCompositionOverlay],
  )

  const undoCompositionShapes = useCallback(
    () => restoreCompositionShapeHistory(compositionShapeHistoryIndex - 1),
    [compositionShapeHistoryIndex, restoreCompositionShapeHistory],
  )
  const redoCompositionShapes = useCallback(
    () => restoreCompositionShapeHistory(compositionShapeHistoryIndex + 1),
    [compositionShapeHistoryIndex, restoreCompositionShapeHistory],
  )
  const deleteSelectedCompositionShape = useCallback(() => {
    if (!selectedCompositionShapeId) return
    const shapes = compositionOverlay.shapes.filter(
      (shape) => shape.id !== selectedCompositionShapeId,
    )
    updateCompositionShapes(shapes)
    commitCompositionShapeHistory(shapes)
    setSelectedCompositionShapeId(null)
  }, [
    commitCompositionShapeHistory,
    compositionOverlay.shapes,
    selectedCompositionShapeId,
    updateCompositionShapes,
  ])

  useEffect(() => {
    onProjectUpdatedRef.current = onProjectUpdated
  }, [onProjectUpdated])

  const saveCurrentProject = useEditorPersistence({
    projectId,
    currentProject: mediaProject,
    expectedUpdatedAt: editorSaveBaselineRef.current,
    projectTitle,
    compositionOverlay,
    contentOverlay,
    frameRate: media.metadata?.frameRate ?? FPS,
    shots,
    shotFrames,
    shotScreenshotIds,
    primaryShotScreenshotIds,
    shotBoundaryScreenshotIds,
    shotNotes,
    shotEntries: shotDims,
    shotStatuses,
    shotGroups,
    annotationMarkers,
    template,
    loadedProjectId,
    loadedShotGroupProjectId,
    autoShotDetection: autoShotDetectionRef.current,
    researchRanges: researchWorkbench.ranges,
    researchContexts: researchWorkbench.contexts,
    onProjectUpdated: (updatedProject) => {
      setMediaProject(updatedProject)
      editorSaveBaselineRef.current = updatedProject.updatedAt
      onProjectUpdatedRef.current(updatedProject)
    },
  })

  const {
    status: saveStatus,
    isDirty,
    markDirty,
    saveNow,
  } = useEditorSaveState({ projectId, save: saveCurrentProject })

  const leaveEditor = useCallback(async () => {
    const pendingSave = saveNow()
    onNavigate(2)

    try {
      await pendingSave
    } catch (error) {
      toast.error(error instanceof Error ? `已返回项目库，但保存失败：${error.message}` : "已返回项目库，但保存失败，请重新打开项目重试。")
    }
  }, [onNavigate, saveNow])

  const navigationGuardRef = useRef(false)
  const historyGuardInstalledRef = useRef(false)
  const allowNextPopRef = useRef(false)
  useEffect(() => {
    if (!historyGuardInstalledRef.current) {
      window.history.pushState({ aisenlensEditorGuard: true }, "", window.location.href)
      historyGuardInstalledRef.current = true
    }
    const handleBrowserBack = () => {
      if (allowNextPopRef.current) {
        allowNextPopRef.current = false
        return
      }
      if (navigationGuardRef.current) return
      navigationGuardRef.current = true
      if (!isDirty) {
        allowNextPopRef.current = true
        window.history.back()
        navigationGuardRef.current = false
        return
      }
      void leaveEditor().finally(() => { navigationGuardRef.current = false })
    }
    window.addEventListener("popstate", handleBrowserBack)
    return () => window.removeEventListener("popstate", handleBrowserBack)
  }, [isDirty, leaveEditor])

  const saveDataSignature = useMemo(
    () => JSON.stringify({
      title: projectTitle,
      shots,
      shotFrames,
      shotScreenshotIds,
      primaryShotScreenshotIds,
      shotBoundaryScreenshotIds,
      shotNotes,
      shotDims,
      annotationMarkers,
      shotGroups,
      template,
      compositionOverlay,
      contentOverlay,
      researchRanges: researchWorkbench.ranges,
      researchContexts: researchWorkbench.contexts,
    }),
    [
      annotationMarkers,
      compositionOverlay,
      contentOverlay,
      primaryShotScreenshotIds,
      projectTitle,
      shotBoundaryScreenshotIds,
      shotDims,
      shotFrames,
      shotGroups,
      shotNotes,
      shotStatuses,
      shotScreenshotIds,
      shots,
      researchWorkbench.contexts,
      researchWorkbench.ranges,
      template,
    ],
  )
  const savedDataSignatureRef = useRef<string | null>(null)

  useEffect(() => {
    const isReady =
      loadedProjectId === projectId &&
      loadedShotGroupProjectId === projectId &&
      template !== null
    if (!isReady) {
      savedDataSignatureRef.current = null
      return
    }
    if (savedDataSignatureRef.current === null) {
      savedDataSignatureRef.current = saveDataSignature
      return
    }
    if (savedDataSignatureRef.current !== saveDataSignature) {
      savedDataSignatureRef.current = saveDataSignature
      markDirty()
    }
  }, [
    loadedProjectId,
    loadedShotGroupProjectId,
    markDirty,
    projectId,
    saveDataSignature,
    template,
  ])

  useEffect(() => {
    const saveSnapshot = () => {
      void createProjectRecoverySnapshot(projectId).catch(() => undefined)
    }
    const interval = window.setInterval(saveSnapshot, SNAPSHOT_INTERVAL_MS)
    return () => window.clearInterval(interval)
  }, [projectId])

  useEffect(() => {
    const requestId = ++editorLoadRequestRef.current
    const isCurrent = () => requestId === editorLoadRequestRef.current
    setEditorLoadError(null)
    editorHistory.reset()
    setLoadedProjectId(null)
    setShots([])
    setActiveShot(0)
    setShotFrames({})
    setShotScreenshotIds({})
    setPrimaryShotScreenshotIds({})
    setShotBoundaryScreenshotIds({})
    setShotScreenshotUrls({})
    setScreenshotFrames({})
    setScreenshotCompositionOverlayIncluded({})
    setScreenshotCompositionOverlaySignatures({})
    setHasLoadedScreenshotFrames(false)
    setShotNotes({})
    setShotDims({})
    setShotStatuses({})
    setShotGroups([])
    setSelectedShotIds([])
    setSelectedGroupId(null)
    setLoadedShotGroupProjectId(null)
    setCollapsedGroupIds([])
    setIsSelectingGroupShots(false)
    setAnnotationMarkers([])
    void loadProjectShots(projectId).then((savedShots) => {
      if (!isCurrent()) return
      if (savedShots.length) {
        const frameRate = media.metadata?.frameRate ?? FPS
        const displayFieldValue = (shot: (typeof savedShots)[number], fieldId: string) => {
          const entry = shot.analysisFields[fieldId]
          if (!entry || entry.state !== "set") return "未分析"
          if (typeof entry.value !== "string") return "已记录"
          const definition = templateRef.current?.fieldDefinitions.find((field) => field.fieldId === fieldId)
          return definition?.options.find((option) => option.id === entry.value)?.label ?? "已记录"
        }
        setShots(
          savedShots.map((shot) => ({
            id: shot.id,
            start: shot.startFrame / frameRate,
            duration: (shot.endFrame - shot.startFrame) / frameRate,
            type: displayFieldValue(shot, "shot"),
            motion: displayFieldValue(shot, "motion"),
            color: displayFieldValue(shot, "color"),
          })),
        )
        setShotFrames(
          Object.fromEntries(
            savedShots.map((shot) => [
              shot.id,
              { first: shot.startFrame, last: shot.endFrame - 1 },
            ]),
          ),
        )
        setShotScreenshotIds(
          Object.fromEntries(
            savedShots
              .map((shot) => [shot.id, shot.screenshotIds])
              .filter(([, screenshotIds]) => screenshotIds.length),
          ),
        )
        setPrimaryShotScreenshotIds(
          Object.fromEntries(
            savedShots.map((shot) => [shot.id, shot.primaryScreenshotId]),
          ),
        )
        setShotBoundaryScreenshotIds(
          Object.fromEntries(
            savedShots.map((shot) => [
              shot.id,
              {
                first: shot.firstFrameScreenshotId ?? null,
                last: shot.lastFrameScreenshotId ?? null,
              },
            ]),
          ),
        )
        setShotDims(
          Object.fromEntries(
            savedShots.map((shot) => [shot.id, shot.analysisFields]),
          ),
        )
        setShotStatuses(Object.fromEntries(savedShots.map((shot) => [shot.id, shot.status])))
        setShotNotes(
          Object.fromEntries(
            savedShots.map((shot) => [
              shot.id,
              { content: shot.description, analysis: shot.notes },
            ]),
          ),
        )
      } else setHasLoadedScreenshotFrames(true)
      if (isCurrent()) setLoadedProjectId(projectId)
    }).catch((error) => {
      if (isCurrent()) setEditorLoadError(error instanceof Error ? error.message : "分镜数据读取失败，请重试。")
    })
    return () => {
      editorLoadRequestRef.current += 1
    }
  }, [dataLoadRevision, editorHistory.reset, projectId, videoUrl, media.metadata?.frameRate])

  useEffect(() => {
    if (hasLoadedScreenshotFrames || !loadedProjectId || !shots.length) return
    const requestId = ++editorLoadRequestRef.current
    const isCurrent = () => requestId === editorLoadRequestRef.current
    const savedScreenshotIds = [
      ...new Set(
        shots.flatMap((shot) =>
          [
            ...shotScreenshotIds[shot.id] ?? [],
            shotBoundaryScreenshotIds[shot.id]?.first,
            shotBoundaryScreenshotIds[shot.id]?.last,
          ].filter((screenshotId): screenshotId is string => Boolean(screenshotId)),
        ),
      ),
    ]
    if (!savedScreenshotIds.length) {
      setHasLoadedScreenshotFrames(true)
      return
    }
    void Promise.all(
      savedScreenshotIds.map(
        async (screenshotId) => [screenshotId, await projectRepository.getScreenshot(screenshotId)] as const,
      ),
    )
      .then((items) => {
        if (!isCurrent()) return
        setScreenshotFrames(Object.fromEntries(items.flatMap(([id, resource]) => resource ? [[id, resource.screenshot.frame] as const] : [])))
        setScreenshotCompositionOverlayIncluded(Object.fromEntries(items.flatMap(([id, resource]) => resource ? [[id, Boolean(resource.screenshot.compositionOverlayIncluded)] as const] : [])))
        setScreenshotCompositionOverlaySignatures(Object.fromEntries(items.flatMap(([id, resource]) => resource ? [[id, resource.screenshot.compositionOverlaySignature ?? "none"] as const] : [])))
      })
      .catch((error) => {
        if (isCurrent()) setEditorLoadError(error instanceof Error ? error.message : "截图数据读取失败，请重试。")
      })
      .finally(() => {
        if (isCurrent()) setHasLoadedScreenshotFrames(true)
      })
    return () => {
      editorLoadRequestRef.current += 1
    }
  }, [hasLoadedScreenshotFrames, loadedProjectId, shotBoundaryScreenshotIds, shotScreenshotIds, shots])

  useEffect(() => {
    let active = true
    void loadProjectAnnotationMarkers(projectId)
      .then((markers) => { if (active) setAnnotationMarkers(markers) })
      .catch((error) => { if (active) setEditorLoadError(error instanceof Error ? error.message : "时间线标记读取失败，请重试。") })
    return () => { active = false }
  }, [dataLoadRevision, projectId])

  useEffect(() => {
    let active = true
    void loadProjectShotGroups(projectId)
      .then((groups) => {
        if (!active) return
        setShotGroups(groups)
        setLoadedShotGroupProjectId(projectId)
      })
      .catch((error) => { if (active) setEditorLoadError(error instanceof Error ? error.message : "分组数据读取失败，请重试。") })
    return () => { active = false }
  }, [dataLoadRevision, projectId])

  useEffect(() => {
    let active = true
    setTemplate(null)
    void loadOrCreateProjectTemplate(projectId)
      .then((nextTemplate) => { if (active) setTemplate(nextTemplate) })
      .catch((error) => { if (active) setEditorLoadError(error instanceof Error ? error.message : "分析模板读取失败，请重试。") })
    return () => { active = false }
  }, [dataLoadRevision, projectId])

  useEffect(() => {
    const source = media.source
    if (!source || !videoUrl || durationSeconds <= 0) {
      setWaveformPeaks(null)
      setWaveformUnavailable(false)
      return
    }
    let active = true
    const controller = new AbortController()
    setWaveformPeaks(null)
    setWaveformUnavailable(false)
    const loadWaveform = () => {
      void loadOrGenerateWaveform({
        projectId,
        sourceUrl: videoUrl,
        mediaFingerprint: source,
        durationSeconds,
        signal: controller.signal,
      })
        .then((peaks) => {
          if (active) setWaveformPeaks(peaks)
        })
        .catch(() => {
          if (active) setWaveformUnavailable(true)
        })
    }
    const idleWindow = window as Window & {
      requestIdleCallback?: (callback: () => void, options?: { timeout: number }) => number
      cancelIdleCallback?: (id: number) => void
    }
    const idleCallbackId = idleWindow.requestIdleCallback?.(loadWaveform, { timeout: 2_000 })
    const timeoutId = idleCallbackId === undefined
      ? window.setTimeout(loadWaveform, 750)
      : null
    return () => {
      active = false
      controller.abort()
      if (idleCallbackId !== undefined) idleWindow.cancelIdleCallback?.(idleCallbackId)
      if (timeoutId !== null) window.clearTimeout(timeoutId)
    }
  }, [durationSeconds, media.source, projectId, videoUrl])

  useEffect(() => {
    let active = true
    const screenshotIds = [
      ...new Set([
        ...Object.values(shotScreenshotIds).flat(),
        ...Object.values(shotBoundaryScreenshotIds).flatMap((frames) =>
          [frames.first, frames.last].filter(
            (screenshotId): screenshotId is string => Boolean(screenshotId),
          ),
        ),
      ]),
    ]
    void Promise.all(
      screenshotIds.map(
        async (screenshotId) =>
          [screenshotId, await loadScreenshotUrl(screenshotId)] as const,
      ),
    ).then((entries) => {
      if (!active) {
        entries.forEach(([, url]) => {
          if (url) URL.revokeObjectURL(url)
        })
        return
      }
      setShotScreenshotUrls(Object.fromEntries(entries))
    })
    return () => {
      active = false
    }
  }, [shotScreenshotIds, shotBoundaryScreenshotIds])

  useEffect(() => {
    if (
      loadedProjectId !== projectId ||
      durationSeconds <= 0 ||
      shots.length > 0
    )
      return
    const initialShot: ShotData = {
      id: crypto.randomUUID(),
      start: 0,
      duration: durationSeconds,
      type: "未分析",
      motion: "未分析",
      color: "未分析",
    }
    setShots([initialShot])
    setShotFrames({
      [initialShot.id]: {
        first: 0,
        last: Math.max(0, Math.round(durationSeconds * FPS) - 1),
      },
    })
  }, [durationSeconds, shots.length, loadedProjectId, projectId])

  useEffect(() => {
    if (loadedShotGroupProjectId !== projectId) return
    const reconciled = reconcileShotGroups(
      shotGroups,
      shots.map((shot) => shot.id),
    )
    if (JSON.stringify(reconciled) !== JSON.stringify(shotGroups)) {
      setShotGroups(reconciled)
      return
    }
  }, [loadedShotGroupProjectId, projectId, shotGroups, shots])

  useEffect(() => {
    if (
      selectedGroupId &&
      !shotGroups.some((group) => group.id === selectedGroupId)
    )
      setSelectedGroupId(null)
  }, [selectedGroupId, shotGroups])

  useEffect(() => {
    const frameRate = media.metadata?.frameRate ?? FPS
    if (
      !hasLoadedScreenshotFrames ||
      !videoUrl ||
      durationSeconds <= 0 ||
      shots.length === 0
    )
      return
    const targets = shots
      .flatMap((shot) => {
        const frames = shotFrames[shot.id] ?? {
          first: Math.round(shot.start * frameRate),
          last: Math.max(
            0,
            Math.round((shot.start + shot.duration) * frameRate) - 1,
          ),
        }
        return [
          { shotId: shot.id, edge: "first" as const, frame: frames.first },
          { shotId: shot.id, edge: "last" as const, frame: frames.last },
        ]
      })
      .filter(({ shotId, edge, frame }) => {
        const screenshotId = shotBoundaryScreenshotIds[shotId]?.[edge]
        return !screenshotId || screenshotFrames[screenshotId] !== frame
      })
    if (!targets.length) return

    let active = true
    void (async () => {
      let shouldRetry = false
      for (const target of targets) {
        const key = `${projectId}:${target.shotId}:${target.edge}:${target.frame}`
        if (boundaryCaptureKeysRef.current.has(key)) continue
        boundaryCaptureKeysRef.current.add(key)
        try {
          const screenshot = await captureVideoFrameScreenshot({
            projectId,
            sourceUrl: videoUrl,
            frame: target.frame,
            frameRate,
            durationSeconds,
          })
          const url = await loadScreenshotUrl(screenshot.id)
          if (active) {
            setShotBoundaryScreenshotIds((current) => ({
              ...current,
              [target.shotId]: {
                ...(current[target.shotId] ?? { first: null, last: null }),
                [target.edge]: screenshot.id,
              },
            }))
            if (target.edge === "first") {
              const previousFirstScreenshotId =
                shotBoundaryScreenshotIds[target.shotId]?.first ?? null
              setPrimaryShotScreenshotIds((current) => {
                const primaryScreenshotId = current[target.shotId] ?? null
                return primaryScreenshotId === null ||
                  primaryScreenshotId === previousFirstScreenshotId
                  ? { ...current, [target.shotId]: screenshot.id }
                  : current
              })
            }
            setShotScreenshotUrls((current) => ({
              ...current,
              [screenshot.id]: url,
            }))
            setScreenshotFrames((current) => ({
              ...current,
              [screenshot.id]: screenshot.frame,
            }))
            setScreenshotCompositionOverlayIncluded((current) => ({
              ...current,
              [screenshot.id]: screenshot.compositionOverlayIncluded,
            }))
            setScreenshotCompositionOverlaySignatures((current) => ({
              ...current,
              [screenshot.id]: screenshot.compositionOverlaySignature,
            }))
          } else if (url) URL.revokeObjectURL(url)
        } catch {
          const retries = boundaryCaptureRetriesRef.current.get(key) ?? 0
          if (retries < 2) {
            boundaryCaptureRetriesRef.current.set(key, retries + 1)
            shouldRetry = true
          }
        } finally {
          boundaryCaptureKeysRef.current.delete(key)
        }
      }
      if (active && shouldRetry)
        window.setTimeout(
          () => setBoundaryCaptureRevision((revision) => revision + 1),
          300,
        )
    })()
    return () => {
      active = false
    }
  }, [
    boundaryCaptureRevision,
    durationSeconds,
    hasLoadedScreenshotFrames,
    media.metadata?.frameRate,
    projectId,
    shotFrames,
    shots,
    videoUrl,
  ])

  const commitTitle = () => {
    const t = titleDraft.trim() || projectTitle
    setProjectTitle(t)
    setTitleDraft(t)
    setEditingTitle(false)
  }

  const startAutoShotDetection = async (restart = false) => {
    const shouldResume = !restart && autoShotRun?.status === "paused"
    await autoShotTask.start({ resume: shouldResume, restart })
  }

  const updateCalibration = (updater: (current: CalibrationAnnotationRecord) => CalibrationAnnotationRecord) => {
    setCalibrationAnnotation((current) => {
      if (!current) return current
      const next = updater(current)
      void projectRepository.saveCalibrationAnnotation(next).catch((error) => {
        toast.error(error instanceof Error ? error.message : "标定数据保存失败，请稍后重试。")
      })
      return next
    })
  }

  const exportCalibrationAnnotation = () => {
    if (!calibrationAnnotation) return
    const blob = new Blob([serializeCalibrationAnnotation(calibrationAnnotation)], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = `${calibrationAnnotation.fixtureId.replace(/[^a-zA-Z0-9_-]+/g, "-")}.annotation.json`
    link.click()
    URL.revokeObjectURL(url)
  }

  const addCalibrationBoundaryAtPlayhead = () => {
    const frameRate = media.metadata?.frameRate ?? FPS
    updateCalibration((current) => updateHardCutAnnotation(current, "add", {
      timestampUs: Math.round(currentTime * 1_000_000),
      frame: Math.max(1, Math.round(currentTime * frameRate)),
    }))
  }

  const markCalibrationUncertainAtPlayhead = () => {
    const startUs = Math.max(0, Math.round(currentTime * 1_000_000))
    const endUs = Math.min(Math.max(startUs + 100_000, startUs + 1_000_000), Math.max(startUs + 1, Math.round(durationSeconds * 1_000_000)))
    if (endUs <= startUs) return
    updateCalibration((current) => addUncertainRange(current, { startUs, endUs, reason: "待人工确认" }))
  }

  const moveCalibrationBoundaryToPlayhead = (boundaryId: string) => {
    const frameRate = media.metadata?.frameRate ?? FPS
    updateCalibration((current) => updateHardCutAnnotation(current, "move", {
      id: boundaryId,
      timestampUs: Math.round(currentTime * 1_000_000),
      frame: Math.max(1, Math.round(currentTime * frameRate)),
    }))
  }

  const correctCalibrationCandidateAtPlayhead = (candidate: AutoShotCandidate) => {
    const frameRate = media.metadata?.frameRate ?? FPS
    updateCalibration((current) => updateHardCutAnnotation(current, "correct", {
      candidate,
      timestampUs: Math.round(currentTime * 1_000_000),
      frame: Math.max(1, Math.round(currentTime * frameRate)),
      note: "候选位置已人工修正",
    }))
  }

  const deleteCalibrationBoundary = (boundaryId: string) => {
    updateCalibration((current) => updateHardCutAnnotation(current, "delete", { id: boundaryId }))
  }

  const deleteCalibrationUncertainRange = (rangeId: string) => {
    updateCalibration((current) => ({
      ...current,
      uncertainRanges: current.uncertainRanges.filter((range) => range.id !== rangeId),
      updatedAt: new Date().toISOString(),
    }))
  }

  const locateCalibrationBoundary = (timestampUs: number) => {
    setCurrentTime(Math.min(Math.max(timestampUs / 1_000_000, 0), durationSeconds))
  }

  const playShot = (index: number) => {
    const shot = shots[index]
    if (!shot) return
    const frameRate = media.metadata?.frameRate ?? FPS
    const storedFrames = shotFrames[shot.id]
    const startFrame =
      storedFrames?.first ?? Math.round(shot.start * frameRate)
    const lastFrame =
      storedFrames?.last ??
      Math.max(
        startFrame,
        Math.round((shot.start + shot.duration) * frameRate) - 1,
      )
    setActiveShot(index)
    shotPlaybackEndRef.current = lastFrame / frameRate
    setCurrentTime(startFrame / frameRate)
    setPlaying(true)
  }

  const playViewRange = (shouldPlay: boolean) => {
    if (!shouldPlay) {
      shotPlaybackEndRef.current = null
      setPlaying(false)
      return
    }
    const frameRate = media.metadata?.frameRate ?? FPS
    if (viewRange.inFrame !== null && viewRange.outFrame !== null) {
      const rangeStart = viewRange.inFrame / frameRate
      const rangeEnd = (viewRange.outFrame + 1) / frameRate
      if (currentTime < rangeStart || currentTime >= rangeEnd)
        setCurrentTime(rangeStart)
      shotPlaybackEndRef.current = rangeEnd
    } else {
      shotPlaybackEndRef.current = null
    }
    setPlaying(true)
  }

  const playShotGroup = (groupId: string) => {
    const group = shotGroups.find((item) => item.id === groupId)
    if (!group) return
    const indexes = getShotGroupIndexes(
      group,
      shots.map((shot) => shot.id),
    )
    if (!indexes) return
    const first = shots[indexes.first]
    const last = shots[indexes.last]
    setActiveShot(indexes.first)
    shotPlaybackEndRef.current = last.start + last.duration
    setCurrentTime(first.start)
    setPlaying(true)
  }

  const handleVideoTimeUpdate = (
    event: React.SyntheticEvent<HTMLVideoElement>,
  ) => {
    onTimeUpdate(event)
    const endTime = shotPlaybackEndRef.current
    if (endTime !== null && event.currentTarget.currentTime >= endTime) {
      event.currentTarget.currentTime = endTime
      shotPlaybackEndRef.current = null
      setCurrentTime(endTime)
      setPlaying(false)
    }
  }

  const saveTemplate = (nextTemplate: ProjectTemplateSnapshot, baseVersion: number): boolean => {
    if (!template || template.version !== baseVersion) {
      toast.error("模板已在其他编辑流程中更新，请重新打开设置后再应用。")
      return false
    }
    if (JSON.stringify(nextTemplate) === JSON.stringify(template)) return true
    const issues = validateProjectAnalysisProfile(nextTemplate)
    if (issues.length) {
      toast.error(issues[0]?.message ?? "模板配置无效，请修正后重试。")
      return false
    }
    editorHistory.commit()
    setTemplate({ ...structuredClone(nextTemplate), updatedAt: new Date().toISOString(), version: template.version + 1 })
    return true
  }

  const handleBoundaryCommit = (
    boundaryIndex: number,
    frame: number,
    focusShotIndex: number,
  ) => {
    const detectedFrameRate = media.metadata?.frameRate
    const frameRate =
      Number.isFinite(detectedFrameRate) && detectedFrameRate! > 0
        ? detectedFrameRate!
        : FPS
    const ranges = getShotRanges(frameRate)
    const updatedRanges = moveSharedShotBoundary(
      ranges,
      boundaryIndex,
      Math.round(frame),
    )
    if (updatedRanges === ranges) return
    editorHistory.commit()
    const rangeById = new Map(updatedRanges.map((range) => [range.id, range]))
    setShots((currentShots) =>
      currentShots.map((shot) => {
        const range = rangeById.get(shot.id)!
        return {
          ...shot,
          start: range.startFrame / frameRate,
          duration: (range.endFrame - range.startFrame) / frameRate,
        }
      }),
    )
    setShotFrames((currentFrames) => ({
      ...currentFrames,
      ...Object.fromEntries(
        updatedRanges.map((range) => [
          range.id,
          { first: range.startFrame, last: range.endFrame - 1 },
        ]),
      ),
    }))
    setShotBoundaryScreenshotIds((current) => ({
      ...current,
      [updatedRanges[boundaryIndex].id]: {
        ...(current[updatedRanges[boundaryIndex].id] ?? {
          first: null,
          last: null,
        }),
        last: null,
      },
      [updatedRanges[boundaryIndex + 1].id]: {
        ...(current[updatedRanges[boundaryIndex + 1].id] ?? {
          first: null,
          last: null,
        }),
        first: null,
      },
    }))
    const focusedRange = updatedRanges[focusShotIndex]
    if (!focusedRange) return
    const focusFrame =
      focusShotIndex === boundaryIndex
        ? focusedRange.endFrame - 1
        : focusedRange.startFrame
    setCurrentTime(focusFrame / frameRate)
  }

  /* Screenshot actions */
  const handleUpdateScreenshot = async () => {
    if (!videoUrl || durationSeconds <= 0) return
    setIsCapturingScreenshot(true)
    try {
      const frameRate = media.metadata?.frameRate ?? FPS
      const screenshot = await captureVideoFrameScreenshot({
        projectId,
        sourceUrl: videoUrl,
        frame: Math.round(currentTime * frameRate),
        frameRate,
        durationSeconds,
        compositionOverlay,
      })
      const nextUrl = await loadScreenshotUrl(screenshot.id)
      const activeShotId = shots[activeShot]?.id
      if (activeShotId) {
        const replacedScreenshotIds = shotScreenshotIds[activeShotId] ?? []
        await Promise.all(
          replacedScreenshotIds.map((screenshotId) =>
            projectRepository.deleteScreenshot(screenshotId),
          ),
        )
        setShotScreenshotIds((current) => ({
          ...current,
          [activeShotId]: [screenshot.id],
        }))
        setPrimaryShotScreenshotIds((current) => ({
          ...current,
          [activeShotId]: screenshot.id,
        }))
        setShotScreenshotUrls((current) => ({
          ...current,
          [screenshot.id]: nextUrl,
        }))
        setScreenshotFrames((current) => ({
          ...current,
          [screenshot.id]: screenshot.frame,
        }))
        setScreenshotCompositionOverlayIncluded((current) => ({
          ...current,
          [screenshot.id]: screenshot.compositionOverlayIncluded,
        }))
        setScreenshotCompositionOverlaySignatures((current) => ({
          ...current,
          [screenshot.id]: screenshot.compositionOverlaySignature,
        }))
      }
    } finally {
      setIsCapturingScreenshot(false)
    }
  }

  const getShotRanges = (frameRate: number) =>
    shots.map((shot) => {
      const storedFrames = shotFrames[shot.id]
      const fallbackStartFrame = Math.round(shot.start * frameRate)
      const fallbackEndFrame = Math.max(
        fallbackStartFrame + 1,
        Math.round((shot.start + shot.duration) * frameRate),
      )
      const hasValidStoredRange =
        Number.isFinite(storedFrames?.first) &&
        Number.isFinite(storedFrames?.last) &&
        storedFrames!.last >= storedFrames!.first
      return {
        id: shot.id,
        startFrame: hasValidStoredRange
          ? storedFrames!.first
          : fallbackStartFrame,
        endFrame: hasValidStoredRange
          ? storedFrames!.last + 1
          : fallbackEndFrame,
      }
    })

  useEffect(() => {
    const frameRate = media.metadata?.frameRate ?? FPS
    const ranges = getShotRanges(frameRate)
    const lastFrame = Math.max(0, Math.round(durationSeconds * frameRate) - 1)
    const currentFrame = Math.min(
      lastFrame,
      Math.max(0, Math.round(currentTime * frameRate)),
    )
    const shotIndex = ranges.findIndex(
      (range) =>
        currentFrame >= range.startFrame && currentFrame < range.endFrame,
    )
    if (shotIndex >= 0 && shotIndex !== activeShot) setActiveShot(shotIndex)
  }, [
    activeShot,
    currentTime,
    durationSeconds,
    media.metadata?.frameRate,
    shots,
    shotFrames,
  ])

  const handleMergeShotAtIndex = (index: number) => {
    if (shots.length <= 1) return
    const firstIndex = index === 0 ? 0 : index - 1
    const secondIndex = firstIndex + 1
    const frameRate = media.metadata?.frameRate ?? FPS
    const mergedRanges = mergeAdjacentShotRanges(
      getShotRanges(frameRate),
      firstIndex,
    )
    const mergedRange = mergedRanges[firstIndex]
    if (!mergedRange) return
    editorHistory.commit()
    const first = shots[firstIndex]
    const second = shots[secondIndex]
    const mergedShot = {
      ...first,
      start: mergedRange.startFrame / frameRate,
      duration: (mergedRange.endFrame - mergedRange.startFrame) / frameRate,
    }
    setShots((previous) => [
      ...previous.slice(0, firstIndex),
      mergedShot,
      ...previous.slice(secondIndex + 1),
    ])
    setShotFrames((previous) => ({
      ...previous,
      [first.id]: {
        first: mergedRange.startFrame,
        last: mergedRange.endFrame - 1,
      },
    }))
    setShotScreenshotIds((previous) => ({
      ...previous,
      [first.id]: [
        ...(previous[first.id] ?? []),
        ...(previous[second.id] ?? []),
      ],
    }))
    setShotBoundaryScreenshotIds((previous) => ({
      ...previous,
      [first.id]: { first: previous[first.id]?.first ?? null, last: null },
    }))
    setShotNotes((previous) => ({
      ...previous,
      [first.id]: {
        content: [previous[first.id]?.content, previous[second.id]?.content]
          .filter(Boolean)
          .join("\n\n"),
        analysis: [previous[first.id]?.analysis, previous[second.id]?.analysis]
          .filter(Boolean)
          .join("\n\n"),
      },
    }))
    setActiveShot(firstIndex)
  }

  const getManualSplitResult = (
    createShotId: () => string = () => crypto.randomUUID(),
  ) => {
    if (
      !videoUrl ||
      durationSeconds <= 0 ||
      playbackStatus === "loading" ||
      playbackStatus === "error"
    ) {
      return { ok: false as const, code: "media-not-ready" as const }
    }
    const frameRate = media.metadata?.frameRate ?? FPS
    return splitManualShotAtFrame({
      ranges: getShotRanges(frameRate),
      targetShotId: shots[activeShot]?.id ?? null,
      splitFrame: Math.round(currentTime * frameRate),
      createShotId,
    })
  }

  const handleSplitShotAtPlayhead = () => {
    const result = getManualSplitResult()
    if (!result.ok) {
      toast.error(getManualShotSplitFailureMessage(result.code))
      return
    }

    const frameRate = media.metadata?.frameRate ?? FPS
    const originalShotIndex = shots.findIndex(
      (shot) => shot.id === result.originalRange.id,
    )
    const originalShot = shots[originalShotIndex]
    if (!originalShot) {
      toast.error(getManualShotSplitFailureMessage("no-active-shot"))
      return
    }

    const now = new Date().toISOString()
    const newShot: ShotData = {
      ...originalShot,
      id: result.newRange.id,
      start: result.newRange.startFrame / frameRate,
      duration:
        (result.newRange.endFrame - result.newRange.startFrame) / frameRate,
      type: "未分析",
      motion: "未分析",
      color: "未分析",
    }
    const updatedShotIds = [
      ...shots.slice(0, originalShotIndex + 1).map((shot) => shot.id),
      newShot.id,
      ...shots.slice(originalShotIndex + 1).map((shot) => shot.id),
    ]

    editorHistory.commit()
    setShots((current) => [
      ...current.slice(0, originalShotIndex),
      {
        ...originalShot,
        start: result.originalRange.startFrame / frameRate,
        duration:
          (result.originalRange.endFrame - result.originalRange.startFrame) /
          frameRate,
      },
      newShot,
      ...current.slice(originalShotIndex + 1),
    ])
    setShotFrames((current) => ({
      ...current,
      [result.originalRange.id]: {
        first: result.originalRange.startFrame,
        last: result.originalRange.endFrame - 1,
      },
      [result.newRange.id]: {
        first: result.newRange.startFrame,
        last: result.newRange.endFrame - 1,
      },
    }))
    setShotScreenshotIds((current) => ({ ...current, [newShot.id]: [] }))
    setPrimaryShotScreenshotIds((current) => ({ ...current, [newShot.id]: null }))
    setShotBoundaryScreenshotIds((current) => ({
      ...current,
      [result.originalRange.id]: {
        ...(current[result.originalRange.id] ?? { first: null, last: null }),
        last: null,
      },
      [newShot.id]: { first: null, last: null },
    }))
    setShotNotes((current) => ({
      ...current,
      [newShot.id]: { content: "", analysis: "" },
    }))
    setShotDims((current) => ({ ...current, [newShot.id]: {} }))
    setAnnotationMarkers((current) =>
      current.map((marker) =>
        marker.shotId === result.originalRange.id &&
        marker.frame >= result.newRange.startFrame
          ? { ...marker, shotId: newShot.id, updatedAt: now }
          : marker,
      ),
    )
    setShotGroups((current) => reconcileShotGroups(current, updatedShotIds))
    setActiveShot(originalShotIndex + 1)
    setCurrentTime(result.newRange.startFrame / frameRate)
    toast.success("已在播放头位置分割当前分镜。")
  }

  const toggleTool = (id: PanelToolId) =>
    setActiveTool((prev) => (prev === id ? null : id))

  const createAnnotationMarker = (category: AnnotationMarkerCategory) => {
    const frameRate = media.metadata?.frameRate ?? FPS
    const now = new Date().toISOString()
    const categoryLabels: Record<AnnotationMarkerCategory, string> = {
      important: "重要镜头",
      composition: "构图精妙",
      emotion: "情绪高点",
      "turning-point": "转折点",
    }
    const marker: AnnotationMarker = {
      id: crypto.randomUUID(),
      projectId,
      frame: Math.round(currentTime * frameRate),
      shotId: activeShotId || null,
      category,
      label: categoryLabels[category],
      note: "",
      createdAt: now,
      updatedAt: now,
    }
    editorHistory.commit()
    setAnnotationMarkers((current) => [...current, marker])
    setSelectedMarkerId(marker.id)
  }

  const updateAnnotationMarker = (marker: AnnotationMarker) => {
    const updatedMarker = { ...marker, updatedAt: new Date().toISOString() }
    editorHistory.commit()
    setAnnotationMarkers((current) =>
      current.map((item) =>
        item.id === updatedMarker.id ? updatedMarker : item,
      ),
    )
  }

  const removeAnnotationMarker = (markerId: string) => {
    editorHistory.commit()
    setAnnotationMarkers((current) =>
      current.filter((marker) => marker.id !== markerId),
    )
    setSelectedMarkerId((current) => (current === markerId ? null : current))
  }

  const selectAnnotationMarker = (marker: AnnotationMarker) => {
    setSelectedMarkerId(marker.id)
    if (marker.shotId) {
      const index = shots.findIndex((shot) => shot.id === marker.shotId)
      if (index >= 0) setActiveShot(index)
    }
    setActiveTool("markers")
  }

  const toggleMarkerCategory = (category: AnnotationMarkerCategory) =>
    setVisibleMarkerCategories((current) =>
      current.includes(category)
        ? current.filter((item) => item !== category)
        : [...current, category],
    )

  const updateShotSelection = (shotId: string, selected: boolean) => {
    setSelectedShotIds((current) =>
      selected
        ? [...new Set([...current, shotId])]
        : current.filter((id) => id !== shotId),
    )
  }

  const createCurrentShotGroup = () => {
    const prefix =
      groupKindDraft === "scene"
        ? "场景"
        : groupKindDraft === "section"
          ? "段落"
          : "序列"
    const count =
      shotGroups.filter((group) => group.kind === groupKindDraft).length + 1
    const group = createShotGroup({
      projectId,
      kind: groupKindDraft,
      title: `${prefix} ${String(count).padStart(2, "0")}`,
      selectedShotIds,
      shotIds: shots.map((shot) => shot.id),
      existingGroups: shotGroups,
    })
    if (!group) return
    editorHistory.commit()
    setShotGroups((current) => [...current, group])
    setSelectedShotIds([])
    setIsSelectingGroupShots(false)
    setSelectedGroupId(group.id)
    setPanel("group")
  }

  const updateCurrentShotGroup = (
    groupId: string,
    patch: Pick<ShotGroupRecord, "title" | "summary" | "kind">,
  ) => {
    editorHistory.commit()
    setShotGroups((current) =>
      current.map((group) =>
        group.id === groupId
          ? { ...group, ...patch, updatedAt: new Date().toISOString() }
          : group,
      ),
    )
  }

  const exportReport = async (format: ExportFormat) => {
    setIsExporting(true)
    try {
      await downloadReport(
        {
          projectTitle,
          shots: shots.map((shot) => ({
            ...shot,
            description: shotNotes[shot.id]?.content ?? "",
            notes: shotNotes[shot.id]?.analysis ?? "",
            analysisFields: shotDims[shot.id] ?? {},
            screenshotId:
              primaryShotScreenshotIds[shot.id] ??
              shotBoundaryScreenshotIds[shot.id]?.first ??
              null,
          })),
          groups: shotGroups,
          fields: resolvedProfile?.fields ?? [],
          screenshotUrls: shotScreenshotUrls,
        },
        format,
      )
      setIsExportDialogOpen(false)
    } finally {
      setIsExporting(false)
    }
  }

  const closeVideoExportDialog = () => {
    if (isVideoExporting) return
    setIsVideoExportDialogOpen(false)
    setVideoExportError(null)
    setVideoExportProgress(null)
  }

  const cancelAnalysisVideoExport = () => {
    videoExportCancelledRef.current = true
    videoExportJobRef.current?.cancel()
  }

  const exportAnalysisVideo = async (
    settings: Partial<VideoExportSettings>,
  ) => {
    if (isVideoExporting) return
    setIsVideoExporting(true)
    setVideoExportError(null)
    setVideoExportProgress(null)
    videoExportCancelledRef.current = false
    try {
      const saveTarget = await requestVideoExportSaveTarget({
        title: projectTitle,
        format: settings.format ?? "mp4",
      })
      if (saveTarget.kind === "cancelled") return
      await saveNow()
      const job = startVideoExport({
        project: {
          ...mediaProject,
          title: projectTitle,
          compositionOverlay,
          contentOverlay,
        },
        settings,
        onProgress: setVideoExportProgress,
        writable: saveTarget.kind === "stream" ? saveTarget.writable : undefined,
      })
      videoExportJobRef.current = job
      const result = await job.result
      if (videoExportCancelledRef.current) return
      if (result.blob) {
        const extension = result.mimeType.includes("webm") ? "webm" : "mp4"
        const filenameBase = projectTitle
          .trim()
          .replace(/[\\/:*?"<>|]/g, "-")
          .replace(/\s+/g, " ")
          .slice(0, 80) || "AisenLens-分析视频"
        const url = URL.createObjectURL(result.blob)
        const link = document.createElement("a")
        link.href = url
        link.download = `${filenameBase}.${extension}`
        link.click()
        window.setTimeout(() => URL.revokeObjectURL(url), 1_000)
      }
      setIsVideoExportDialogOpen(false)
      setVideoExportProgress(null)
    } catch (error) {
      if (!videoExportCancelledRef.current) {
        setVideoExportError(
          error instanceof Error ? error.message : "视频导出失败，请重试。",
        )
      }
    } finally {
      videoExportJobRef.current = null
      setIsVideoExporting(false)
    }
  }

  const adjustCurrentShotGroup = (
    groupId: string,
    edge: "start" | "end",
    operation: "extend" | "shrink",
  ) => {
    editorHistory.commit()
    setShotGroups((current) =>
      adjustShotGroupRange({
        groups: current,
        groupId,
        shotIds: shots.map((shot) => shot.id),
        edge,
        operation,
      }),
    )
  }

  /* Toolbar order: home / mask / markers */
  const PANEL_TOOLS: {
    id: Exclude<PanelToolId, null>
    icon: string
    label: string
    short: string
  }[] = [
    { id: "mask", icon: "▥", label: "视频蒙版", short: "蒙版" },
    { id: "markers", icon: "●", label: "时间线标记", short: "标记" },
  ]

  const TOOL_ICONS: Record<Exclude<PanelToolId, null>, LucideIcon> = {
    settings: Settings2,
    markers: Bookmark,
    mask: Grid3X3,
    shortcuts: Keyboard,
    developer: Code2,
  }

  const activeShotId = shots[activeShot]?.id ?? ""
  const detectedEditorFrameRate = media.metadata?.frameRate
  const editorFrameRate =
    Number.isFinite(detectedEditorFrameRate) && detectedEditorFrameRate! > 0
      ? detectedEditorFrameRate!
      : FPS
  const editorShotRanges = getShotRanges(editorFrameRate)
  const activeShotRange = editorShotRanges[activeShot]
  const manualSplitResult = getManualSplitResult(
    () => "manual-shot-preview",
  )
  const manualSplitDisabledReason = manualSplitResult.ok
    ? null
    : getManualShotSplitFailureMessage(manualSplitResult.code)
  const currentFrames = activeShotRange
    ? {
        first: activeShotRange.startFrame,
        last: activeShotRange.endFrame - 1,
      }
    : { first: 0, last: 0 }
  const currentDims = shotDims[activeShotId] ?? {}
  const currentNotes = shotNotes[activeShotId] ?? { content: "", analysis: "" }
  const resolvedProfile = template ? resolveAnalysisProfile(template, "detail_panel") : null
  const handleAnalysisFieldCommand = useCallback((command: AnalysisFieldCommand) => {
    if (!template || !activeShotId) return
    const result = applyAnalysisFieldCommand(template, shotDims[activeShotId] ?? {}, command)
    if (result.error) {
      toast.error(result.error)
      return
    }
    if (!result.changed) return
    if (!historyInputActiveRef.current) editorHistory.commit()
    setShotDims((current) => ({ ...current, [activeShotId]: result.values }))
  }, [activeShotId, editorHistory, shotDims, template])
  const handleCopyPreviousAnalysis = useCallback((fieldId: string, previousShotId: string) => {
    if (!template || !activeShotId) return
    const result = copyPreviousAnalysisField(template, shotDims[previousShotId], shotDims[activeShotId] ?? {}, fieldId)
    if (result.error) {
      toast.error(result.error)
      return
    }
    if (!result.changed) return
    editorHistory.commit()
    setShotDims((current) => ({ ...current, [activeShotId]: result.values }))
  }, [activeShotId, editorHistory, shotDims, template])
  const handleBatchAnalysisCommand = useCallback((command: AnalysisFieldCommand, shotIds: string[]) => {
    if (!template || !shotIds.length) return
    const result = applyAnalysisBatch(template, shotDims, shotIds, command)
    if (result.error) {
      toast.error(result.error)
      return
    }
    if (!result.changed) return
    editorHistory.commit()
    setShotDims(result.valuesByShotId)
  }, [editorHistory, shotDims, template])
  const currentCompleteness = getShotAnalysisCompleteness(
    template ?? { schemaVersion: 2, id: "empty", projectId, name: "", version: 0, sourceProfile: null, fieldDefinitions: [], sections: [], fieldUsages: [], createdAt: "", updatedAt: "" },
    currentDims,
    currentNotes.content,
  )
  const currentShot = shots[activeShot]
  const contentOverlayModel = resolveContentOverlay({
    settings: contentOverlay,
    fields: resolvedProfile?.fields ?? [],
    values: currentDims,
    description: currentNotes.content,
    analysis: currentNotes.analysis,
    shotIndex: activeShot,
    currentTimecode: formatTimecode(currentTime),
    durationSeconds: currentShot?.duration ?? 0,
  })
  const suggestedContentOverlayFieldIds = (resolvedProfile?.fields ?? [])
    .filter((field) => {
      const value = currentDims[field.definition.fieldId]
      return (
        field.definition.fieldId !== "shot_description" && value?.state === "set"
      )
    })
    .slice(0, 5)
    .map((field) => field.definition.fieldId)
  const selectedGroup =
    shotGroups.find((group) => group.id === selectedGroupId) ?? null
  const selectedGroupIndexes = selectedGroup
    ? getShotGroupIndexes(
        selectedGroup,
        shots.map((shot) => shot.id),
      )
    : null
  const selectedGroupDuration = selectedGroupIndexes
    ? shots
        .slice(selectedGroupIndexes.first, selectedGroupIndexes.last + 1)
        .reduce((total, shot) => total + shot.duration, 0)
    : 0
  const completionByShotId = Object.fromEntries(
    shots.map((shot) => {
      const completeness = getShotAnalysisCompleteness(
        template ?? { schemaVersion: 2, id: "empty", projectId, name: "", version: 0, sourceProfile: null, fieldDefinitions: [], sections: [], fieldUsages: [], createdAt: "", updatedAt: "" },
        shotDims[shot.id] ?? {},
        shotNotes[shot.id]?.content ?? "",
      )
      return [
        shot.id,
        {
          filled: completeness.filledFieldCount,
          total: completeness.totalFieldCount,
          missingRequired: completeness.missingRequiredFields.length,
        },
      ]
    }),
  )
  const matchingShotIds = findMatchingShotIds(
    {
      shots,
      groups: shotGroups,
      notesByShotId: shotNotes,
      fieldsByShotId: shotDims,
      screenshotIdsByShotId: shotScreenshotIds,
      primaryScreenshotIdsByShotId: primaryShotScreenshotIds,
      markers: annotationMarkers,
    },
    shotSearchFilters,
  )
  const isFilteringShots = Boolean(
    shotSearchFilters.query.trim() ||
      shotSearchFilters.groupKind !== "all" ||
      shotSearchFilters.status !== "all",
  )
  const saveButton =
    saveStatus === "saving"
      ? {
          label: "保存中",
          icon: LoaderCircle,
          statusDotClassName: null,
          className:
            "border-border text-text-dim hover:border-border-mid hover:bg-white/4 hover:text-white",
          spinning: true,
        }
      : saveStatus === "saved"
        ? {
            label: "保存",
            icon: null,
            statusDotClassName: null,
            className:
              "border-border text-text-dim hover:border-border-mid hover:bg-white/4 hover:text-white",
            spinning: false,
          }
        : saveStatus === "error"
          ? {
              label: "重试保存",
              icon: TriangleAlert,
              statusDotClassName: null,
              className:
                "border-red-400/40 text-red-200 hover:border-red-400/60 hover:bg-red-500/10",
              spinning: false,
            }
          : {
              label: "保存",
              icon: null,
              statusDotClassName: "bg-amber-400",
              className:
                "border-border text-text-dim hover:border-border-mid hover:bg-white/4 hover:text-white",
              spinning: false,
            }
  const SaveStatusIcon = saveButton.icon

  const calibrationFormalShots = useMemo(() => shots.map((shot, index) => {
    const frames = shotFrames[shot.id] ?? {
      first: Math.round(shot.start * editorFrameRate),
      last: Math.max(0, Math.round((shot.start + shot.duration) * editorFrameRate) - 1),
    }
    return {
      id: shot.id,
      projectId,
      order: index,
      startFrame: frames.first,
      endFrame: frames.last + 1,
      status: "draft" as const,
      detection: autoShotDetectionRef.current[shot.id] ?? null,
      primaryScreenshotId: primaryShotScreenshotIds[shot.id] ?? null,
      screenshotIds: shotScreenshotIds[shot.id] ?? [],
      firstFrameScreenshotId: shotBoundaryScreenshotIds[shot.id]?.first ?? null,
      lastFrameScreenshotId: shotBoundaryScreenshotIds[shot.id]?.last ?? null,
      analysisFields: shotDims[shot.id] ?? {},
      description: shotNotes[shot.id]?.content ?? "",
      notes: shotNotes[shot.id]?.analysis ?? "",
      createdAt: project.createdAt,
      updatedAt: project.updatedAt,
    }
  }), [editorFrameRate, primaryShotScreenshotIds, project.createdAt, project.id, project.updatedAt, projectId, shotBoundaryScreenshotIds, shotDims, shotFrames, shotNotes, shotScreenshotIds, shots])

  const applyCalibrationDraftToEditor = async (draft: import("../../shot-calibration/types").CalibrationDraft) => {
    const currentMediaIdentity = autoShotRun?.mediaIdentity ?? autoShotTask.mediaIdentity
    if (!currentMediaIdentity || draft.mediaIdentity.mediaIdentityDigest !== currentMediaIdentity.mediaIdentityDigest) {
      toast.error("当前校准草稿与视频素材不匹配，未应用。")
      return
    }
    await saveNow()
    const latestProject = await projectRepository.getProject(projectId)
    if (!latestProject) throw new Error("项目已不存在，无法应用校准草稿。")
    const recoverySnapshot = await createProjectRecoverySnapshot(projectId)
    if (!recoverySnapshot) throw new Error("无法创建应用前恢复快照。")
    const now = new Date().toISOString()
    const frameToMediaTime = (frame: number) => frameToTimestampFromArrays(draft.timebase.presentationTimestamps, draft.timebase.presentationDurations, frame)
    const nextShots: ShotData[] = draft.segments.map((segment) => {
      const source = shots.find((shot) => shot.id === segment.sourceShotId)
      const start = frameToMediaTime(segment.startFrame)
      const end = frameToMediaTime(segment.endFrame)
      return source
        ? { ...source, start, duration: Math.max(0, end - start) }
        : { id: segment.id, start, duration: Math.max(0, end - start), type: "未分析", motion: "未分析", color: "未分析" }
    })
    if (autoShotRun?.controlSnapshot) {
      const nextDetection = { ...autoShotDetectionRef.current }
      for (const segment of draft.segments) {
        const candidate = autoShotRun.candidates.find((item) => item.id === segment.sourceCandidateId)
        if (!candidate) continue
        nextDetection[segment.id] = { source: "auto-shot", taskId: autoShotRun.id, candidateId: candidate.id, kind: candidate.kind, mediaIdentityDigest: autoShotRun.mediaIdentity.mediaIdentityDigest, presetId: autoShotRun.controlSnapshot.preset.id, presetVersion: autoShotRun.controlSnapshot.preset.version, engineVersion: candidate.engineVersion, configHash: candidate.configHash }
      }
      autoShotDetectionRef.current = nextDetection
    }
    const nextGroups = reconcileShotGroups(shotGroups, nextShots.map((shot) => shot.id))
    const nextShotRecords = draft.segments.map((segment, order) => {
      const source = calibrationFormalShots.find((shot) => shot.id === segment.sourceShotId)
      const candidate = autoShotRun?.candidates.find((item) => item.id === segment.sourceCandidateId)
      const detection = candidate && autoShotRun?.controlSnapshot ? { source: "auto-shot" as const, taskId: autoShotRun.id, candidateId: candidate.id, kind: candidate.kind, mediaIdentityDigest: autoShotRun.mediaIdentity.mediaIdentityDigest, presetId: autoShotRun.controlSnapshot.preset.id, presetVersion: autoShotRun.controlSnapshot.preset.version, engineVersion: candidate.engineVersion, configHash: candidate.configHash } : source?.detection ?? { source: "manual" as const }
      return { ...(source ?? { id: segment.id, projectId, order, status: "draft" as const, primaryScreenshotId: null, screenshotIds: [], firstFrameScreenshotId: null, lastFrameScreenshotId: null, analysisFields: {}, description: "", notes: "", createdAt: now, updatedAt: now }), id: segment.id, projectId, order, startFrame: segment.startFrame, endFrame: segment.endFrame, detection, updatedAt: now }
    })
    const updatedProject = await projectRepository.applyCalibrationDraft({ state: { project: latestProject, shots: nextShotRecords, groups: nextGroups, markers: annotationMarkers, template: template as import("../../project/types").ProjectTemplateSnapshotRecord | null, researchRanges: researchWorkbench.ranges, researchContexts: researchWorkbench.contexts }, draft, expectedUpdatedAt: latestProject.updatedAt, recoverySnapshotId: recoverySnapshot.id, task: autoShotRun })
    editorHistory.commit()
    setShots(nextShots)
    setShotFrames(Object.fromEntries(draft.segments.map((segment) => [segment.id, { first: segment.startFrame, last: segment.endFrame - 1 }])))
    setShotGroups(nextGroups)
    onProjectUpdated(updatedProject)
    setActiveShot(0)
    setCurrentTime(0)
    markDirty()
    toast.success(`已应用 ${nextShots.length} 个镜头；应用前快照已保存。`)
    onWorkflowNavigate?.("overview", "film")
  }

  const updateResearchContext = useCallback((target: ResearchTarget, patch: Partial<Pick<ResearchContext, "question" | "status" | "needsReview">>) => { editorHistory.commit(); return researchWorkbench.updateContext(target, patch) }, [editorHistory.commit, researchWorkbench.updateContext])
  const addResearchEvidence = useCallback((target: ResearchTarget, evidence: EvidenceRef) => { editorHistory.commit(); void researchWorkbench.addEvidence(target, evidence) }, [editorHistory.commit, researchWorkbench.addEvidence])
  const removeResearchEvidence = useCallback((target: ResearchTarget, evidenceId: string) => { editorHistory.commit(); void researchWorkbench.removeEvidence(target, evidenceId) }, [editorHistory.commit, researchWorkbench.removeEvidence])
  const createResearchRange = useCallback(async (startUs: number, endUs: number) => {
    editorHistory.commit()
    const range = await researchWorkbench.createRangeForMedia({ startUs, endUs, mediaIdentityDigest: researchMediaIdentityDigest })
    setSessionResearchMode("range")
    setSessionResearchScope({ kind: "saved-range", id: range.id, fromUs: range.startUs, toUs: range.endUs })
    setSessionResearchTarget({ kind: "range", id: range.id })
    onWorkflowNavigate?.("analyze", workflowView, { mode: "range", scopeKind: "saved-range", scopeId: range.id, fromUs: range.startUs, toUs: range.endUs, targetKind: "range", targetId: range.id })
    return range
  }, [editorHistory.commit, onWorkflowNavigate, researchMediaIdentityDigest, researchWorkbench.createRangeForMedia, setSessionResearchMode, setSessionResearchScope, setSessionResearchTarget, workflowView])
  const updateResearchRange = useCallback((range: ResearchRange, patch: Partial<Pick<ResearchRange, "startUs" | "endUs" | "title" | "observation" | "interpretation" | "summary">>) => { editorHistory.commit(); return researchWorkbench.updateRange(range, patch) }, [editorHistory.commit, researchWorkbench.updateRange])
  const saveAndNextResearchShot = useCallback(async () => {
    await researchWorkbench.flush()
    const nextIndex = activeShot + 1
    if (!shots[nextIndex]) return
    setSelectedGroupId(null)
    setActiveShot(nextIndex)
    setCurrentTime(shots[nextIndex].start)
    setSessionResearchTarget({ kind: "shot", id: shots[nextIndex].id })
  }, [activeShot, researchWorkbench.flush, setSessionResearchTarget, shots, setCurrentTime])

  useEditorShortcuts({
    "file.save": () => {
      void saveNow().catch(() => undefined)
    },
    "playback.toggle": () => {
      stopReversePlayback()
      playViewRange(!playing)
    },
    "playback.reverse": () => {
      const frameRate = media.metadata?.frameRate ?? FPS
      stopReversePlayback()
      setPlaying(false)
      reversePlaybackTimerRef.current = window.setInterval(() => {
        const video = videoRef.current
        const nextFrame = Math.max(
          0,
          Math.round((video?.currentTime ?? currentTime) * frameRate) - 1,
        )
        setCurrentTime(nextFrame / frameRate)
        if (nextFrame === 0) stopReversePlayback()
      }, 125)
    },
    "playback.pause": () => {
      stopReversePlayback()
      setPlaying(false)
    },
    "playback.forward": () => {
      stopReversePlayback()
      playViewRange(true)
    },
    "playback.stepBack": () => {
      stopReversePlayback()
      setPlaying(false)
      setCurrentTime(
        Math.max(
          0,
          Math.round(currentTime * (media.metadata?.frameRate ?? FPS) - 1) /
            (media.metadata?.frameRate ?? FPS),
        ),
      )
    },
    "playback.stepForward": () => {
      stopReversePlayback()
      setPlaying(false)
      setCurrentTime(
        Math.min(
          durationSeconds,
          Math.round(currentTime * (media.metadata?.frameRate ?? FPS) + 1) /
            (media.metadata?.frameRate ?? FPS),
        ),
      )
    },
    "playback.jumpBack": () => {
      stopReversePlayback()
      setPlaying(false)
      const frameRate = media.metadata?.frameRate ?? FPS
      setCurrentTime(
        Math.max(0, Math.round(currentTime * frameRate - 5) / frameRate),
      )
    },
    "playback.jumpForward": () => {
      stopReversePlayback()
      setPlaying(false)
      const frameRate = media.metadata?.frameRate ?? FPS
      setCurrentTime(
        Math.min(
          durationSeconds,
          Math.round(currentTime * frameRate + 5) / frameRate,
        ),
      )
    },
    "playback.previousBoundary": () => {
      const frameRate = media.metadata?.frameRate ?? FPS
      const currentFrame = Math.round(currentTime * frameRate)
      const previousFrame = [
        ...new Set([
          0,
          ...getShotRanges(frameRate).map((range) => range.startFrame),
        ]),
      ]
        .filter((frame) => frame < currentFrame)
        .pop()
      if (previousFrame !== undefined) setCurrentTime(previousFrame / frameRate)
    },
    "playback.nextBoundary": () => {
      const frameRate = media.metadata?.frameRate ?? FPS
      const currentFrame = Math.round(currentTime * frameRate)
      const nextFrame = [
        ...new Set(getShotRanges(frameRate).map((range) => range.startFrame)),
      ].find((frame) => frame > currentFrame)
      if (nextFrame !== undefined) setCurrentTime(nextFrame / frameRate)
    },
    "playback.goToStart": () => setCurrentTime(0),
    "playback.goToEnd": () => {
      const frameRate = media.metadata?.frameRate ?? FPS
      setCurrentTime(
        Math.max(0, Math.round(durationSeconds * frameRate) - 1) / frameRate,
      )
    },
    "playback.goToInPoint":
      viewRange.inFrame !== null
        ? () =>
            setCurrentTime(
              viewRange.inFrame! / (media.metadata?.frameRate ?? FPS),
            )
        : undefined,
    "playback.goToOutPoint":
      viewRange.outFrame !== null
        ? () =>
            setCurrentTime(
              viewRange.outFrame! / (media.metadata?.frameRate ?? FPS),
            )
        : undefined,
    "shot.trimStartToPlayhead": workflowStage === "calibrate" ? undefined : () => {
      if (activeShot <= 0) return
      const frameRate = media.metadata?.frameRate ?? FPS
      const range = getShotRanges(frameRate)[activeShot]
      const currentFrame = Math.round(currentTime * frameRate)
      if (
        range &&
        currentFrame > range.startFrame &&
        currentFrame < range.endFrame
      )
        handleBoundaryCommit(activeShot - 1, currentFrame, activeShot)
    },
    "shot.trimEndToPlayhead": workflowStage === "calibrate" ? undefined : () => {
      if (activeShot >= shots.length - 1) return
      const frameRate = media.metadata?.frameRate ?? FPS
      const range = getShotRanges(frameRate)[activeShot]
      const currentFrame = Math.round(currentTime * frameRate)
      if (
        range &&
        currentFrame >= range.startFrame &&
        currentFrame < range.endFrame - 1
      )
        handleBoundaryCommit(activeShot, currentFrame + 1, activeShot)
    },
    "selection.setInPoint": workflowStage === "calibrate" ? undefined : () => {
      const frameRate = media.metadata?.frameRate ?? FPS
      const frame = Math.max(
        0,
        Math.min(
          Math.round(durationSeconds * frameRate) - 1,
          Math.round(currentTime * frameRate),
        ),
      )
      setViewRange((range) => ({
        inFrame: frame,
        outFrame:
          range.outFrame !== null && range.outFrame < frame
            ? null
            : range.outFrame,
      }))
    },
    "selection.setOutPoint": workflowStage === "calibrate" ? undefined : () => {
      const frameRate = media.metadata?.frameRate ?? FPS
      const frame = Math.max(
        0,
        Math.min(
          Math.round(durationSeconds * frameRate) - 1,
          Math.round(currentTime * frameRate),
        ),
      )
      setViewRange((range) => ({
        inFrame:
          range.inFrame !== null && range.inFrame > frame
            ? null
            : range.inFrame,
        outFrame: frame,
      }))
    },
    "marker.create": workflowStage === "calibrate" ? undefined : () => createAnnotationMarker("important"),
    "shot.splitAtPlayhead":
      workflowStage !== "calibrate" && (activeShortcutSurface === "preview" || activeShortcutSurface === "timeline")
        ? handleSplitShotAtPlayhead
        : undefined,
    "preview.toggleFullscreen":
      activeShortcutSurface === "preview"
        ? () => setFullscreenRequest((request) => request + 1)
        : undefined,
    "preview.fitCanvas":
      activeShortcutSurface === "preview" ? () => setPreviewZoom(1) : undefined,
    "timeline.zoomIn":
      activeShortcutSurface === "timeline"
        ? () =>
            setTimelineZoomRequest((request) => ({
              id: request.id + 1,
              direction: 1,
            }))
        : undefined,
    "timeline.zoomOut":
      activeShortcutSurface === "timeline"
        ? () =>
            setTimelineZoomRequest((request) => ({
              id: request.id + 1,
              direction: -1,
            }))
        : undefined,
    "interaction.cancel": () => {
      setCompositionDrawingTool("select")
      setSelectedCompositionShapeId(null)
      setCompositionCancelRequest((request) => request + 1)
    },
    "help.show": () => setActiveTool("shortcuts"),
    "history.undo":
      workflowStage === "calibrate" ? undefined : activeTool === "mask" && compositionShapeHistoryIndex > 0
        ? undoCompositionShapes
        : editorHistory.canUndo
          ? editorHistory.undo
          : undefined,
    "history.redo":
      workflowStage === "calibrate" ? undefined : activeTool === "mask" &&
      compositionShapeHistoryIndex <
        compositionShapeHistoryRef.current.length - 1
        ? redoCompositionShapes
        : editorHistory.canRedo
          ? editorHistory.redo
          : undefined,
    "editing.delete":
      workflowStage === "calibrate" ? undefined : activeTool === "mask" && selectedCompositionShapeId
        ? deleteSelectedCompositionShape
        : shots.length > 1
          ? () => handleMergeShotAtIndex(activeShot)
          : undefined,
  })

  return (
    <div
      className={`${isActive ? "" : "hidden"} editor-workspace relative flex h-full min-h-0 flex-col overflow-hidden bg-bg select-none`}
      data-mobile-panel={mobilePanel ?? "none"}
      aria-hidden={isActive ? undefined : true}
    >
      {/* ══ Topbar ══ */}
      <header className="flex items-center px-4 h-11 border-b border-border bg-bg-nav shrink-0 gap-3">
        <Button
          type="button"
          variant="ghost"
          size="xs"
          onClick={() => void leaveEditor()}
          className="text-text-muted hover:bg-transparent hover:text-white"
        >
          ← 项目列表
        </Button>
        <div className="w-px h-4 bg-border shrink-0" />

        {editingTitle ? (
          <Input
            ref={titleInputRef}
            value={titleDraft}
            onChange={(e) => setTitleDraft(e.target.value)}
            onBlur={commitTitle}
            onKeyDown={(e) => {
              if (e.key === "Enter") commitTitle()
              if (e.key === "Escape") {
                setTitleDraft(projectTitle)
                setEditingTitle(false)
              }
            }}
            className="h-auto max-w-xs flex-1 border-0 border-b border-accent bg-transparent px-0 py-0 editor-page-title font-semibold text-white focus-visible:ring-0"
          />
        ) : (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => {
              setTitleDraft(projectTitle)
              setEditingTitle(true)
            }}
            title="点击修改项目名称"
            className="max-w-xs justify-start truncate px-0 editor-page-title font-semibold text-white hover:bg-transparent hover:text-accent"
          >
            {projectTitle}
          </Button>
        )}

        <div className="flex-1" />

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setIsExportDialogOpen(true)}
          className="border-border text-text-dim hover:border-border-mid hover:bg-white/4 hover:text-white"
        >
          导出
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => void saveNow().catch(() => undefined)}
          disabled={saveStatus === "saving"}
          title={
            saveStatus === "saved"
              ? "项目已保存（Ctrl/Cmd + S）"
              : "保存项目（Ctrl/Cmd + S）"
          }
          className={saveButton.className}
        >
          {SaveStatusIcon && (
            <SaveStatusIcon
              className={saveButton.spinning ? "animate-spin" : undefined}
            />
          )}
          {saveButton.statusDotClassName && (
            <span
              aria-hidden="true"
              className={`size-1.5 shrink-0 rounded-full ${saveButton.statusDotClassName}`}
            />
          )}
          {saveButton.label}
        </Button>
        {editorLoadError && (
          <div role="alert" className="flex min-w-0 items-center gap-2 rounded-md border border-red-400/30 bg-red-500/10 px-2 py-1 text-xs text-red-200">
            <span className="max-w-56 truncate">{editorLoadError}</span>
            <Button type="button" variant="ghost" size="xs" onClick={() => setDataLoadRevision((revision) => revision + 1)} className="shrink-0 px-1.5 text-red-100 hover:bg-red-500/15 hover:text-white">重试读取</Button>
          </div>
        )}
        <div className="editor-mobile-panel-switcher ml-1 hidden items-center gap-1">
          <Button type="button" variant="ghost" size="xs" onClick={() => setMobilePanel((current) => current === "shots" ? null : "shots")} aria-pressed={mobilePanel === "shots"} className={mobilePanel === "shots" ? "bg-accent/15 text-accent" : "text-text-muted"}>分镜</Button>
          <Button type="button" variant="ghost" size="xs" onClick={() => setMobilePanel((current) => current === "analysis" ? null : "analysis")} aria-pressed={mobilePanel === "analysis"} className={mobilePanel === "analysis" ? "bg-accent/15 text-accent" : "text-text-muted"}>分析</Button>
        </div>
      </header>

      {/* ══ Main body ══ */}
      <Suspense fallback={<div className="flex min-h-0 flex-1 items-center justify-center text-sm text-text-muted">正在加载工作区…</div>}>
      {workflowStage !== "calibrate" ? <div className={workflowStage === "analyze" ? "contents" : "hidden"}>
      <AnalyzeWorkspace
        view={workflowView}
        shots={shots}
        groups={shotGroups}
        activeShotIndex={activeShot}
        selectedGroupId={selectedGroupId}
        notes={shotNotes}
        entries={shotDims}
        resolvedProfile={resolvedProfile}
        project={mediaProject}
        frameRate={media.metadata?.frameRate ?? FPS}
        currentFrame={Math.round(currentTime * (media.metadata?.frameRate ?? FPS))}
        currentTime={currentTime}
        mediaIdentityDigest={researchMediaIdentityDigest}
        researchTarget={sessionResearchTarget}
        researchRanges={researchWorkbench.ranges}
        researchContexts={researchWorkbench.contexts}
        firstScreenshotId={activeShotId ? shotBoundaryScreenshotIds[activeShotId]?.first : null}
        lastScreenshotId={activeShotId ? shotBoundaryScreenshotIds[activeShotId]?.last : null}
        onViewChange={(view) => onWorkflowNavigate?.("analyze", view)}
        onLocateShot={(index) => {
          setSelectedGroupId(null)
          setActiveShot(index)
          setCurrentTime(shots[index]?.start ?? 0)
        }}
        onPlayShot={playShot}
        onChangeNotes={(patch) => {
          if (!activeShotId) return
          markDirty()
          setShotNotes((current) => ({
            ...current,
            [activeShotId]: { ...current[activeShotId], ...patch },
          }))
        }}
        onAnalysisFieldCommand={handleAnalysisFieldCommand}
        onCopyPreviousAnalysis={handleCopyPreviousAnalysis}
        onEditingStart={beginHistoryInput}
        onEditingEnd={endHistoryInput}
        onProjectUpdated={handleMediaProjectUpdated}
        onUpdateResearchContext={updateResearchContext}
        onAddEvidence={addResearchEvidence}
        onRemoveEvidence={removeResearchEvidence}
        onCreateResearchRange={createResearchRange}
        onUpdateResearchRange={updateResearchRange}
        onSaveAndNext={saveAndNextResearchShot}
        isResearchSaving={researchWorkbench.writeState === "saving"}
        researchError={researchWorkbench.error}
      >
      <div className="flex flex-1 overflow-hidden min-h-0">
        {/* ── Far left: tool column ── */}
        <div className="flex shrink-0 border-r border-border">
          <div className="w-16 flex flex-col items-center py-2 gap-0.5 bg-bg-panel">
            {/* Home button */}
            <Button
              type="button"
              variant="ghost"
              size="icon-lg"
              onClick={() => void leaveEditor()}
              aria-label="返回项目列表"
              className="h-12 w-14 text-text-muted hover:bg-white/6 hover:text-white"
            >
              <span className="text-xl leading-none">⌂</span>
            </Button>
            <div className="w-10 h-px bg-border my-0.5" />
            {PANEL_TOOLS.map((tool) => {
              const ToolIcon = TOOL_ICONS[tool.id]
              return (
                <Button
                  key={tool.id}
                  type="button"
                  variant="ghost"
                  size="icon-lg"
                  onClick={() => toggleTool(tool.id)}
                  aria-label={tool.label}
                  className={`h-14 w-14 flex-col gap-1 ${
                    activeTool === tool.id
                      ? "bg-accent/20 text-accent"
                      : "text-text-muted hover:text-white hover:bg-white/6"
                  }`}
                >
                  <ToolIcon className="size-[18px]" strokeWidth={1.7} />
                  <span className="editor-micro leading-none font-mono tracking-tight">
                    {tool.short}
                  </span>
                </Button>
              )
            })}
            <Button
              type="button"
              variant="ghost"
              size="icon-lg"
              onClick={() => toggleTool("settings")}
              aria-label="设置"
              title="设置"
              className={`mt-auto h-12 w-14 ${
                activeTool === "settings"
                  ? "bg-accent/20 text-accent"
                  : "text-text-muted hover:bg-white/6 hover:text-white"
              }`}
            >
              <Settings2 className="size-[18px]" strokeWidth={1.7} />
            </Button>
          </div>

          {/* Expandable detail panel */}
          {activeTool !== null && (
            <div className="editor-tool-panel w-52 border-l border-border bg-bg-panel flex flex-col overflow-hidden">
              <div className="px-3 py-2 border-b border-border flex items-center justify-between shrink-0">
                <span className="editor-heading font-mono text-text-muted">
                  {activeTool === "settings"
                    ? "设置"
                    : PANEL_TOOLS.find((t) => t.id === activeTool)?.label}
                </span>
                {/* collapse icon — only click here folds the panel */}
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-xs"
                  onClick={() => setActiveTool(null)}
                  aria-label="折叠"
                  className="text-text-muted hover:text-white"
                >
                  ‹
                </Button>
              </div>

              <div className="flex-1 overflow-y-auto p-3">
                {activeTool === "markers" && (
                  <div>
                    <div className="flex items-center justify-center gap-2">
                      {([
                        ["important", "bg-yellow-500", "重要镜头"],
                        ["composition", "bg-blue-500", "构图精妙"],
                        ["emotion", "bg-purple-500", "情绪高点"],
                        ["turning-point", "bg-red-500", "转折点"],
                      ] as const).map(([category, color, label]) => {
                        const isVisible =
                          visibleMarkerCategories.includes(category)
                        return (
                          <button
                            key={category}
                            type="button"
                            aria-label={`${label}：${
                              isVisible ? "显示" : "隐藏"
                            }`}
                            aria-pressed={isVisible}
                            title={`${label}：${isVisible ? "显示" : "隐藏"}`}
                            onClick={() => toggleMarkerCategory(category)}
                            className={`flex size-5 items-center justify-center rounded-full border transition-opacity ${
                              isVisible
                                ? "border-white/30"
                                : "border-transparent opacity-30"
                            }`}
                          >
                            <span
                              className={`size-2.5 rounded-full ${color}`}
                            />
                          </button>
                        )
                      })}
                    </div>
                    <div className="mt-4 border-t border-border pt-4">
                      <AnnotationMarkerPanel
                        markers={annotationMarkers}
                        selectedMarkerId={selectedMarkerId}
                        frameRate={media.metadata?.frameRate ?? FPS}
                        onCreate={createAnnotationMarker}
                        onUpdate={updateAnnotationMarker}
                        onDelete={removeAnnotationMarker}
                        onSeek={(frame) =>
                          setCurrentTime(
                            frame / (media.metadata?.frameRate ?? FPS),
                          )
                        }
                        onSelect={selectAnnotationMarker}
                      />
                    </div>
                  </div>
                )}

                {/* ── 开发者工具 / 标定 ── */}
                {activeTool === "developer" && (
                  <div className="flex flex-col gap-3">
                    <div className="rounded-xl border border-accent/25 bg-accent/5 p-3">
                      <p className="editor-heading font-mono tracking-wider text-accent">开发者工具</p>
                      <p className="mt-1 text-[10px] leading-4 text-text-dim">
                        标定功能用于记录自动分镜的 hard-cut 真值，不会改动正式分镜或项目数据。
                      </p>
                    </div>
                    <label className="flex items-start justify-between gap-3 rounded-lg border border-border bg-bg-input/20 px-2.5 py-2.5">
                      <span className="min-w-0">
                        <span className="block text-xs font-medium text-text">启用标定模式</span>
                        <span className="mt-0.5 block text-[10px] leading-4 text-text-dim">
                          开启后，自动分镜完成时显示标定工作台和人工标注选项。
                        </span>
                      </span>
                      <Checkbox
                        checked={calibrationModeEnabled}
                        onCheckedChange={(checked) => setCalibrationModeEnabled(checked === true)}
                        aria-label="启用标定模式"
                        className="mt-0.5"
                      />
                    </label>
                    <label className="flex items-start justify-between gap-3 rounded-lg border border-border bg-bg-input/20 px-2.5 py-2.5">
                      <span className="min-w-0">
                        <span className="block text-xs font-medium text-text">启用高级检测参数</span>
                        <span className="mt-0.5 block text-[10px] leading-4 text-text-dim">
                          开启后可调整检测器、阈值、窗口和淡入淡出参数，仅用于开发调试。
                        </span>
                      </span>
                      <Checkbox
                        checked={advancedDetectionEnabled}
                        onCheckedChange={(checked) => setAdvancedDetectionEnabled(checked === true)}
                        aria-label="启用高级检测参数"
                        className="mt-0.5"
                      />
                    </label>
                    {advancedDetectionEnabled && autoShotControl.settings && (
                      <Suspense fallback={null}>
                        <AdvancedSettings
                          settings={autoShotControl.settings}
                          baseHardCut={autoShotControl.resolved?.engineConfig.hardCut}
                          disabled={autoShotTask.isActive || autoShotRun?.status === "running"}
                          onChange={autoShotControl.updateSettings}
                        />
                      </Suspense>
                    )}
                    {!calibrationModeEnabled ? (
                      <p className="rounded-lg bg-bg-input/25 px-2.5 py-2 text-[10px] leading-4 text-text-dim">
                        标定模式已关闭。普通自动分镜不会显示标定内容。
                      </p>
                    ) : autoShotRun?.status === "completed" && calibrationAnnotation ? (
                      <Suspense fallback={null}>
                        <CalibrationWorkbench
                          annotation={calibrationAnnotation}
                          candidates={autoShotRun.candidates.filter((candidate) => candidate.kind === "hard-cut")}
                          onAcceptCandidate={(candidate) => updateCalibration((current) => updateHardCutAnnotation(current, "accept", { candidate }))}
                          onRejectCandidate={(candidateId) => updateCalibration((current) => updateHardCutAnnotation(current, "reject", { candidateId }))}
                          onCorrectCandidate={correctCalibrationCandidateAtPlayhead}
                          onAddBoundary={addCalibrationBoundaryAtPlayhead}
                          onMoveBoundaryToPlayhead={moveCalibrationBoundaryToPlayhead}
                          onDeleteBoundary={deleteCalibrationBoundary}
                          onLocateBoundary={locateCalibrationBoundary}
                          onMarkUncertain={markCalibrationUncertainAtPlayhead}
                          onDeleteUncertainRange={deleteCalibrationUncertainRange}
                          onAnnotatorChange={(annotator) => updateCalibration((current) => ({ ...current, annotator: annotator.trim() || "未填写", updatedAt: new Date().toISOString() }))}
                          onExport={exportCalibrationAnnotation}
                        />
                      </Suspense>
                    ) : (
                      <p className="rounded-lg bg-bg-input/25 px-2.5 py-2 text-[10px] leading-4 text-text-dim">
                        请先在分镜面板完成一次自动分镜，完成后这里会出现候选标注和真值编辑工具。
                      </p>
                    )}
                  </div>
                )}

                {/* ── 设置 (theme + cache) ── */}
                {activeTool === "settings" && (
                  <div className="flex flex-col gap-3">
                    <p className="editor-heading text-text-muted font-mono tracking-wider">
                      缓存管理
                    </p>
                    <div className="p-3 rounded-xl border border-border bg-bg-deep">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-white editor-body font-medium">
                          本地缓存
                        </p>
                        <span className="editor-meta font-mono text-accent">
                          {liteCache} MB
                        </span>
                      </div>
                      <div className="w-full h-1 rounded-full bg-border mb-2">
                        <div
                          className="h-full rounded-full bg-accent/60 transition-all"
                          style={{ width: `${(liteCache / 500) * 100}%` }}
                        />
                      </div>
                      <p className="text-text-muted editor-meta font-mono">
                        {liteCache} / 500 MB
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      onClick={() => setLiteCache(0)}
                      className="h-7 w-full editor-body font-normal text-red-400 hover:text-red-400"
                    >
                      清除缓存
                    </Button>
                    <div className="h-px bg-border" />
                    <p className="editor-heading text-text-muted font-mono tracking-wider">
                      自动分镜
                    </p>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={autoShotTask.isActive || autoShotRun?.status === "running" || !autoShotControl.dirty}
                      onClick={autoShotControl.resetSettings}
                      className="h-7 w-full text-text-muted hover:text-text"
                    >
                      恢复自动分镜默认设置
                    </Button>
                    <div className="h-px bg-border" />
                    <p className="editor-heading text-text-muted font-mono tracking-wider">
                      辅助工具
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setActiveTool("shortcuts")}
                        className="h-9 justify-start gap-2 border-border text-text-muted hover:text-text"
                      >
                        <Keyboard className="size-4" strokeWidth={1.7} />
                        快捷键
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setActiveTool("developer")}
                        className="h-9 justify-start gap-2 border-border text-text-muted hover:text-text"
                      >
                        <Code2 className="size-4" strokeWidth={1.7} />
                        开发者工具
                      </Button>
                    </div>
                  </div>
                )}

                {/* ── 视频蒙版 ── */}
                {activeTool === "mask" && (
                  <>
                    <CompositionOverlayPanel
                      settings={compositionOverlay}
                      drawingTool={compositionDrawingTool}
                      selectedShapeId={selectedCompositionShapeId}
                      onChange={updateCompositionOverlay}
                      onDeleteSelectedShape={deleteSelectedCompositionShape}
                      onUndoShapes={undoCompositionShapes}
                      onRedoShapes={redoCompositionShapes}
                      canUndoShapes={compositionShapeHistoryIndex > 0}
                      canRedoShapes={
                        compositionShapeHistoryIndex <
                        compositionShapeHistoryRef.current.length - 1
                      }
                      onDrawingToolChange={setCompositionDrawingTool}
                      onSelectedShapeChange={setSelectedCompositionShapeId}
                    />
                    <ContentOverlayPanel
                      settings={contentOverlay}
                      fields={resolvedProfile?.fields ?? []}
                      suggestedFieldIds={suggestedContentOverlayFieldIds}
                      onChange={updateContentOverlay}
                    />
                  </>
                )}

                {/* ── 快捷键 ── */}
                {activeTool === "shortcuts" && (
                  <div className="flex flex-col gap-0">
                    {EDITOR_SHORTCUT_DEFINITIONS.map((s) => (
                      <div
                        key={s.key}
                        className="flex flex-col gap-0.5 py-2 border-b border-border/40 last:border-0"
                      >
                        <kbd className="editor-meta font-mono text-accent">
                          {s.key}
                        </kbd>
                        <span className="editor-meta text-text-muted">
                          {s.description}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* ── Center: canvas + timeline ── */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          <div className="flex-1 flex items-center justify-center bg-bg-deep relative overflow-hidden min-h-0">
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                background:
                  "radial-gradient(ellipse at 50% 40%, rgba(59,130,246,0.04) 0%, transparent 70%)",
              }}
            />

            <div className="relative flex h-full min-h-0 w-full max-w-[720px] flex-col items-center gap-3 px-4 py-3">
              <VideoPreviewCanvas
                showCompositionGrid={maskOn}
                compositionOverlay={compositionOverlay}
                contentOverlay={contentOverlay}
                contentOverlayModel={contentOverlayModel}
                isCompositionOverlayEditing={
                  activeTool === "mask" && compositionOverlay.enabled
                }
                compositionDrawingTool={compositionDrawingTool}
                selectedCompositionShapeId={selectedCompositionShapeId}
                onCompositionShapesChange={updateCompositionShapes}
                onCompositionShapeEditEnd={commitCompositionShapeHistory}
                onSelectedCompositionShapeChange={setSelectedCompositionShapeId}
                onCompositionDrawingToolChange={setCompositionDrawingTool}
                backgroundColor={canvasBackgroundColor}
                zoom={previewZoom}
                aspectPreset={previewAspectPreset}
                fullscreenRequest={fullscreenRequest}
                compositionCancelRequest={compositionCancelRequest}
                onFullscreenChange={setIsPreviewFullscreen}
                onActivate={() => setActiveShortcutSurface("preview")}
                sourceWidth={media.metadata?.width ?? 0}
                sourceHeight={media.metadata?.height ?? 0}
                videoUrl={videoUrl}
                videoRef={videoRef}
                status={playbackStatus}
                errorMessage={playbackErrorMessage}
                onRetry={retryVideoPlayback}
                onLoadedMetadata={onLoadedMetadata}
                onTimeUpdate={handleVideoTimeUpdate}
                onPlay={onPlay}
                onPause={onPause}
                onEnded={onEnded}
                onSeeking={onSeeking}
                onSeeked={onSeeked}
                onWaiting={onWaiting}
                onCanPlay={onCanPlay}
                onError={onError}
              />
              {/*<div className="w-full rounded-xl overflow-hidden border border-white/10 shadow-2xl relative"
                style={{
                  aspectRatio:"16/9",
                  background:"linear-gradient(160deg,#080f28 0%,#0b0520 50%,#080f28 100%)",
                  boxShadow:"0 0 0 1px rgba(255,255,255,0.06), 0 40px 80px rgba(0,0,0,0.6)",
                }}>
                <div className="absolute inset-0">
                  <div className="absolute inset-0" style={{ background:"radial-gradient(ellipse at 32% 55%, rgba(59,130,246,0.18) 0%, transparent 55%)" }} />
                  <div className="absolute inset-0" style={{ background:"radial-gradient(ellipse at 72% 30%, rgba(100,50,180,0.12) 0%, transparent 45%)" }} />
                  <svg className="absolute inset-0 w-full h-full opacity-25" viewBox="0 0 720 405" preserveAspectRatio="none">
                    {[-2,-1,0,1,2].map(n => (
                      <line key={n} x1="360" y1="202" x2={360+n*180} y2={n>=0?405:0}
                        stroke="#3b82f6" strokeWidth="0.4" opacity="0.6"/>
                    ))}
                    <line x1="360" y1="202" x2="0"   y2="202" stroke="#3b82f6" strokeWidth="0.4" opacity="0.3"/>
                    <line x1="360" y1="202" x2="720" y2="202" stroke="#3b82f6" strokeWidth="0.4" opacity="0.3"/>
                    <rect x="305" y="175" width="110" height="62" fill="none" stroke="#7c3aed" strokeWidth="0.5" opacity="0.4"/>
                  </svg>
                  {maskOn && (
                    <div className="absolute inset-0 pointer-events-none opacity-25"
                      style={{
                        backgroundImage:"linear-gradient(rgba(59,130,246,0.8) 1px,transparent 1px),linear-gradient(90deg,rgba(59,130,246,0.8) 1px,transparent 1px)",
                        backgroundSize:"33.33% 33.33%",
                      }}/>
                  )}
                  <div className="absolute inset-0 opacity-10 pointer-events-none"
                    style={{
                      backgroundImage:"linear-gradient(rgba(255,255,255,0.5) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.5) 1px,transparent 1px)",
                      backgroundSize:"33.33% 33.33%",
                    }}/>
                  <div className="absolute inset-[5%] border border-white/5 rounded"/>
                </div>
                <div className="absolute top-3 left-3 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse"/>
                  <span className="font-mono editor-micro text-white/40">REC</span>
                </div>
                <div className="absolute inset-0 pointer-events-none opacity-5"
                  style={{
                    backgroundImage:"repeating-linear-gradient(0deg,transparent,transparent 2px,rgba(0,0,0,0.5) 2px,rgba(0,0,0,0.5) 4px)",
                    backgroundSize:"100% 4px",
                  }}/>
              </div>*/}

              <VideoPlaybackControls
                currentTime={currentTime}
                durationSeconds={durationSeconds}
                isPlaying={playing}
                isUnavailable={
                  playbackStatus === "loading" || playbackStatus === "error"
                }
                isMuted={isMuted}
                speed={speed}
                canvasBackgroundColor={canvasBackgroundColor}
                zoom={previewZoom}
                aspectPreset={previewAspectPreset}
                showSafeMargins={compositionOverlay.showSafeMargins}
                isFullscreen={isPreviewFullscreen}
                onPreviousShot={() => {
                  const index = Math.max(0, activeShot - 1)
                  setActiveShot(index)
                  setCurrentTime(shots[index]?.start ?? 0)
                }}
                onNextShot={() => {
                  const index = Math.min(shots.length - 1, activeShot + 1)
                  setActiveShot(index)
                  setCurrentTime(shots[index]?.start ?? 0)
                }}
                onCurrentTimeChange={setCurrentTime}
                onPlayingChange={playViewRange}
                onMutedChange={setMuted}
                onSpeedChange={setSpeed}
                onCanvasBackgroundColorChange={setCanvasBackgroundColor}
                onZoomChange={setPreviewZoom}
                onAspectPresetChange={setPreviewAspectPreset}
                onSafeMarginsChange={(visible) =>
                  updateCompositionOverlay({
                    ...compositionOverlay,
                    showSafeMargins: visible,
                  })
                }
                onFullscreenToggle={() =>
                  setFullscreenRequest((request) => request + 1)
                }
              />
            </div>
          </div>

          <EditorTimeline
            shots={shots}
            groups={shotGroups}
            activeShotIndex={activeShot}
            selectedGroupId={selectedGroupId}
            selectedMarkerId={selectedMarkerId}
            visibleMarkerCategories={visibleMarkerCategories}
            currentTime={currentTime}
            isPlaying={playing}
            durationSeconds={durationSeconds}
            frameRate={media.metadata?.frameRate ?? FPS}
            mediaFingerprint={media.source}
            sourceUrl={videoUrl ?? ""}
            projectId={projectId}
            onActiveShotChange={setActiveShot}
            onCurrentTimeChange={setCurrentTime}
            onPreviewTimeChange={previewCurrentTime}
            onActivate={() => setActiveShortcutSurface("timeline")}
            zoomRequest={timelineZoomRequest}
            viewRange={viewRange}
            audioTracks={mediaProject.audioTracks}
            mediaAssets={mediaProject.mediaAssets}
            onAudioTracksChange={handleAudioTracksChange}
            onSelectGroup={(groupId, firstShotIndex) => {
              setSelectedGroupId(groupId)
              setActiveShot(firstShotIndex)
              setPanel("group")
            }}
            onSelectMarker={selectAnnotationMarker}
            onToggleMarkerCategory={toggleMarkerCategory}
            markers={annotationMarkers}
            waveformPeaks={waveformPeaks}
            waveformUnavailable={waveformUnavailable}
            matchingShotIds={matchingShotIds}
            isFilteringShots={isFilteringShots}
            completionByShotId={completionByShotId}
          />
        </div>

        <div className="editor-shot-list flex min-h-0 shrink-0 flex-col">
          {isSelectingGroupShots && (
            <div className="shrink-0 border-b border-border bg-bg-panel px-3">
              <ShotGroupPanel
                isSelecting
                selectedShotCount={
                  getContiguousShotIds(
                    shots.map((shot) => shot.id),
                    selectedShotIds,
                  ).length
                }
                kind={groupKindDraft}
                onKindChange={setGroupKindDraft}
                onStartSelection={() => undefined}
                onCancelSelection={() => {
                  setSelectedShotIds([])
                  setIsSelectingGroupShots(false)
                }}
                onCreate={createCurrentShotGroup}
              />
            </div>
          )}
          <ShotList
            className="min-h-0 flex-1"
            shots={shots}
            groups={shotGroups}
            collapsedGroupIds={collapsedGroupIds}
            activeShotIndex={activeShot}
            filters={shotSearchFilters}
            onFiltersChange={setShotSearchFilters}
            completionByShotId={completionByShotId}
            selectedShotIds={selectedShotIds}
            isSelectingShots={isSelectingGroupShots}
            shotNotes={shotNotes}
            shotFields={shotDims}
            screenshotIdsByShotId={shotScreenshotIds}
            primaryScreenshotIdsByShotId={primaryShotScreenshotIds}
            markers={annotationMarkers}
            onLocateShot={(index) => {
              setActiveShot(index)
              setCurrentTime(shots[index]?.start ?? 0)
            }}
            onSelectionChange={updateShotSelection}
            onToggleGroup={(groupId) =>
              setCollapsedGroupIds((current) =>
                current.includes(groupId)
                  ? current.filter((id) => id !== groupId)
                  : [...current, groupId],
              )
            }
            onSelectGroup={(groupId, firstShotIndex) => {
              setSelectedGroupId(groupId)
              setActiveShot(firstShotIndex)
              setPanel("group")
            }}
            onPlayGroup={playShotGroup}
            onDeleteGroup={(groupId) => {
              editorHistory.commit()
              setShotGroups((current) =>
                current.filter((group) => group.id !== groupId),
              )
              setSelectedGroupId((current) =>
                current === groupId ? null : current,
              )
            }}
            onPlayShot={playShot}
            onDeleteShot={handleMergeShotAtIndex}
            manualSplitDisabledReason={manualSplitDisabledReason}
            onSplitAtPlayhead={handleSplitShotAtPlayhead}
          />
        </div>

        {/* ── Right: analysis panel ── */}
        <aside className="editor-analysis-panel w-64 border-l border-border flex flex-col bg-bg-panel shrink-0 overflow-hidden">
          <Tabs
            value={panel}
            onValueChange={(value) => setPanel(value as Panel)}
            className="gap-0"
          >
            <TabsList
              variant="line"
              className="flex h-auto w-full rounded-none border-b border-border p-0"
            >
              {([
                ["frame", "画面"],
                ["dims", "维度"],
                ["notes", "批注"],
                ["group", "分组"],
              ] as [Panel, string][]).map(([tab, label]) => (
                <TabsTrigger
                  key={tab}
                  value={tab}
                  className="h-9 flex-1 rounded-none px-0 editor-heading text-text-muted data-active:text-accent after:bg-accent"
                >
                  {label}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>

          {/* Shot header */}
          <div className="px-4 py-2.5 border-b border-border shrink-0 flex items-center justify-between">
            <div>
              <span className="editor-heading font-mono text-accent">
                SHOT #{String(activeShot + 1).padStart(2, "00")}
              </span>
              <span className="editor-meta text-text-muted ml-2">
                {shots[activeShot]?.type}
              </span>
            </div>
            <div className="flex gap-1.5 items-center">
              <span className="font-mono editor-meta text-text-muted">
                {(shots[activeShot]?.duration ?? 0).toFixed(2)}s
              </span>
            </div>
          </div>

          {/* ── 画面 tab ── */}
          {panel === "frame" && (
            <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-4">
              <FrameCapture
                label="首帧"
                frameNum={currentFrames.first}
                imageUrl={
                  shotScreenshotUrls[
                    shotBoundaryScreenshotIds[activeShotId]?.first ?? ""
                  ]
                }
                minFrame={
                  activeShot > 0
                    ? editorShotRanges[activeShot - 1].startFrame + 1
                    : 0
                }
                maxFrame={currentFrames.last}
                frameRate={editorFrameRate}
                onFrameChange={
                  activeShot > 0
                    ? (f) => handleBoundaryCommit(activeShot - 1, f, activeShot)
                    : undefined
                }
              />
              <div className="h-px bg-border" />
              <FrameCapture
                label="尾帧"
                frameNum={currentFrames.last}
                imageUrl={
                  shotScreenshotUrls[
                    shotBoundaryScreenshotIds[activeShotId]?.last ?? ""
                  ]
                }
                minFrame={currentFrames.first}
                maxFrame={
                  activeShot < shots.length - 1
                    ? editorShotRanges[activeShot + 1].endFrame - 2
                    : currentFrames.last
                }
                frameRate={editorFrameRate}
                onFrameChange={
                  activeShot < shots.length - 1
                    ? (f) => handleBoundaryCommit(activeShot, f + 1, activeShot)
                    : undefined
                }
              />
              <div className="h-px bg-border" />
              {/* Current screenshot */}
              <ShotScreenshotGallery
                exportScreenshot={(() => {
                  const screenshotId =
                    primaryShotScreenshotIds[activeShotId] ??
                    shotBoundaryScreenshotIds[activeShotId]?.first ??
                    null
                  return screenshotId
                    ? {
                        id: screenshotId,
                        url: shotScreenshotUrls[screenshotId] ?? null,
                        frame:
                          screenshotFrames[screenshotId] ?? currentFrames.first,
                      }
                    : null
                })()}
                usesFirstFrame={
                  primaryShotScreenshotIds[activeShotId] ===
                  shotBoundaryScreenshotIds[activeShotId]?.first
                }
                isCapturing={isCapturingScreenshot}
                onCapture={() => void handleUpdateScreenshot()}
              />
            </div>
          )}

          {/* ── 维度 tab ── */}
          {panel === "dims" && (
            <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-3">
              {template && <div className="flex items-center justify-between gap-2 rounded-lg border border-border bg-bg-card/50 px-3 py-2"><p className="text-[11px] text-text-muted">批量替换只作用于明确选择的镜头，并保留一次完整撤销。</p><Button type="button" variant="outline" size="xs" onClick={() => { setSelectedShotIds([]); setIsBatchAnalysisOpen((current) => !current) }}>{isBatchAnalysisOpen ? "关闭批量" : "批量记录"}</Button></div>}
              {isBatchAnalysisOpen && <BatchAnalysisPanel profile={resolvedProfile} shots={shots} valuesByShotId={shotDims} selectedShotIds={selectedShotIds} onSelectionChange={updateShotSelection} onApply={handleBatchAnalysisCommand} onClose={() => setIsBatchAnalysisOpen(false)} />}
              {template && (
                <div
                  className={`rounded-xl border px-3 py-2 editor-meta ${
                    currentCompleteness.missingRequiredFields.length
                      ? "border-amber-400/30 bg-amber-400/8 text-amber-200"
                      : "border-emerald-400/25 bg-emerald-400/8 text-emerald-200"
                  }`}
                >
                  {currentCompleteness.missingRequiredFields.length
                    ? `待填写必填项：${currentCompleteness.missingRequiredFields.map((field) => field.label).join("、")}`
                    : "必填项已填写"}
                  <span className="ml-2 font-mono text-text-muted">
                    {currentCompleteness.filledFieldCount}/
                    {currentCompleteness.totalFieldCount}
                  </span>
                </div>
              )}
              {resolvedProfile?.fields.filter((field) => field.definition.fieldId !== "shot_description" && field.surface.visible).map((field) => <AnalysisFieldEntryInput key={field.definition.fieldId} definition={field.definition} surface={field.surface} entry={currentDims[field.definition.fieldId]} onCommand={handleAnalysisFieldCommand} onEditingStart={beginHistoryInput} onEditingEnd={endHistoryInput} issue={field.issues[0]} />)}
              {template && !resolvedProfile?.fields.some((field) => field.definition.fieldId !== "shot_description" && field.surface.visible) && <p className="rounded-lg border border-border bg-bg-card p-4 text-xs leading-5 text-text-muted">当前模板未配置额外字段，可通过设置选择分析任务。</p>}
            </div>
          )}

          {/* ── 批注 tab ── */}
          {panel === "notes" && (
            <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
              <div>
                <p className="editor-heading font-mono text-text-muted mb-2 tracking-wider">
                  画面内容
                </p>
                <Textarea
                  value={currentNotes.content}
                  onFocus={beginHistoryInput}
                  onBlur={endHistoryInput}
                  onChange={(e) =>
                    setShotNotes((d) => ({
                      ...d,
                      [activeShotId]: {
                        ...d[activeShotId],
                        content: e.target.value,
                      },
                    }))
                  }
                  rows={4}
                  placeholder="描述这个镜头的画面内容..."
                  className="min-h-0 resize-none rounded-xl border-border bg-bg-input p-3 editor-body text-text-dim placeholder:editor-meta focus-visible:border-accent/50 focus-visible:ring-0"
                />
              </div>
              <div className="h-px bg-border" />
              <div>
                <p className="editor-heading font-mono text-text-muted mb-2 tracking-wider">
                  镜头分析
                </p>
                <Textarea
                  value={currentNotes.analysis}
                  onFocus={beginHistoryInput}
                  onBlur={endHistoryInput}
                  onChange={(e) =>
                    setShotNotes((d) => ({
                      ...d,
                      [activeShotId]: {
                        ...d[activeShotId],
                        analysis: e.target.value,
                      },
                    }))
                  }
                  rows={6}
                  placeholder="记录镜头语言、导演意图、叙事功能..."
                  className="min-h-0 resize-none rounded-xl border-border bg-bg-input p-3 editor-body text-text-dim placeholder:editor-meta focus-visible:border-accent/50 focus-visible:ring-0"
                />
              </div>
            </div>
          )}

          {panel === "group" && (
            <ShotGroupInspector
              group={selectedGroup}
              indexes={selectedGroupIndexes}
              durationSeconds={selectedGroupDuration}
              onUpdate={updateCurrentShotGroup}
              onAdjustRange={adjustCurrentShotGroup}
            />
          )}
        </aside>
      </div>
      </AnalyzeWorkspace>
      </div> : null}
      {workflowStage !== "analyze" ? (
      workflowStage === "prepare" ? (
        <PrepareView
          project={project}
          media={media}
          videoUrl={videoUrl}
          isSelectingVideo={isSelectingVideo}
          onImportVideo={onImportVideo}
          onGoToAnalyze={() => onWorkflowNavigate?.("analyze", "scenes")}
          onGoToCalibrate={async () => {
            if (!videoUrl || !autoShotRun) throw new Error("当前视频或检测结果不可用。")
            await prepareDetectionCalibration(videoUrl, {
              projectId,
              mediaIdentity: autoShotRun.mediaIdentity,
              mediaSource: autoShotMediaFingerprint,
              frameRate: editorFrameRate,
              baseProjectUpdatedAt: project.updatedAt,
              task: autoShotRun,
              shots: calibrationFormalShots,
            })
            onWorkflowNavigate?.("calibrate", "candidates")
          }}
          onOpenSettings={() => setIsTemplateEditorOpen(true)}
          settings={autoShotControl.settings}
          resolved={autoShotControl.resolved}
          presets={autoShotPresets}
          record={autoShotRun}
          isActive={autoShotTask.isActive}
          error={autoShotTask.error ?? autoShotControl.error?.message ?? null}
          onChange={autoShotControl.updateSettings}
          onStart={() => void startAutoShotDetection()}
          onPause={() => void autoShotTask.pause()}
          onRestart={() => void startAutoShotDetection(true)}
        />
      ) : workflowStage === "overview" ? (
        <OverviewView
          view={workflowView}
          shots={shots}
          shotFrames={shotFrames}
          groups={shotGroups}
          markers={annotationMarkers}
          durationSeconds={durationSeconds}
          frameRate={media.metadata?.frameRate ?? null}
          selectedShotId={shots[activeShot]?.id ?? null}
          onViewChange={(view) => onWorkflowNavigate?.("overview", view)}
          onSelectShot={(index) => {
            setActiveShot(index)
            setCurrentTime(shots[index]?.start ?? 0)
            setSelectedGroupId(null)
          }}
          onEnterResearch={(shot) => {
            const startUs = Math.round(shot.start * 1_000_000)
            const endUs = Math.round((shot.start + shot.duration) * 1_000_000)
            setSessionResearchMode("range")
            setSessionResearchScope({ kind: "transient-range", fromUs: startUs, toUs: endUs })
            setSessionResearchQueue([shot.id])
            setSessionResearchTarget({ kind: "shot", id: shot.id })
            onWorkflowNavigate?.("analyze", "shots", { mode: "range", scopeKind: "transient-range", fromUs: startUs, toUs: endUs, targetKind: "shot", targetId: shot.id })
          }}
          onEnterSequential={() => {
            setSessionResearchMode("sequential")
            setSessionResearchScope({ kind: "full-film" })
            setSessionResearchQueue(shots.map((shot) => shot.id), activeShot)
            setSessionResearchTarget(shots[activeShot] ? { kind: "shot", id: shots[activeShot].id } : null)
            onWorkflowNavigate?.("analyze", "shots", { mode: "sequential", scopeKind: "full-film", targetKind: "shot", targetId: shots[activeShot]?.id })
          }}
          onOpenScene={(group) => {
            setSelectedGroupId(group.id)
            const firstIndex = shots.findIndex((shot) => shot.id === group.shotIds[0])
            if (firstIndex >= 0) setActiveShot(firstIndex)
            onWorkflowNavigate?.("analyze", "scenes")
          }}
          onStartSelection={() => {
            setSelectedShotIds([])
            setIsSelectingGroupShots(true)
            onWorkflowNavigate?.("analyze", "scenes")
          }}
        />
      ) : workflowStage === "learn" ? (
        <LearnView
          shots={shots}
          groups={shotGroups}
          notes={shotNotes}
          researchRanges={researchWorkbench.ranges}
          researchContexts={researchWorkbench.contexts}
          onOpenSource={(source: LearningSource) => {
            if (source.kind === "shot") {
              const index = shots.findIndex((shot) => shot.id === source.id)
              if (index >= 0) {
                setActiveShot(index)
                setCurrentTime(shots[index]?.start ?? 0)
              }
            } else if (source.kind === "group") {
              setSelectedGroupId(source.id)
              const index = shots.findIndex((shot) => shot.id === source.shotId)
              if (index >= 0) setActiveShot(index)
            } else {
              setSelectedGroupId(null)
              setSessionResearchTarget({ kind: "range", id: source.id })
              const range = researchWorkbench.ranges.find((item) => item.id === source.id)
              if (range) {
                setCurrentTime(range.startUs / 1_000_000)
                setSessionResearchMode("range")
                setSessionResearchScope({ kind: "saved-range", id: range.id, fromUs: range.startUs, toUs: range.endUs })
              }
            }
            onWorkflowNavigate?.("analyze", "scenes")
          }}
          onGoToAnalyze={() => onWorkflowNavigate?.("analyze", "scenes")}
          onGoToCreate={() => onWorkflowNavigate?.("create", "coming-soon")}
        />
      ) : workflowStage === "create" ? (
        <CreateView onBackToLearn={() => onWorkflowNavigate?.("learn", "notes")} />
      ) : (
        <CalibrateView
          projectId={projectId}
          projectUpdatedAt={mediaProject.updatedAt}
          mediaIdentity={autoShotRun?.mediaIdentity ?? autoShotTask.mediaIdentity}
          mediaSource={media.source}
          videoUrl={videoUrl}
          frameRate={editorFrameRate}
          totalFrames={resolveAutoShotTotalFrames(autoShotRun?.candidates ?? [], durationSeconds, editorFrameRate)}
          durationSeconds={durationSeconds}
          task={autoShotRun}
          taskLoading={autoShotTask.isLoading}
          formalShots={calibrationFormalShots}
          previewProps={{
            showCompositionGrid: maskOn,
            compositionOverlay,
            contentOverlay,
            contentOverlayModel,
            isCompositionOverlayEditing: activeTool === "mask" && compositionOverlay.enabled,
            compositionDrawingTool,
            selectedCompositionShapeId,
            onCompositionShapesChange: updateCompositionShapes,
            onCompositionShapeEditEnd: commitCompositionShapeHistory,
            onSelectedCompositionShapeChange: setSelectedCompositionShapeId,
            onCompositionDrawingToolChange: setCompositionDrawingTool,
            backgroundColor: canvasBackgroundColor,
            zoom: previewZoom,
            aspectPreset: previewAspectPreset,
            fullscreenRequest,
            compositionCancelRequest,
            onFullscreenChange: setIsPreviewFullscreen,
            onActivate: () => setActiveShortcutSurface("preview"),
            sourceWidth: media.metadata?.width ?? 0,
            sourceHeight: media.metadata?.height ?? 0,
            videoUrl,
            videoRef,
            status: playbackStatus,
            errorMessage: playbackErrorMessage,
            onRetry: retryVideoPlayback,
            onLoadedMetadata,
            onTimeUpdate: handleVideoTimeUpdate,
            onPlay,
            onPause,
            onEnded,
            onSeeking,
            onSeeked,
            onWaiting,
            onCanPlay,
            onError,
          }}
          controlsProps={{
            currentTime,
            durationSeconds,
            isPlaying: playing,
            isUnavailable: playbackStatus === "loading" || playbackStatus === "error",
            isMuted,
            speed,
            canvasBackgroundColor,
            zoom: previewZoom,
            aspectPreset: previewAspectPreset,
            showSafeMargins: compositionOverlay.showSafeMargins,
            isFullscreen: isPreviewFullscreen,
            onPreviousShot: () => setCurrentTime(Math.max(0, currentTime - 1)),
            onNextShot: () => setCurrentTime(Math.min(durationSeconds, currentTime + 1)),
            onCurrentTimeChange: setCurrentTime,
            onPlayingChange: playViewRange,
            onMutedChange: setMuted,
            onSpeedChange: setSpeed,
            onCanvasBackgroundColorChange: setCanvasBackgroundColor,
            onZoomChange: setPreviewZoom,
            onAspectPresetChange: setPreviewAspectPreset,
            onSafeMarginsChange: (visible) => updateCompositionOverlay({ ...compositionOverlay, showSafeMargins: visible }),
            onFullscreenToggle: () => setFullscreenRequest((request) => request + 1),
          }}
          onApply={applyCalibrationDraftToEditor}
          onBackToPrepare={() => onWorkflowNavigate?.("prepare", "media")}
        />
      )
      ) : null}
      </Suspense>
      {isTemplateEditorOpen && template && (
        <TemplateEditorModal
          template={template}
          onClose={() => setIsTemplateEditorOpen(false)}
          onApplyTemplate={saveTemplate}
        />
      )}
      {isExportDialogOpen && (
        <Suspense fallback={null}>
          <ReportExportDialog
            input={{
              projectTitle,
              shots: shots.map((shot) => ({
                ...shot,
                description: shotNotes[shot.id]?.content ?? "",
                notes: shotNotes[shot.id]?.analysis ?? "",
                analysisFields: shotDims[shot.id] ?? {},
                screenshotId:
                  primaryShotScreenshotIds[shot.id] ??
                  shotBoundaryScreenshotIds[shot.id]?.first ??
                  null,
              })),
              groups: shotGroups,
              fields: resolvedProfile?.fields ?? [],
              screenshotUrls: shotScreenshotUrls,
              researchRanges: researchWorkbench.ranges,
              researchContexts: researchWorkbench.contexts,
            }}
            isExporting={isExporting}
            onClose={() => setIsExportDialogOpen(false)}
            onExport={(format) => void exportReport(format)}
            onOpenVideoExport={() => {
              setIsExportDialogOpen(false)
              setVideoExportError(null)
              setIsVideoExportDialogOpen(true)
            }}
          />
        </Suspense>
      )}
      {isVideoExportDialogOpen && (
        <Suspense fallback={null}>
          <VideoExportDialog
            sourceWidth={media.metadata?.width ?? 1920}
            sourceHeight={media.metadata?.height ?? 1080}
            frameRate={media.metadata?.frameRate ?? FPS}
            durationSeconds={media.metadata?.durationSeconds ?? durationSeconds}
            isExporting={isVideoExporting}
            progress={videoExportProgress}
            error={videoExportError}
            onClose={closeVideoExportDialog}
            onStart={(settings) => void exportAnalysisVideo(settings)}
            onCancel={cancelAnalysisVideoExport}
          />
        </Suspense>
      )}
    </div>
  )
}
