import { useEffect, useRef, useState } from "react";
import { ChevronDown, ChevronUp, Music2, Plus, Scissors, Trash2, Volume2, VolumeX } from "lucide-react";
import { toast } from "sonner";
import { Button } from "../../../components/ui/button";
import type { AudioTrack, ProjectRecord } from "../../project/types";
import { importAudioTrack, saveAudioTracks, splitAudioTrackAtFrame } from "../services/audioTrackProjectService";

interface AudioTrackPanelProps {
  project: ProjectRecord;
  frameRate: number;
  currentFrame: number;
  onProjectUpdated: (project: ProjectRecord) => void;
}

export default function AudioTrackPanel({ project, frameRate, currentFrame, onProjectUpdated }: AudioTrackPanelProps) {
  const [tracks, setTracks] = useState(project.audioTracks);
  const [isImporting, setIsImporting] = useState(false);
  const projectRef = useRef(project);
  const tracksRef = useRef(project.audioTracks);

  useEffect(() => {
    projectRef.current = project;
    tracksRef.current = project.audioTracks;
    setTracks(project.audioTracks);
  }, [project]);

  const updateTracks = (nextTracks: AudioTrack[]) => {
    tracksRef.current = nextTracks;
    setTracks(nextTracks);
  };

  const commitTracks = async (nextTracks: AudioTrack[]) => {
    updateTracks(nextTracks);
    try {
      const updatedProject = await saveAudioTracks(projectRef.current, nextTracks);
      projectRef.current = updatedProject;
      onProjectUpdated(updatedProject);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "保存音频轨道失败。");
      updateTracks(projectRef.current.audioTracks);
    }
  };

  const importTrack = async () => {
    setIsImporting(true);
    try {
      const updatedProject = await importAudioTrack(projectRef.current, frameRate, currentFrame);
      projectRef.current = updatedProject;
      onProjectUpdated(updatedProject);
      toast.success("音频已添加到时间线。");
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      toast.error(error instanceof Error ? error.message : "导入音频失败。");
    } finally {
      setIsImporting(false);
    }
  };

  const reorderTrack = (trackId: string, direction: -1 | 1) => {
    const index = tracks.findIndex((track) => track.id === trackId);
    const targetIndex = index + direction;
    if (index < 0 || targetIndex < 0 || targetIndex >= tracks.length) return;
    const nextTracks = [...tracks];
    [nextTracks[index], nextTracks[targetIndex]] = [nextTracks[targetIndex]!, nextTracks[index]!];
    void commitTracks(nextTracks);
  };

  const updateTrackGain = (trackId: string, gainDb: number) => {
    setTracks((current) => {
      const nextTracks = current.map((item) => item.id === trackId ? { ...item, gainDb } : item);
      tracksRef.current = nextTracks;
      return nextTracks;
    });
  };

  return <div className="flex flex-col gap-3">
    <div className="grid grid-cols-1 gap-1.5">
      <Button type="button" variant="outline" size="sm" disabled={isImporting} onClick={() => void importTrack()} className="h-8 border-border text-text-dim hover:border-border-mid hover:text-white"><Plus />导入音频</Button>
    </div>
    {!tracks.length && <p className="editor-meta rounded-lg border border-dashed border-border bg-bg-deep px-2.5 py-3 text-center text-text-muted">导入音乐、旁白或环境音；每次导入会新增一条音频轨。</p>}
    {tracks.map((track, index) => <div key={track.id} className="rounded-lg border border-border/70 bg-bg-deep p-2.5">
      <div className="flex items-center gap-1.5"><Music2 className="size-3.5 text-accent" /><span className="min-w-0 flex-1 truncate editor-body text-text-base">{track.name}</span><Button type="button" variant="ghost" size="icon-xs" disabled={index === 0} onClick={() => reorderTrack(track.id, -1)} aria-label="上移音频轨" className="text-text-muted hover:text-white"><ChevronUp /></Button><Button type="button" variant="ghost" size="icon-xs" disabled={index === tracks.length - 1} onClick={() => reorderTrack(track.id, 1)} aria-label="下移音频轨" className="text-text-muted hover:text-white"><ChevronDown /></Button><Button type="button" variant="ghost" size="icon-xs" onClick={() => void commitTracks(tracks.map((item) => item.id === track.id ? { ...item, muted: !item.muted } : item))} aria-label={track.muted ? "取消静音" : "静音"} className="text-text-muted hover:text-white">{track.muted ? <VolumeX /> : <Volume2 />}</Button><Button type="button" variant="ghost" size="icon-xs" onClick={() => void commitTracks(tracks.filter((item) => item.id !== track.id))} aria-label="删除音频轨" className="text-text-muted hover:text-red-300"><Trash2 /></Button></div>
      <div className="mt-2 flex items-center gap-2"><span className="editor-meta w-7 text-text-muted">音量</span><input aria-label={`${track.name} 音量`} type="range" min="-24" max="12" step="1" value={track.gainDb} onChange={(event) => updateTrackGain(track.id, Number(event.target.value))} onPointerUp={() => void commitTracks(tracksRef.current)} onKeyUp={() => void commitTracks(tracksRef.current)} className="h-1 flex-1 cursor-pointer appearance-none rounded-full bg-border accent-accent" /><span className="editor-meta w-9 text-right font-mono text-text-dim">{track.gainDb}dB</span></div>
      <Button type="button" variant="ghost" size="sm" onClick={() => void commitTracks(tracks.map((item) => item.id === track.id ? splitAudioTrackAtFrame(item, currentFrame) : item))} className="mt-1.5 h-7 w-full border border-border/60 text-text-muted hover:border-border-mid hover:text-white"><Scissors />在播放头分割</Button>
      <p className="mt-1.5 editor-meta text-text-muted">{track.clips.length} 个片段 · {track.muted ? "已静音" : "启用"}</p>
    </div>)}
  </div>;
}
