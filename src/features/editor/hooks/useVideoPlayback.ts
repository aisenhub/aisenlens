import { useCallback, useEffect, useRef, useState } from "react";

export type VideoPlaybackStatus = "loading" | "ready" | "seeking" | "playing" | "paused" | "ended" | "error";

interface UseVideoPlaybackOptions {
  source: string;
  initialDurationSeconds: number;
}

export default function useVideoPlayback({ source, initialDurationSeconds }: UseVideoPlaybackOptions) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [currentTime, setCurrentTimeState] = useState(0);
  const [durationSeconds, setDurationSeconds] = useState(initialDurationSeconds);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [isMuted, setIsMutedState] = useState(false);
  const [status, setStatus] = useState<VideoPlaybackStatus>("loading");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const syncCurrentTime = useCallback((time: number) => setCurrentTimeState(time), []);

  const setCurrentTime = useCallback((time: number) => {
    const video = videoRef.current;
    const duration = video && Number.isFinite(video.duration) && video.duration > 0
      ? video.duration
      : durationSeconds;
    const nextTime = Math.max(0, Math.min(time, duration || 0));
    if (video) video.currentTime = nextTime;
    syncCurrentTime(nextTime);
  }, [durationSeconds, syncCurrentTime]);

  const previewCurrentTime = useCallback((time: number) => {
    const video = videoRef.current;
    if (!video) return;
    const duration = Number.isFinite(video.duration) && video.duration > 0 ? video.duration : durationSeconds;
    const nextTime = Math.max(0, Math.min(time, duration || 0));
    const seekableVideo = video as HTMLVideoElement & { fastSeek?: (time: number) => void };
    if (seekableVideo.fastSeek) seekableVideo.fastSeek(nextTime);
    else video.currentTime = nextTime;
  }, [durationSeconds]);

  const setPlaying = useCallback((shouldPlay: boolean) => {
    const video = videoRef.current;
    if (!video || status === "error") return;
    if (shouldPlay) {
      void video.play().catch(() => {
        setIsPlaying(false);
        setStatus("paused");
      });
    } else {
      video.pause();
    }
  }, [status]);

  const setSpeed = useCallback((speed: number) => {
    setPlaybackRate(speed);
    if (videoRef.current) videoRef.current.playbackRate = speed;
  }, []);

  const setMuted = useCallback((shouldMute: boolean) => {
    setIsMutedState(shouldMute);
    if (videoRef.current) videoRef.current.muted = shouldMute;
  }, []);

  const retry = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    setErrorMessage(null);
    setStatus("loading");
    video.load();
  }, []);

  useEffect(() => {
    setCurrentTimeState(0);
    setDurationSeconds(initialDurationSeconds);
    setIsPlaying(false);
    setStatus("loading");
    setErrorMessage(null);
  }, [initialDurationSeconds, source]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !("requestVideoFrameCallback" in video)) return;
    let callbackId = 0;
    let active = true;
    const onFrame: VideoFrameRequestCallback = (_now, metadata) => {
      if (!active) return;
      syncCurrentTime(metadata.mediaTime);
      callbackId = video.requestVideoFrameCallback(onFrame);
    };
    callbackId = video.requestVideoFrameCallback(onFrame);
    return () => {
      active = false;
      video.cancelVideoFrameCallback(callbackId);
    };
  }, [source, syncCurrentTime]);

  return {
    videoRef,
    currentTime,
    durationSeconds,
    isPlaying,
    playbackRate,
    isMuted,
    status,
    errorMessage,
    setCurrentTime,
    previewCurrentTime,
    setPlaying,
    setSpeed,
    setMuted,
    retry,
    onLoadedMetadata: (event: React.SyntheticEvent<HTMLVideoElement>) => {
      const duration = event.currentTarget.duration;
      if (Number.isFinite(duration) && duration > 0) setDurationSeconds(duration);
      event.currentTarget.playbackRate = playbackRate;
      event.currentTarget.muted = isMuted;
      setStatus(event.currentTarget.paused ? "ready" : "playing");
    },
    onTimeUpdate: (event: React.SyntheticEvent<HTMLVideoElement>) => syncCurrentTime(event.currentTarget.currentTime),
    onPlay: () => { setIsPlaying(true); setStatus("playing"); },
    onPause: () => { setIsPlaying(false); setStatus((current) => current === "ended" ? current : "paused"); },
    onEnded: () => { setIsPlaying(false); setStatus("ended"); },
    onSeeking: () => setStatus("seeking"),
    onSeeked: (event: React.SyntheticEvent<HTMLVideoElement>) => {
      syncCurrentTime(event.currentTarget.currentTime);
      setStatus(event.currentTarget.paused ? "paused" : "playing");
    },
    onWaiting: () => setStatus("loading"),
    onCanPlay: (event: React.SyntheticEvent<HTMLVideoElement>) => setStatus(event.currentTarget.paused ? "ready" : "playing"),
    onError: () => {
      setIsPlaying(false);
      setStatus("error");
      setErrorMessage("视频无法加载或浏览器不支持此编码。");
    },
  };
}
