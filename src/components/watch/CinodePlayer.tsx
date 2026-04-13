import Hls from "hls.js";
import React, { forwardRef, useEffect, useMemo, useRef, useState, useCallback, useImperativeHandle } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Loader2, Maximize, Minimize, Pause, PictureInPicture2,
  Play, RotateCcw, RotateCw, Volume2, VolumeX
} from "lucide-react";

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

const CinodePlayer = forwardRef<HTMLVideoElement, CinodePlayerProps>((props, forwardedRef) => {
  const { src, title, poster, onError } = props;

  const videoRef = useRef<HTMLVideoElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const hideTimer = useRef<number | null>(null);
  const hlsRef = useRef<Hls | null>(null);
  const progressRef = useRef<HTMLDivElement>(null);

  const [playing, setPlaying] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showControls, setShowControls] = useState(true);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [muted, setMuted] = useState(false);
  const [volume, setVolume] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [showSpeedMenu, setShowSpeedMenu] = useState(false);

  const isDirectSource = useMemo(() => {
    const s = src.toLowerCase();
    return s.includes(".m3u8") || s.includes(".mp4") || s.includes("/stream") || s.includes("/download") || s.includes("api_key=");
  }, [src]);

  useImperativeHandle(forwardedRef, () => videoRef.current!);

  useEffect(() => {
    const handleFsChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", handleFsChange);
    return () => document.removeEventListener("fullscreenchange", handleFsChange);
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const vid = videoRef.current;
      if (!vid || e.target instanceof HTMLInputElement) return;
      switch (e.key) {
        case " ": case "k": e.preventDefault(); vid.paused ? vid.play() : vid.pause(); break;
        case "ArrowLeft": e.preventDefault(); vid.currentTime = Math.max(0, vid.currentTime - 10); break;
        case "ArrowRight": e.preventDefault(); vid.currentTime = Math.min(duration, vid.currentTime + 10); break;
        case "ArrowUp": e.preventDefault(); vid.volume = Math.min(1, vid.volume + 0.1); setVolume(vid.volume); break;
        case "ArrowDown": e.preventDefault(); vid.volume = Math.max(0, vid.volume - 0.1); setVolume(vid.volume); break;
        case "m": setMuted(m => !m); break;
        case "f": if (!document.fullscreenElement) wrapperRef.current?.requestFullscreen(); else document.exitFullscreen(); break;
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [duration]);

  const cleanupHls = useCallback(() => {
    if (hlsRef.current) { hlsRef.current.destroy(); hlsRef.current = null; }
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !isDirectSource || !src) return;
    setLoading(true);
    cleanupHls();

    if (Hls.isSupported() && src.includes(".m3u8")) {
      const hls = new Hls({ enableWorker: true, lowLatencyMode: true });
      hlsRef.current = hls;
      hls.loadSource(src);
      hls.attachMedia(video);
      hls.on(Hls.Events.MANIFEST_PARSED, () => { video.play().catch(() => setShowControls(true)); });
      hls.on(Hls.Events.ERROR, (_, data) => { if (data.fatal) onError(); });
    } else {
      video.src = src;
      video.load();
      video.play().catch(() => setShowControls(true));
    }

    const handlers = {
      timeupdate: () => setCurrentTime(video.currentTime || 0),
      loadedmetadata: () => setDuration(video.duration || 0),
      playing: () => { setLoading(false); setPlaying(true); },
      pause: () => setPlaying(false),
      waiting: () => setLoading(true),
      canplay: () => setLoading(false),
    };
    Object.entries(handlers).forEach(([ev, fn]) => video.addEventListener(ev, fn));
    return () => {
      cleanupHls();
      Object.entries(handlers).forEach(([ev, fn]) => video.removeEventListener(ev, fn));
    };
  }, [src, isDirectSource, onError, cleanupHls]);

  const handleTogglePlay = useCallback((e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (!videoRef.current) return;
    videoRef.current.paused ? videoRef.current.play().catch(() => {}) : videoRef.current.pause();
  }, []);

  const skip = useCallback((e: React.MouseEvent, seconds: number) => {
    e.stopPropagation();
    if (videoRef.current) videoRef.current.currentTime = Math.max(0, Math.min(duration, videoRef.current.currentTime + seconds));
  }, [duration]);

  const toggleFs = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (!document.fullscreenElement) wrapperRef.current?.requestFullscreen();
    else document.exitFullscreen();
  }, []);

  const togglePiP = useCallback(async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      if (document.pictureInPictureElement) await document.exitPictureInPicture();
      else if (videoRef.current) await videoRef.current.requestPictureInPicture();
    } catch {}
  }, []);

  const onMouseMove = useCallback(() => {
    setShowControls(true);
    if (hideTimer.current) clearTimeout(hideTimer.current);
    if (playing) hideTimer.current = window.setTimeout(() => setShowControls(false), 3000);
  }, [playing]);

  const handleSeek = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    if (videoRef.current) videoRef.current.currentTime = pct * duration;
  }, [duration]);

  const handleVolumeChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    e.stopPropagation();
    const v = Number(e.target.value);
    setVolume(v);
    if (videoRef.current) videoRef.current.volume = v;
    setMuted(v === 0);
  }, []);

  const handleSpeedChange = useCallback((rate: number) => {
    setPlaybackRate(rate);
    if (videoRef.current) videoRef.current.playbackRate = rate;
    setShowSpeedMenu(false);
  }, []);

  const playedPercent = (currentTime / duration) * 100 || 0;

  // Iframe fallback for non-direct sources
  if (!isDirectSource && src) {
    return (
      <div className="relative w-full h-full bg-black">
        <iframe src={src} className="absolute inset-0 w-full h-full border-0" allow="autoplay; fullscreen; encrypted-media" allowFullScreen referrerPolicy="no-referrer" onLoad={() => setLoading(false)} />
      </div>
    );
  }

  return (
    <div
      ref={wrapperRef}
      className="relative w-full h-full bg-black cursor-pointer select-none overflow-hidden"
      onMouseMove={onMouseMove}
      onMouseLeave={() => playing && setShowControls(false)}
      onClick={handleTogglePlay}
    >
      <video
        ref={videoRef}
        poster={poster}
        className="absolute inset-0 w-full h-full object-contain"
        playsInline
        crossOrigin="anonymous"
        muted={muted}
      />

      {/* Loading spinner */}
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/30 z-30 pointer-events-none">
          <Loader2 className="animate-spin text-primary" size={40} />
        </div>
      )}

      {/* Controls overlay */}
      <AnimatePresence>
        {showControls && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-0 z-20 flex flex-col justify-between"
          >
            {/* Top gradient + title */}
            <div className="bg-gradient-to-b from-black/70 to-transparent px-3 pt-3 pb-8 sm:px-5 sm:pt-4" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between">
                <div className="min-w-0">
                  <span className="text-[8px] sm:text-[10px] font-black uppercase tracking-[0.3em] text-primary">Cinode</span>
                  <h2 className="text-xs sm:text-sm font-bold truncate max-w-[60vw]">{title}</h2>
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={togglePiP} className="p-1.5 hover:bg-white/10 rounded-full transition-colors">
                    <PictureInPicture2 size={16} />
                  </button>
                  <button onClick={toggleFs} className="p-1.5 hover:bg-white/10 rounded-full transition-colors">
                    {isFullscreen ? <Minimize size={16} /> : <Maximize size={16} />}
                  </button>
                </div>
              </div>
            </div>

            {/* Center play controls */}
            <div className="flex items-center justify-center gap-8 sm:gap-12 pointer-events-none">
              <button onClick={(e) => skip(e, -10)} className="pointer-events-auto text-white/80 hover:text-white transition-colors p-2">
                <RotateCcw size={24} className="sm:w-7 sm:h-7" />
              </button>
              <button
                onClick={handleTogglePlay}
                className="pointer-events-auto h-14 w-14 sm:h-16 sm:w-16 rounded-full bg-white/15 flex items-center justify-center backdrop-blur-md border border-white/20 hover:scale-105 active:scale-95 transition-all"
              >
                {playing
                  ? <Pause size={24} className="text-white fill-white" />
                  : <Play size={24} className="ml-0.5 text-white fill-white" />}
              </button>
              <button onClick={(e) => skip(e, 10)} className="pointer-events-auto text-white/80 hover:text-white transition-colors p-2">
                <RotateCw size={24} className="sm:w-7 sm:h-7" />
              </button>
            </div>

            {/* Bottom controls */}
            <div className="bg-gradient-to-t from-black/80 to-transparent px-3 pb-3 pt-8 sm:px-5 sm:pb-4 space-y-2" onClick={e => e.stopPropagation()}>
              {/* Seek bar */}
              <div
                ref={progressRef}
                className="relative h-1 bg-white/20 rounded-full cursor-pointer group/seek hover:h-1.5 transition-all"
                onClick={handleSeek}
              >
                <div className="absolute h-full bg-primary rounded-full transition-all" style={{ width: `${playedPercent}%` }} />
                <div
                  className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-primary rounded-full opacity-0 group-hover/seek:opacity-100 transition-opacity shadow-lg"
                  style={{ left: `calc(${playedPercent}% - 6px)` }}
                />
              </div>

              {/* Time + controls row */}
              <div className="flex items-center justify-between text-[10px] sm:text-xs">
                <span className="font-mono text-white/80">{formatTime(currentTime)} / {formatTime(duration)}</span>
                <div className="flex items-center gap-2 sm:gap-3">
                  {/* Volume */}
                  <div className="hidden sm:flex items-center gap-1.5 group/vol">
                    <button onClick={(e) => { e.stopPropagation(); setMuted(!muted); }}>
                      {muted || volume === 0 ? <VolumeX size={16} className="text-primary" /> : <Volume2 size={16} />}
                    </button>
                    <input
                      type="range" min={0} max={1} step={0.05} value={muted ? 0 : volume}
                      onChange={handleVolumeChange}
                      onClick={e => e.stopPropagation()}
                      className="w-16 h-1 accent-primary cursor-pointer"
                    />
                  </div>
                  {/* Mobile mute */}
                  <button className="sm:hidden p-1" onClick={(e) => { e.stopPropagation(); setMuted(!muted); }}>
                    {muted ? <VolumeX size={16} className="text-primary" /> : <Volume2 size={16} />}
                  </button>
                  {/* Speed */}
                  <div className="relative">
                    <button
                      onClick={(e) => { e.stopPropagation(); setShowSpeedMenu(!showSpeedMenu); }}
                      className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-white/10 hover:bg-white/20 transition-colors"
                    >
                      {playbackRate}x
                    </button>
                    {showSpeedMenu && (
                      <div className="absolute bottom-full right-0 mb-1 bg-card/95 backdrop-blur-lg rounded-lg border border-border/50 shadow-xl py-1 min-w-[4rem]">
                        {[0.5, 0.75, 1, 1.25, 1.5, 2].map(r => (
                          <button
                            key={r}
                            onClick={(e) => { e.stopPropagation(); handleSpeedChange(r); }}
                            className={`block w-full px-3 py-1 text-[10px] text-left hover:bg-white/10 transition-colors ${r === playbackRate ? "text-primary font-bold" : ""}`}
                          >
                            {r}x
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
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
