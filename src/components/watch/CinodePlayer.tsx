import Hls from "hls.js";
import React, { forwardRef, useEffect, useMemo, useRef, useState, useCallback, useImperativeHandle } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Loader2, Maximize, Minimize, Pause, PictureInPicture2,
  Play, RotateCcw, RotateCw, Volume2, VolumeX, Settings2
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

  const [playing, setPlaying] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showControls, setShowControls] = useState(true);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [muted, setMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Updated to recognize Jellyfin URLs as direct sources
  const isDirectSource = useMemo(() => {
    const s = src.toLowerCase();
    return (
      s.includes(".m3u8") ||
      s.includes(".mp4") ||
      s.includes("/stream") ||
      s.includes("/download") ||
      s.includes("api_key=")
    );
  }, [src]);

  useImperativeHandle(forwardedRef, () => videoRef.current!);

  useEffect(() => {
    const handleFsChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", handleFsChange);
    return () => document.removeEventListener("fullscreenchange", handleFsChange);
  }, []);

  const cleanupHls = useCallback(() => {
    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !isDirectSource || !src) return;

    setLoading(true);
    cleanupHls();

    // Strategy 1: HLS.js (For .m3u8 Jellyfin streams)
    if (Hls.isSupported() && src.includes(".m3u8")) {
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: true,
      });
      hlsRef.current = hls;
      hls.loadSource(src);
      hls.attachMedia(video);
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        video.play().catch(() => setShowControls(true));
      });
      hls.on(Hls.Events.ERROR, (_, data) => {
        if (data.fatal) onError();
      });
    }
    // Strategy 2: Direct Stream (Jellyfin /Download or /stream?static=true)
    else {
      video.src = src;
      video.load();
      video.play().catch((err) => {
        console.error("Playback failed. Check if your browser blocks HTTP content on HTTPS sites.", err);
        setShowControls(true);
      });
    }

    const handlers = {
      timeupdate: () => setCurrentTime(video.currentTime || 0),
      loadedmetadata: () => setDuration(video.duration || 0),
      playing: () => { setLoading(false); setPlaying(true); },
      pause: () => setPlaying(false),
      waiting: () => setLoading(true),
      canplay: () => setLoading(false)
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
    if (videoRef.current.paused) videoRef.current.play().catch(() => { });
    else videoRef.current.pause();
  }, []);

  const skip = useCallback((e: React.MouseEvent, seconds: number) => {
    e.stopPropagation();
    if (videoRef.current) {
      videoRef.current.currentTime = Math.max(0, Math.min(duration, videoRef.current.currentTime + seconds));
    }
  }, [duration]);

  const toggleFs = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (!document.fullscreenElement) wrapperRef.current?.requestFullscreen();
    else document.exitFullscreen();
  }, []);

  const onMouseMove = useCallback(() => {
    setShowControls(true);
    if (hideTimer.current) clearTimeout(hideTimer.current);
    if (playing) {
      hideTimer.current = window.setTimeout(() => setShowControls(false), 3000);
    }
  }, [playing]);

  const playedPercent = (currentTime / duration) * 100 || 0;

  if (!isDirectSource && src) {
    return (
      <div className="relative aspect-video w-full overflow-hidden bg-black sm:rounded-[2rem] border border-white/5 shadow-2xl">
        <iframe
          src={src}
          className="h-full w-full border-0"
          allow="autoplay; fullscreen; encrypted-media"
          allowFullScreen
          referrerPolicy="no-referrer"
          onLoad={() => setLoading(false)}
        />
      </div>
    );
  }

  return (
    <div
      ref={wrapperRef}
      className="group relative aspect-video w-full overflow-hidden bg-black sm:rounded-[2rem] border border-white/5 shadow-2xl cursor-pointer select-none"
      onMouseMove={onMouseMove}
      onMouseLeave={() => playing && setShowControls(false)}
      onClick={handleTogglePlay}
    >
      <video
        ref={videoRef}
        poster={poster}
        className="h-full w-full object-contain pointer-events-none"
        playsInline
        crossOrigin="anonymous"
        muted={muted}
      />

      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/20 backdrop-blur-[2px] z-[30] pointer-events-none">
          <Loader2 className="animate-spin text-primary" size={48} />
        </div>
      )}

      <AnimatePresence>
        {showControls && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="absolute inset-0 z-20 flex flex-col justify-between bg-gradient-to-t from-black/95 via-transparent to-black/60 p-4 sm:p-8"
          >
            <div className="flex justify-between items-start" onClick={e => e.stopPropagation()}>
              <div className="flex flex-col gap-1">
                <span className="text-[10px] font-black uppercase tracking-[0.4em] text-primary">Cinode Player</span>
                <h2 className="text-lg font-bold truncate max-w-md">{title}</h2>
              </div>
              <button onClick={toggleFs} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                {isFullscreen ? <Minimize size={24} /> : <Maximize size={24} />}
              </button>
            </div>

            <div className="flex items-center justify-center gap-6 sm:gap-14">
              <button onClick={(e) => skip(e, -10)} className="text-white/80 hover:text-primary transition-colors p-2">
                <RotateCcw size={32} className="sm:w-10 sm:h-10" />
              </button>

              <button
                onClick={handleTogglePlay}
                className="h-16 w-16 sm:h-24 sm:w-24 rounded-full bg-white/10 flex items-center justify-center backdrop-blur-xl border border-white/20 hover:scale-110 transition-all shadow-2xl"
              >
                {playing ? <Pause size={32} className="text-white fill-white" /> : <Play size={32} className="ml-1 text-white fill-white" />}
              </button>

              <button onClick={(e) => skip(e, 10)} className="text-white/80 hover:text-primary transition-colors p-2">
                <RotateCw size={32} className="sm:w-10 sm:h-10" />
              </button>
            </div>

            <div className="space-y-3 sm:space-y-5" onClick={e => e.stopPropagation()}>
              <div className="relative h-1 sm:h-1.5 bg-white/10 rounded-full cursor-pointer group overflow-hidden">
                <div className="absolute h-full bg-primary" style={{ width: `${playedPercent}%` }} />
                <input
                  type="range" min={0} max={duration || 0} value={currentTime} step="0.1"
                  onChange={e => videoRef.current && (videoRef.current.currentTime = Number(e.target.value))}
                  className="absolute inset-0 w-full opacity-0 cursor-pointer z-10"
                />
              </div>
              <div className="flex justify-between items-center text-[10px] sm:text-xs font-mono tracking-wider">
                <span>{formatTime(currentTime)} / {formatTime(duration)}</span>
                <div className="flex gap-4 items-center">
                  <button onClick={(e) => { e.stopPropagation(); setMuted(!muted); }}>
                    {muted ? <VolumeX size={18} className="text-primary" /> : <Volume2 size={18} />}
                  </button>
                  <button><Settings2 size={18} /></button>
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
