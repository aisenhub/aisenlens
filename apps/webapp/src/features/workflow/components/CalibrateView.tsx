import CalibrationWorkspace from "../../shot-calibration/components/CalibrationWorkspace"
import type { CalibrationDraft } from "../../shot-calibration/types"
import type { AutoShotMediaIdentity } from "../../auto-shot/mediaIdentity"
import type { AutoShotTaskRecord } from "../../auto-shot/types"
import type { MediaSourceFingerprint, StoredShotRecord } from "../../project/types"
import type { VideoPlaybackControlsProps } from "../../editor/components/VideoPlaybackControls"
import type { VideoPreviewCanvasProps } from "../../editor/components/VideoPreviewCanvas"

interface CalibrateViewProps {
  projectId: string
  projectUpdatedAt: string
  mediaIdentity: AutoShotMediaIdentity | null
  mediaSource: MediaSourceFingerprint | null
  videoUrl: string | null
  frameRate: number
  totalFrames: number
  durationSeconds: number
  task: AutoShotTaskRecord | null
  taskLoading: boolean
  formalShots: readonly StoredShotRecord[]
  previewProps: VideoPreviewCanvasProps
  controlsProps: VideoPlaybackControlsProps
  onApply: (draft: CalibrationDraft) => Promise<void> | void
  onBackToPrepare: () => void
}

export default function CalibrateView(props: CalibrateViewProps) {
  return <CalibrationWorkspace {...props} onBack={props.onBackToPrepare} />
}
