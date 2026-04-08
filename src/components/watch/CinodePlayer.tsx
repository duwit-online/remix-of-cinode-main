import Hls from "hls.js";
import { forwardRef, useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Loader2,
  Maximize,
  Minimize,
  Pause,
  PictureInPicture2,
  Play,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
} from "lucide-react";

type Option = { label: string; value: number };

interface CinodePlayerProps {
  src: string;
  title: string;
  poster?: string;
  onError: () => void;
}

function formatTime(seconds: number) {
  if (!Number.isFinite(seconds) || seconds <= 0) return "0:00";
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  if (hours > 0) return `${hours}:${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  return `${minutes}:${String(secs).padStart(2, "0")}`;
}

const CinodePlayer = forwardRef<HTMLVideoElement, CinodePlayerProps>(({ src, title, poster, onError }, forwardedRef) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const hideTimer = useRef<number | null>(null);
  const hlsRef = useRef<Hls | null>(null);
  const resumedRef = useRef(false);

  const [playing, setPlaying] = useState(true);
  const [loading, setLoading] = useState(true);
  const [showControls, setShowControls] = useState(true);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [buffered, setBuffered] = useState(0);
  const [volume, setVolume] = useState(1);
  const [muted, setMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [hoverPercent, setHoverPercent] = useState<number | null>(null);
  const [qualities, setQualities] = useState<Option[]>([]);
  const [selectedQuality, setSelectedQuality] = useState(-1);
  const [subtitleTracks, setSubtitleTracks] = useState<Option[]>([{ label: "Off", value: -1 }]);
  const [selectedSubtitle, setSelectedSubtitle] = useState(-1);
  const [audioTracks, setAudioTracks] = useState<Option[]>([]);
  const [selectedAudio, setSelectedAudio] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1);

  const isHlsSource = useMemo(() => src.includes("format=hls") || src.endsWith(".m3u8"), [src]);

  useEffect(() => {
    if (!forwardedRef) return;
    if (typeof forwardedRef === "function") forwardedRef(videoRef.current);
    else forwardedRef.current = videoRef.current;
  }, [forwardedRef]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    resumedRef.current = false;
    setLoading(true);
    setCurrentTime(0);
    setDuration(0);
    setBuffered(0);
    setQualities([]);
    setSelectedQuality(-1);
    setSubtitleTracks([{ label: "Off", value: -1 }]);
    setSelectedSubtitle(-1);
    setAudioTracks([]);
    setSelectedAudio(0);

    hlsRef.current?.destroy();
    hlsRef.current = null;

    video.pause();
    video.removeAttribute("src");
    video.load();
    video.volume = 1;
    video.muted = false;
    video.playbackRate = playbackRate;

    const canUseNativeHls = video.canPlayType("application/vnd.apple.mpegurl") !== "";

    if (isHlsSource && !canUseNativeHls && Hls.isSupported()) {
      const hls = new Hls({ enableWorker: true, lowLatencyMode: true, backBufferLength: 90 });
      hlsRef.current = hls;
      hls.loadSource(src);
      hls.attachMedia(video);

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        const levelOptions = Array.from(new Map(hls.levels.map((level, index) => [level.height || index, { label: level.height ? `${level.height}p` : `Level ${index + 1}`, value: index }])).values());
        setQualities([{ label: "Auto", value: -1 }, ...levelOptions]);
        const hlsAudioTracks = hls.audioTracks.map((track, index) => ({ label: track.name || track.lang || `Audio ${index + 1}`, value: index }));
        setAudioTracks(hlsAudioTracks);
        setSelectedAudio(hls.audioTrack >= 0 ? hls.audioTrack : 0);
        const hlsSubtitleTracks = hls.subtitleTracks.map((track, index) => ({ label: track.name || track.lang || `Subtitle ${index + 1}`, value: index }));
        setSubtitleTracks([{ label: "Off", value: -1 }, ...hlsSubtitleTracks]);
        video.play().catch(() => setPlaying(false));
      });

      hls.on(Hls.Events.ERROR, (_, data) => {
        if (data.fatal) onError();
      });
    } else {
      video.src = src;
      video.load();
      video.play().catch(() => setPlaying(false));
    }

    const updateBuffered = () => {
      try {
        const end = video.buffered.length ? video.buffered.end(video.buffered.length - 1) : 0;
        setBuffered(end);
      } catch {
        setBuffered(0);
      }
    };

    const syncNativeTracks = () => {
      const nativeTextTracks = Array.from(video.textTracks || []).map((track, index) => ({ label: track.label || track.language || `Subtitle ${index + 1}`, value: index }));
      if (nativeTextTracks.length > 0 && subtitleTracks.length <= 1) setSubtitleTracks([{ label: "Off", value: -1 }, ...nativeTextTracks]);
    };

    const onLoadedMetadata = () => {
      setDuration(Number.isFinite(video.duration) ? video.duration : 0);
      syncNativeTracks();
    };
    const onCanPlay = () => setLoading(false);
    const onWaiting = () => setLoading(true);
    const onPlaying = () => {
      setLoading(false);
      setPlaying(true);
    };
    const onPause = () => setPlaying(false);
    const onTimeUpdate = () => setCurrentTime(video.currentTime || 0);
    const onProgress = () => updateBuffered();
    const onVolumeChange = () => {
      setVolume(video.volume);
      setMuted(video.muted || video.volume === 0);
    };

    video.addEventListener("loadedmetadata", onLoadedMetadata);
    video.addEventListener("canplay", onCanPlay);
    video.addEventListener("waiting", onWaiting);
    video.addEventListener("playing", onPlaying);
    video.addEventListener("pause", onPause);
    video.addEventListener("timeupdate", onTimeUpdate);
    video.addEventListener("progress", onProgress);
    video.addEventListener("volumechange", onVolumeChange);
    video.addEventListener("error", onError);

    return () => {
      video.removeEventListener("loadedmetadata", onLoadedMetadata);
      video.removeEventListener("canplay", onCanPlay);
      video.removeEventListener("waiting", onWaiting);
      video.removeEventListener("playing", onPlaying);
      video.removeEventListener("pause", onPause);
      video.removeEventListener("timeupdate", onTimeUpdate);
      video.removeEventListener("progress", onProgress);
      video.removeEventListener("volumechange", onVolumeChange);
      video.removeEventListener("error", onError);
      hlsRef.current?.destroy();
      hlsRef.current = null;
    };
  }, [src, onError, isHlsSource, playbackRate, subtitleTracks.length]);

  useEffect(() => {
    const onFullscreenChange = () => setIsFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", onFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", onFullscreenChange);
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (["INPUT", "TEXTAREA", "SELECT"].includes((event.target as HTMLElement)?.tagName)) return;
      const video = videoRef.current;
      if (!video) return;

      if (event.code === "Space") {
        event.preventDefault();
        if (video.paused) video.play();
        else video.pause();
      }

      if (event.key === "ArrowRight") video.currentTime += 10;
      if (event.key === "ArrowLeft") video.currentTime = Math.max(0, video.currentTime - 10);
      if (event.key === "ArrowUp") video.volume = Math.min(1, video.volume + 0.1);
      if (event.key === "ArrowDown") video.volume = Math.max(0, video.volume - 0.1);
      if (event.key.toLowerCase() === "m") video.muted = !video.muted;
      if (event.key.toLowerCase() === "f") {
        if (document.fullscreenElement) document.exitFullscreen();
        else wrapperRef.current?.requestFullscreen();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    video.playbackRate = playbackRate;
  }, [playbackRate]);

  const resetHideTimer = () => {
    setShowControls(true);
    if (hideTimer.current) window.clearTimeout(hideTimer.current);
    if (playing) hideTimer.current = window.setTimeout(() => setShowControls(false), 2600);
  };

  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) video.play();
    else video.pause();
    resetHideTimer();
  };

  const seekTo = (nextTime: number) => {
    const video = videoRef.current;
    if (!video) return;
    video.currentTime = Math.min(duration || 0, Math.max(0, nextTime));
    setCurrentTime(video.currentTime);
  };

  const changeVolume = (nextVolume: number) => {
    const video = videoRef.current;
    if (!video) return;
    video.volume = nextVolume;
    video.muted = nextVolume === 0;
  };

  const toggleFullscreen = async () => {
    if (document.fullscreenElement) await document.exitFullscreen();
    else await wrapperRef.current?.requestFullscreen();
  };

  const togglePiP = async () => {
    const video = videoRef.current;
    if (!video) return;
    try {
      if (document.pictureInPictureElement) await document.exitPictureInPicture();
      else await video.requestPictureInPicture();
    } catch {
      // no-op
    }
  };

  const setQuality = (value: number) => {
    setSelectedQuality(value);
    if (hlsRef.current) hlsRef.current.currentLevel = value;
  };

  const setSubtitle = (value: number) => {
    setSelectedSubtitle(value);
    if (hlsRef.current) {
      hlsRef.current.subtitleTrack = value;
      return;
    }

    const video = videoRef.current;
    if (!video) return;
    Array.from(video.textTracks || []).forEach((track, index) => {
      track.mode = value === index ? "showing" : "disabled";
    });
  };

  const setAudio = (value: number) => {
    setSelectedAudio(value);
    if (hlsRef.current) hlsRef.current.audioTrack = value;
  };

  const bufferedPercent = duration > 0 ? Math.min((buffered / duration) * 100, 100) : 0;
  const playedPercent = duration > 0 ? Math.min((currentTime / duration) * 100, 100) : 0;
  const previewTime = hoverPercent !== null ? (duration * hoverPercent) / 100 : null;
  const showQualitySelect = qualities.length > 1;
  const showSubtitleSelect = subtitleTracks.length > 1;
  const showAudioSelect = audioTracks.length > 0;

  return (
    <div
      ref={wrapperRef}
      className="relative h-full w-full overflow-hidden rounded-[1.5rem] bg-black sm:rounded-[1.75rem]"
      onMouseMove={resetHideTimer}
      onTouchStart={resetHideTimer}
    >
      <video
        ref={videoRef}
        poster={poster}
        className="h-full w-full object-contain"
        autoPlay
        playsInline
        crossOrigin="anonymous"
        preload="metadata"
      />

      <AnimatePresence>
        {loading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="pointer-events-none absolute inset-0 flex items-center justify-center bg-background/20 backdrop-blur-sm"
          >
            <div className="flex items-center gap-2 rounded-full glass px-4 py-2 text-sm text-foreground">
              <Loader2 size={16} className="animate-spin text-primary" />
              Buffering…
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showControls && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 flex flex-col justify-between bg-gradient-to-t from-background/90 via-transparent to-background/50"
          >
            <div className="flex items-start justify-between gap-3 p-3 sm:p-5">
              <div className="max-w-[70%]">
                <p className="text-[10px] font-semibold uppercase tracking-[0.35em] text-primary">Cinode Player</p>
                <h2 className="mt-1 text-sm font-semibold text-foreground sm:text-base">{title}</h2>
              </div>
              <div className="rounded-full bg-card/70 px-3 py-1 text-[11px] text-muted-foreground backdrop-blur-md">
                {formatTime(currentTime)} / {formatTime(duration)}
              </div>
            </div>

            <div className="absolute inset-x-0 top-1/2 flex -translate-y-1/2 items-center justify-center gap-2 px-3 sm:gap-3 sm:px-4">
              <button onClick={() => seekTo(currentTime - 10)} className="rounded-full glass p-2.5 text-foreground transition-transform hover:scale-105 sm:p-3">
                <SkipBack size={18} />
              </button>
              <button onClick={togglePlay} className="rounded-full bg-primary p-3.5 text-primary-foreground shadow-2xl shadow-primary/30 transition-transform hover:scale-105 sm:p-4">
                {playing ? <Pause size={22} /> : <Play size={22} className="ml-0.5" fill="currentColor" />}
              </button>
              <button onClick={() => seekTo(currentTime + 10)} className="rounded-full glass p-2.5 text-foreground transition-transform hover:scale-105 sm:p-3">
                <SkipForward size={18} />
              </button>
            </div>

            <div className="space-y-3 p-3 sm:p-5">
              <div className="space-y-2">
                <div className="relative">
                  <div className="h-1.5 rounded-full bg-foreground/15">
                    <div className="h-full rounded-full bg-muted" style={{ width: `${bufferedPercent}%` }} />
                    <div className="-mt-1.5 h-1.5 rounded-full bg-primary" style={{ width: `${playedPercent}%` }} />
                  </div>
                  {previewTime !== null && (
                    <div className="absolute bottom-5 z-10 w-24 -translate-x-1/2 overflow-hidden rounded-2xl border border-border/40 bg-card/90 shadow-2xl backdrop-blur-md sm:w-28" style={{ left: `${hoverPercent}%` }}>
                      {poster ? <img src={poster} alt={`${title} preview`} className="h-14 w-full object-cover sm:h-16" loading="lazy" /> : <div className="h-14 w-full bg-secondary/60 sm:h-16" />}
                      <div className="px-2 py-1 text-center text-[10px] text-foreground">{formatTime(previewTime)}</div>
                    </div>
                  )}
                </div>
                <input
                  type="range"
                  min={0}
                  max={duration || 0}
                  step={0.1}
                  value={currentTime}
                  onChange={(event) => seekTo(Number(event.target.value))}
                  onMouseMove={(event) => {
                    const rect = event.currentTarget.getBoundingClientRect();
                    setHoverPercent(((event.clientX - rect.left) / rect.width) * 100);
                  }}
                  onMouseLeave={() => setHoverPercent(null)}
                  className="cinode-progress-slider h-4 w-full"
                />
              </div>

              <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
                <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                  <button onClick={togglePlay} className="rounded-full glass p-2.5 text-foreground">
                    {playing ? <Pause size={16} /> : <Play size={16} fill="currentColor" />}
                  </button>
                  <button onClick={() => seekTo(currentTime - 10)} className="rounded-full glass p-2.5 text-foreground md:hidden">
                    <SkipBack size={16} />
                  </button>
                  <button onClick={() => seekTo(currentTime + 10)} className="rounded-full glass p-2.5 text-foreground md:hidden">
                    <SkipForward size={16} />
                  </button>
                  <div className="flex min-w-[120px] flex-1 items-center gap-2 rounded-full glass px-3 py-2 sm:min-w-[132px] sm:flex-none">
                    <button onClick={() => changeVolume(muted || volume === 0 ? 1 : 0)} className="text-foreground">
                      {muted || volume === 0 ? <VolumeX size={16} /> : <Volume2 size={16} />}
                    </button>
                    <input type="range" min={0} max={1} step={0.05} value={muted ? 0 : volume} onChange={(event) => changeVolume(Number(event.target.value))} className="cinode-slider w-full" />
                  </div>
                  <div className="rounded-full bg-card/70 px-3 py-2 text-[11px] text-muted-foreground backdrop-blur-md sm:hidden">
                    {formatTime(currentTime)} / {formatTime(duration)}
                  </div>
                  <button onClick={togglePiP} className="rounded-full glass p-2.5 text-foreground">
                    <PictureInPicture2 size={16} />
                  </button>
                  <button onClick={toggleFullscreen} className="rounded-full glass p-2.5 text-foreground">
                    {isFullscreen ? <Minimize size={16} /> : <Maximize size={16} />}
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:items-center sm:justify-end">
                  <select value={playbackRate} onChange={(event) => setPlaybackRate(Number(event.target.value))} className="rounded-full bg-card/80 px-3 py-2 text-xs text-foreground outline-none ring-1 ring-border/40">
                    {[0.5, 0.75, 1, 1.25, 1.5, 2].map((rate) => (
                      <option key={rate} value={rate}>{rate}x</option>
                    ))}
                  </select>

                  {showQualitySelect && (
                    <select value={selectedQuality} onChange={(event) => setQuality(Number(event.target.value))} className="rounded-full bg-card/80 px-3 py-2 text-xs text-foreground outline-none ring-1 ring-border/40">
                      {qualities.map((quality) => (
                        <option key={quality.label} value={quality.value}>{quality.label}</option>
                      ))}
                    </select>
                  )}

                  {showSubtitleSelect && (
                    <select value={selectedSubtitle} onChange={(event) => setSubtitle(Number(event.target.value))} className="rounded-full bg-card/80 px-3 py-2 text-xs text-foreground outline-none ring-1 ring-border/40">
                      {subtitleTracks.map((track) => (
                        <option key={track.label} value={track.value}>{track.label}</option>
                      ))}
                    </select>
                  )}

                  {showAudioSelect && (
                    <select value={selectedAudio} onChange={(event) => setAudio(Number(event.target.value))} className="rounded-full bg-card/80 px-3 py-2 text-xs text-foreground outline-none ring-1 ring-border/40">
                      {audioTracks.map((track) => (
                        <option key={track.label} value={track.value}>{track.label}</option>
                      ))}
                    </select>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
});

CinodePlayer.displayName = "CinodePlayer";

export default CinodePlayer;