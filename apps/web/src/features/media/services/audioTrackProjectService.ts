import projectRepository from "../../project/services/projectRepository";
import { createDefaultAudioTrack, createLinkedAudioAsset, inspectLocalAudio, selectLocalAudio } from "../../project/services/mediaService";
import type { AudioClip, AudioTrack, ProjectRecord } from "../../project/types";

function createAudioClip(assetId: string, startFrame: number, durationSeconds: number, frameRate: number): AudioClip {
  return {
    id: crypto.randomUUID(),
    assetId,
    startFrame: Math.max(0, Math.round(startFrame)),
    inFrame: 0,
    durationFrames: Math.max(1, Math.round(durationSeconds * frameRate)),
    gainDb: 0,
    muted: false,
    fadeInFrames: 0,
    fadeOutFrames: 0,
  };
}
function appendAudioAsset(project: ProjectRecord, assetId: string, durationSeconds: number, frameRate: number, startFrame: number, name: string): ProjectRecord {
  const track = createDefaultAudioTrack(project.id);
  track.name = name.replace(/\.[^/.]+$/, "") || track.name;
  track.order = project.audioTracks.length;
  track.clips = [createAudioClip(assetId, startFrame, durationSeconds, frameRate)];
  return { ...project, audioTracks: [...project.audioTracks, track] };
}

export async function importAudioTrack(project: ProjectRecord, frameRate: number, startFrame: number): Promise<ProjectRecord> {
  const selectedAudio = await selectLocalAudio();
  const inspectedAudio = await inspectLocalAudio(selectedAudio);
  const asset = createLinkedAudioAsset(project.id, inspectedAudio.source!, inspectedAudio.metadata!);
  if (selectedAudio.handle) await projectRepository.saveMediaAssetHandle(asset.id, selectedAudio.handle);
  else await projectRepository.saveMediaAssetBlob(asset.id, selectedAudio.file);
  const nextProject = appendAudioAsset({ ...project, mediaAssets: [...project.mediaAssets, asset] }, asset.id, asset.metadata!.durationSeconds, frameRate, startFrame, asset.name);
  return projectRepository.updateProject(nextProject);
}

export async function saveAudioTracks(project: ProjectRecord, audioTracks: AudioTrack[]): Promise<ProjectRecord> {
  return projectRepository.updateProject({ ...project, audioTracks: audioTracks.map((track, order) => ({ ...track, order })) });
}

export function splitAudioTrackAtFrame(track: AudioTrack, frame: number): AudioTrack {
  const clipIndex = track.clips.findIndex((clip) => frame > clip.startFrame && frame < clip.startFrame + clip.durationFrames);
  if (clipIndex < 0) return track;
  const clip = track.clips[clipIndex];
  if (!clip) return track;
  const leftDuration = frame - clip.startFrame;
  const rightDuration = clip.durationFrames - leftDuration;
  const leftClip: AudioClip = { ...clip, durationFrames: leftDuration, fadeInFrames: Math.min(clip.fadeInFrames, leftDuration), fadeOutFrames: 0 };
  const rightClip: AudioClip = { ...clip, id: crypto.randomUUID(), startFrame: frame, inFrame: clip.inFrame + leftDuration, durationFrames: rightDuration, fadeInFrames: 0, fadeOutFrames: Math.min(clip.fadeOutFrames, rightDuration) };
  return { ...track, clips: [...track.clips.slice(0, clipIndex), leftClip, rightClip, ...track.clips.slice(clipIndex + 1)] };
}
