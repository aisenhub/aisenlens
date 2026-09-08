import type { ReactNode } from "react"

interface VideoViewerProps { children?: ReactNode; videoUrl?: string | null }

export default function VideoViewer({ children, videoUrl }: VideoViewerProps) {
  return <section className="flex aspect-video items-center justify-center bg-[#050505] text-center text-xs text-white/60">{children ?? (videoUrl ? "共享 Viewer 由当前深拆播放器提供" : "当前没有可用媒体")}</section>
}
