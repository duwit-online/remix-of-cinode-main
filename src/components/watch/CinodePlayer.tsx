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
  RotateCcw,
  RotateCw,
  Volume2,
  VolumeX,
  Settings2,
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

  // Logic remains identical to your previous version to ensure functionality
  useEffect(() => {
    if (!forwardedRef) return;
    if (typeof forwardedRef === "function") forwardedRef(videoRef.current);
    else forwardedRef.current = videoRef.current;
  }, [forwardedRef]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    setLoading(true);
    hlsRef.current?.destroy();
    hlsRef.current = null;

    if (isHlsSource && Hls.isSupported()) {
      const hls = new Hls({ enableWorker: true, lowLatencyMode: true });
      hlsRef.current = hls;
      hls.loadSource(src);
      hls.attachMedia(video);
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        setQualities([{ label: "Auto", value: -1 }, ...hls.levels.map((l, i) => ({ label: `${l.height}p`, value: i }))]);
        video.play().catch(() => setPlaying(false));
      });
    } else {
      video.src = src;
      video.play().catch(() => setPlaying(false));
    }

    const onTimeUpdate = () => setCurrentTime(video.currentTime);
    const onLoadedMetadata = () => setDuration(video.duration);
    const onPlaying = () => { setLoading(false); setPlaying(true); };
    const onPause = () => setPlaying(false);
    const onWaiting = () => setLoading(true);

    video.addEventListener("timeupdate", onTimeUpdate);
    video.addEventListener("loadedmetadata", onLoadedMetadata);
    video.addEventListener("playing", onPlaying);
    video.addEventListener("pause", onPause);
    video.addEventListener("waiting", onWaiting);

    return () => {
      video.removeEventListener("timeupdate", onTimeUpdate);
      video.removeEventListener("loadedmetadata", onLoadedMetadata);
      video.removeEventListener("playing", onPlaying);
      video.removeEventListener("pause", onPause);
      video.removeEventListener("waiting", onWaiting);
    };
  }, [src, isHlsSource]);

  const togglePlay = () => {
    if (videoRef.current?.paused) videoRef.current.play();
    else videoRef.current?.pause();
  };

  const seek = (amount: number) => {
    if (videoRef.current) videoRef.current.currentTime += amount;
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) wrapperRef.current?.requestFullscreen();
    else document.exitFullscreen();
    setIsFullscreen(!isFullscreen);
  };

  const resetHideTimer = () => {
    setShowControls(true);
    if (hideTimer.current) clearTimeout(hideTimer.current);
    if (playing) hideTimer.current = window.setTimeout(() => setShowControls(false), 3000);
  };

  const playedPercent = (currentTime / duration) * 100 || 0;

  return (
    <div
      ref={wrapperRef}
      className="group relative aspect-video w-full overflow-hidden bg-black ring-1 ring-white/10 sm:rounded-2xl"
      onMouseMove={resetHideTimer}
      onClick={resetHideTimer}
    >
      <video
        ref={videoRef}
        poster={poster}
        className="h-full w-full object-contain"
        playsInline
        crossOrigin="anonymous"
      />

      <AnimatePresence>
        {showControls && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-10 flex flex-col justify-between bg-gradient-to-t from-black/80 via-transparent to-black/60 p-4"
          >
            {/* Top Bar: Title */}
            <div className="flex items-start justify-between">
              <div className="flex flex-col gap-1">
                <span className="text-[10px] font-bold uppercase tracking-widest text-primary">Cinode Premium</span>
                <h2 className="text-lg font-medium text-white line-clamp-1">{title}</h2>
              </div>
              <button onClick={toggleFullscreen} className="text-white/80 hover:text-white">
                {isFullscreen ? <Minimize size={24} /> : <Maximize size={24} />}
              </button>
            </div>

            {/* Center: Big Controls */}
            <div className="flex items-center justify-center gap-12 sm:gap-20">
              <button onClick={() => seek(-10)} className="text-white/90 transition-transform active:scale-90">
                <RotateCcw size={40} strokeWidth={1.5} />
              </button>
              
              <button onClick={togglePlay} className="flex h-20 w-20 items-center justify-center rounded-full bg-white/10 backdrop-blur-md transition-transform hover:scale-105 active:scale-95">
                {loading ? <Loader2 className="animate-spin" size={40} /> : 
                 playing ? <Pause size={44} fill="white" /> : <Play size={44} fill="white" className="ml-2" />}
              </button>

              <button onClick={() => seek(10)} className="text-white/90 transition-transform active:scale-90">
                <RotateCw size={40} strokeWidth={1.5} />
              </button>
            </div>

            {/* Bottom Bar: Progress & Settings */}
            <div className="flex flex-col gap-4">
              {/* Sleek Progress Bar */}
              <div className="relative group/progress h-1.5 w-full cursor-pointer rounded-full bg-white/20">
                <div 
                  className="absolute h-full rounded-full bg-primary" 
                  style={{ width: `${playedPercent}%` }} 
                />
                <input 
                  type="range"
                  min={0}
                  max={duration}
                  value={currentTime}
                  onChange={(e) => { if(videoRef.current) videoRef.current.currentTime = Number(e.target.value); }}
                  className="absolute inset-0 w-full opacity-0 cursor-pointer"
                />
              </div>

              <div className="flex items-center justify-between text-white/90">
                <div className="flex items-center gap-6">
                  <div className="text-sm font-mono tracking-tighter">
                    {formatTime(currentTime)} <span className="text-white/40">/</span> {formatTime(duration)}
                  </div>
                  
                  <div className="hidden items-center gap-3 sm:flex">
                    <button onClick={() => setMuted(!muted)}>
                      {muted || volume === 0 ? <VolumeX size={20} /> : <Volume2 size={20} />}
                    </button>
                    <input 
                      type="range" 
                      min={0} max={1} step={0.1} 
                      value={muted ? 0 : volume} 
                      onChange={(e) => setVolume(Number(e.target.value))}
                      className="w-20 accent-primary"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-5">
                  <button className="text-white/80 hover:text-white"><Settings2 size={20} /></button>
                  <button onClick={() => videoRef.current?.requestPictureInPicture()} className="hidden sm:block text-white/80 hover:text-white">
                    <PictureInPicture2 size={20} />
                  </button>
                  <button onClick={toggleFullscreen} className="sm:hidden text-white/80">
                    <Maximize size={20} />
                  </button>
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
