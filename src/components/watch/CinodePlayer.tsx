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
  ChevronRight,
  Check,
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

  const [playing, setPlaying] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showControls, setShowControls] = useState(true);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [volume, setVolume] = useState(1);
  const [muted, setMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [qualities, setQualities] = useState<Option[]>([]);
  const [selectedQuality, setSelectedQuality] = useState(-1);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [showSettings, setShowSettings] = useState(false);
  const [showVolumeSlider, setShowVolumeSlider] = useState(false);

  const isHlsSource = useMemo(() => src.includes("m3u8"), [src]);

  // 1. AUTO-PiP ON SCROLL LOGIC
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !("pictureInPictureEnabled" in document)) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        // If the video is playing and leaves the screen, try to enter PiP
        if (!entry.isIntersecting && !video.paused && !document.pictureInPictureElement) {
          video.requestPictureInPicture().catch(() => {}); // Catch browser blocks
        } else if (entry.isIntersecting && document.pictureInPictureElement) {
          document.exitPictureInPicture().catch(() => {});
        }
      },
      { threshold: 0.1 }
    );

    observer.observe(video);
    return () => observer.disconnect();
  }, []);

  // 2. VIDEO ENGINE SETUP
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    setLoading(true);
    hlsRef.current?.destroy();

    if (isHlsSource && Hls.isSupported()) {
      const hls = new Hls();
      hlsRef.current = hls;
      hls.loadSource(src);
      hls.attachMedia(video);
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        setQualities([{ label: "Auto", value: -1 }, ...hls.levels.map((l, i) => ({ label: `${l.height}p`, value: i }))]);
        video.play().catch(() => setPlaying(false));
      });
    } else {
      video.src = src;
    }

    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    const onTimeUpdate = () => setCurrentTime(video.currentTime);
    const onMetadata = () => setDuration(video.duration);
    const onWaiting = () => setLoading(true);
    const onCanPlay = () => setLoading(false);

    video.addEventListener("play", onPlay);
    video.addEventListener("pause", onPause);
    video.addEventListener("timeupdate", onTimeUpdate);
    video.addEventListener("loadedmetadata", onMetadata);
    video.addEventListener("waiting", onWaiting);
    video.addEventListener("canplay", onCanPlay);

    return () => {
      video.removeEventListener("play", onPlay);
      video.removeEventListener("pause", onPause);
      video.removeEventListener("timeupdate", onTimeUpdate);
      video.removeEventListener("loadedmetadata", onMetadata);
      video.removeEventListener("waiting", onWaiting);
      video.removeEventListener("canplay", onCanPlay);
    };
  }, [src, isHlsSource]);

  const togglePlay = () => (videoRef.current?.paused ? videoRef.current.play() : videoRef.current?.pause());
  const seek = (amount: number) => { if (videoRef.current) videoRef.current.currentTime += amount; };
  
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) wrapperRef.current?.requestFullscreen();
    else document.exitFullscreen();
    setIsFullscreen(!isFullscreen);
  };

  const handleMuteToggle = () => {
    if (!videoRef.current) return;
    const newState = !muted;
    videoRef.current.muted = newState;
    setMuted(newState);
    if (!newState && volume === 0) {
        videoRef.current.volume = 0.5;
        setVolume(0.5);
    }
  };

  const changeQuality = (val: number) => {
    if (hlsRef.current) {
        hlsRef.current.currentLevel = val;
        setSelectedQuality(val);
    }
    setShowSettings(false);
  };

  const resetHideTimer = () => {
    setShowControls(true);
    if (hideTimer.current) clearTimeout(hideTimer.current);
    if (playing && !showSettings) {
      hideTimer.current = window.setTimeout(() => setShowControls(false), 3000);
    }
  };

  return (
    <div
      ref={wrapperRef}
      className="group relative aspect-video w-full overflow-hidden bg-black ring-1 ring-white/10 sm:rounded-2xl"
      onMouseMove={resetHideTimer}
    >
      <video ref={videoRef} poster={poster} className="h-full w-full object-contain" playsInline crossOrigin="anonymous" />

      <AnimatePresence>
        {showControls && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="absolute inset-0 z-10 flex flex-col justify-between bg-gradient-to-t from-black/90 via-transparent to-black/60 p-4 md:p-6"
          >
            {/* TOP BAR: Branding & Timer (Now on Right) */}
            <div className="flex items-start justify-between">
              <div className="flex flex-col">
                <span className="text-[10px] font-black tracking-widest text-red-600 uppercase">Cinode Premium</span>
                <h2 className="text-lg font-bold text-white line-clamp-1">{title}</h2>
              </div>
              
              {/* TIMER: Moved to Upper Right */}
              <div className="text-sm font-mono font-medium text-white/90 bg-black/40 backdrop-blur-md px-4 py-2 rounded-full border border-white/10">
                {formatTime(currentTime)} <span className="text-white/30 mx-1">/</span> {formatTime(duration)}
              </div>
            </div>

            {/* CENTER CONTROLS */}
            <div className="flex items-center justify-center gap-16 md:gap-32">
              <button onClick={() => seek(-10)} className="text-white/80 transition-all hover:scale-110 hover:text-white">
                <RotateCcw size={44} strokeWidth={1.5} />
              </button>
              
              <button onClick={togglePlay} className="flex h-20 w-20 md:h-28 md:w-28 items-center justify-center rounded-full bg-white/10 backdrop-blur-xl border border-white/20 text-white transition-all hover:bg-white/20 active:scale-90">
                {loading ? <Loader2 className="animate-spin" size={48} /> : 
                 playing ? <Pause size={52} fill="currentColor" /> : <Play size={52} fill="currentColor" className="ml-2" />}
              </button>

              <button onClick={() => seek(10)} className="text-white/80 transition-all hover:scale-110 hover:text-white">
                <RotateCw size={44} strokeWidth={1.5} />
              </button>
            </div>

            {/* BOTTOM BAR: Controls & Seek */}
            <div className="flex flex-col gap-4">
              {/* PROGRESS BAR */}
              <div className="relative h-1.5 w-full cursor-pointer rounded-full bg-white/20 overflow-hidden">
                <div className="absolute h-full bg-red-600 transition-all duration-100" style={{ width: `${(currentTime/duration)*100}%` }} />
                <input 
                  type="range" min={0} max={duration || 0} value={currentTime}
                  onChange={(e) => { if(videoRef.current) videoRef.current.currentTime = Number(e.target.value); }}
                  className="absolute inset-0 w-full opacity-0 cursor-pointer"
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-6">
                  {/* VOLUME LOGIC */}
                  <div className="flex items-center gap-2" onMouseEnter={() => setShowVolumeSlider(true)} onMouseLeave={() => setShowVolumeSlider(false)}>
                    <button onClick={handleMuteToggle} className="text-white/80 hover:text-white transition-colors">
                      {muted || volume === 0 ? <VolumeX size={24} /> : <Volume2 size={24} />}
                    </button>
                    <AnimatePresence>
                      {showVolumeSlider && (
                        <motion.input 
                          initial={{ width: 0, opacity: 0 }} animate={{ width: 80, opacity: 1 }} exit={{ width: 0, opacity: 0 }}
                          type="range" min="0" max="1" step="0.1" value={muted ? 0 : volume}
                          onChange={(e) => {
                            const val = Number(e.target.value);
                            setVolume(val);
                            if (videoRef.current) {
                                videoRef.current.volume = val;
                                videoRef.current.muted = val === 0;
                            }
                          }}
                          className="accent-red-600"
                        />
                      )}
                    </AnimatePresence>
                  </div>
                </div>

                {/* RIGHT SIDE ACTIONS */}
                <div className="flex items-center gap-5">
                  {/* SETTINGS DROPDOWN */}
                  <div className="relative">
                    <button onClick={() => setShowSettings(!showSettings)} className="text-white/80 hover:text-white transition-transform hover:rotate-45">
                      <Settings2 size={24} />
                    </button>
                    
                    <AnimatePresence>
                      {showSettings && (
                        <motion.div 
                          initial={{ opacity: 0, y: 10, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 10, scale: 0.95 }}
                          className="absolute bottom-full right-0 mb-4 w-64 rounded-xl bg-black/95 backdrop-blur-2xl border border-white/10 p-4 shadow-2xl"
                        >
                          <div className="space-y-4">
                            <div>
                              <p className="text-[10px] uppercase font-bold text-white/40 mb-2">Video Quality</p>
                              <div className="grid grid-cols-2 gap-1">
                                {qualities.map((q) => (
                                  <button 
                                    key={q.value} onClick={() => changeQuality(q.value)}
                                    className={`text-left px-3 py-1.5 rounded-lg text-xs transition-colors ${selectedQuality === q.value ? 'bg-red-600 text-white' : 'text-white/60 hover:bg-white/10'}`}
                                  >
                                    {q.label}
                                  </button>
                                ))}
                              </div>
                            </div>
                            <div className="border-t border-white/5 pt-3">
                              <p className="text-[10px] uppercase font-bold text-white/40 mb-2">Playback Speed</p>
                              <div className="flex flex-wrap gap-1">
                                {[0.5, 1, 1.5, 2].map((s) => (
                                  <button 
                                    key={s} onClick={() => { if(videoRef.current) videoRef.current.playbackRate = s; setPlaybackRate(s); setShowSettings(false); }}
                                    className={`px-3 py-1 rounded-lg text-xs ${playbackRate === s ? 'bg-red-600 text-white' : 'text-white/60 hover:bg-white/10'}`}
                                  >
                                    {s}x
                                  </button>
                                ))}
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  <button onClick={() => videoRef.current?.requestPictureInPicture()} className="text-white/80 hover:text-white transition-colors">
                    <PictureInPicture2 size={24} />
                  </button>

                  {/* FULLSCREEN: Now at bottom right */}
                  <button onClick={toggleFullscreen} className="text-white/80 hover:text-white transition-transform hover:scale-110">
                    {isFullscreen ? <Minimize size={24} /> : <Maximize size={24} />}
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
