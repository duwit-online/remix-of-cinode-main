import { useState, useMemo, useRef, useCallback, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Maximize2, Bookmark, BookmarkCheck, AlertTriangle, Download, CheckCircle2, PictureInPicture2 } from "lucide-react";
import { motion } from "framer-motion";
import { useMovieDetail, useTVDetail, useSeasonDetail, useSimilar } from "@/hooks/useTMDB";
import { embedProviders, getImageUrl, getTitle, getTVExternalIds } from "@/lib/tmdb";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useIsInWatchlist, useToggleWatchlist } from "@/hooks/useWatchlist";
import { useJellyfinStream } from "@/hooks/useJellyfinStream";
import { usePlaybackProgress } from "@/hooks/usePlaybackProgress";
import { useOfflineDownload } from "@/hooks/useOfflineDownload";
import { useTelegramBridge } from "@/hooks/useTelegramBridge";
import TMDBRow from "@/components/TMDBRow";
import AdBanner from "@/components/AdBanner";
import PreRollAd from "@/components/PreRollAd";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { toast } from "@/hooks/use-toast";

type PlayerSource = "offline" | "telegram_bridge" | "jellyfin" | "override" | "embed" | "none";

const Watch = () => {
  const { type, id } = useParams<{ type: string; id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const mediaType = type as "movie" | "tv";
  const tmdbId = Number(id);

  const [season, setSeason] = useState(1);
  const [episode, setEpisode] = useState(1);
  const [theaterMode, setTheaterMode] = useState(true);
  const [adDone, setAdDone] = useState(false);
  const [videoError, setVideoError] = useState(false);
  const [bridgeError, setBridgeError] = useState(false);
  const [embedIndex, setEmbedIndex] = useState(0);
  const videoRef = useRef<HTMLVideoElement>(null);
  const hasResumed = useRef(false);

  const { data: movieDetail, isLoading: movieLoading } = useMovieDetail(tmdbId);
  const { data: tvDetail, isLoading: tvLoading } = useTVDetail(tmdbId);
  const detail = mediaType === "movie" ? movieDetail : tvDetail;
  const isLoading = mediaType === "movie" ? movieLoading : tvLoading;

  const { data: seasonData } = useSeasonDetail(mediaType === "tv" ? tmdbId : 0, season);
  const { data: similar } = useSimilar(mediaType, tmdbId);

  const isInWatchlist = useIsInWatchlist(tmdbId, mediaType);
  const toggleWatchlist = useToggleWatchlist();

  // Telegram Bridge - FIRST fallback
  const { data: bridgeData, isLoading: bridgeLoading } = useTelegramBridge(
    tmdbId, mediaType,
    mediaType === "tv" ? season : undefined,
    mediaType === "tv" ? episode : undefined
  );

  const { data: jellyfinData, isLoading: jellyfinLoading } = useJellyfinStream(
    tmdbId, mediaType,
    mediaType === "tv" ? season : undefined,
    mediaType === "tv" ? episode : undefined
  );

  const { data: override } = useQuery({
    queryKey: ["movieOverride", tmdbId, mediaType, season, episode],
    queryFn: async () => {
      const { data } = await supabase
        .from("movie_overrides")
        .select("*")
        .eq("tmdb_id", tmdbId)
        .eq("media_type", mediaType)
        .maybeSingle();
      return data;
    },
  });

  const { data: tvExternalIds } = useQuery({
    queryKey: ["tvExternalIds", tmdbId],
    queryFn: () => getTVExternalIds(tmdbId),
    enabled: mediaType === "tv",
  });

  const imdbId = mediaType === "movie"
    ? (movieDetail as any)?.imdb_id
    : tvExternalIds?.imdb_id;

  // Playback progress tracking
  const { savedTime, updateProgress, clearProgress } = usePlaybackProgress(
    mediaType, tmdbId,
    mediaType === "tv" ? season : undefined,
    mediaType === "tv" ? episode : undefined
  );

  // Determine raw stream URL for download
  const rawStreamUrl = useMemo(() => {
    if (bridgeData?.stream_url) return bridgeData.stream_url;
    if (jellyfinData?.stream_url && !videoError) return jellyfinData.stream_url;
    if ((override as any)?.custom_url) return (override as any).custom_url;
    return "";
  }, [bridgeData, jellyfinData, videoError, override]);

  const isDirectVideo = /\.(mp4|mkv|webm|m3u8)(\?|$)/i.test(rawStreamUrl);

  // Offline download
  const { isDownloaded, isDownloading, progress: dlProgress, offlineUrl, download, removeDownload } = useOfflineDownload(
    rawStreamUrl,
    mediaType, tmdbId,
    detail ? getTitle(detail as any) : "",
    detail?.poster_path || "",
    mediaType === "tv" ? season : undefined,
    mediaType === "tv" ? episode : undefined
  );

  // Source fallback chain: Offline > Telegram Bridge > Jellyfin > DB Override > Embeds
  const { activeSource, streamUrl } = useMemo((): { activeSource: PlayerSource; streamUrl: string } => {
    // 0. Offline cached video
    if (offlineUrl) return { activeSource: "offline", streamUrl: offlineUrl };
    // 1. Telegram Bridge (FIRST live source)
    if (bridgeData?.stream_url && !bridgeError) return { activeSource: "telegram_bridge", streamUrl: bridgeData.stream_url };
    // 2. Jellyfin
    if (jellyfinData?.stream_url && !videoError) return { activeSource: "jellyfin", streamUrl: jellyfinData.stream_url };
    // 3. DB override
    if ((override as any)?.custom_url) return { activeSource: "override", streamUrl: (override as any).custom_url };
    // 4. Embed providers
    if (embedIndex < embedProviders.length) {
      const provider = embedProviders[embedIndex];
      const url = provider.getUrl(mediaType, imdbId || "", tmdbId, mediaType === "tv" ? season : undefined, mediaType === "tv" ? episode : undefined);
      return { activeSource: "embed", streamUrl: url };
    }
    return { activeSource: "none", streamUrl: "" };
  }, [offlineUrl, bridgeData, bridgeError, jellyfinData, videoError, override, imdbId, mediaType, season, episode, tmdbId, embedIndex]);

  const tryNextEmbed = useCallback(() => {
    if (embedIndex < embedProviders.length - 1) setEmbedIndex(prev => prev + 1);
  }, [embedIndex]);

  // Resume + volume setup when video element is ready
  useEffect(() => {
    const vid = videoRef.current;
    if (!vid) return;
    vid.volume = 1;

    const onCanPlay = () => {
      if (savedTime > 0 && !hasResumed.current) {
        vid.currentTime = savedTime;
        hasResumed.current = true;
        toast({ title: "Resuming playback", description: `Continuing from ${formatTime(savedTime)}` });
      }
    };

    const onTimeUpdate = () => {
      if (!isNaN(vid.currentTime) && !isNaN(vid.duration) && vid.duration > 0) {
        updateProgress(vid.currentTime, vid.duration);
      }
    };

    const onEnded = () => clearProgress();

    vid.addEventListener("canplay", onCanPlay);
    vid.addEventListener("timeupdate", onTimeUpdate);
    vid.addEventListener("ended", onEnded);
    return () => {
      vid.removeEventListener("canplay", onCanPlay);
      vid.removeEventListener("timeupdate", onTimeUpdate);
      vid.removeEventListener("ended", onEnded);
    };
  }, [savedTime, updateProgress, clearProgress, activeSource, streamUrl]);

  // Reset resume flag on source change
  useEffect(() => { hasResumed.current = false; }, [season, episode, tmdbId]);

  const handleToggleWatchlist = () => {
    if (!user) {
      toast({ title: "Sign in required", description: "Sign in to save to your watchlist." });
      return;
    }
    toggleWatchlist.mutate({
      tmdbId, mediaType,
      title: detail ? getTitle(detail as any) : "",
      posterPath: detail?.poster_path || "",
      isInList: isInWatchlist,
    });
  };

  const handleVideoError = () => {
    // If telegram bridge stream failed, mark it and fall through
    if (activeSource === "telegram_bridge") {
      setBridgeError(true);
      return;
    }
    setVideoError(true);
    setEmbedIndex(0);
  };

  const togglePiP = async () => {
    const vid = videoRef.current;
    if (!vid) return;
    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
      } else {
        await vid.requestPictureInPicture();
      }
    } catch (e) {
      toast({ title: "PiP unavailable", description: "Picture-in-Picture is not supported in this browser." });
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background pt-16 px-4">
        <Skeleton className="w-full aspect-video max-w-5xl mx-auto rounded-2xl" />
      </div>
    );
  }

  const isNativeVideo = activeSource === "offline" || activeSource === "jellyfin" || activeSource === "telegram_bridge" || (activeSource === "override" && isDirectVideo);
  const isSourceLoading = bridgeLoading || jellyfinLoading;

  const renderPlayer = () => {
    if (!adDone) return <PreRollAd onComplete={() => setAdDone(true)} />;
    if (isSourceLoading && activeSource === "none") return <div className="w-full h-full flex items-center justify-center text-muted-foreground">Loading sources...</div>;

    if (isNativeVideo) {
      return (
        <video
          ref={videoRef}
          src={streamUrl}
          className="w-full h-full bg-black"
          controls
          autoPlay
          onError={handleVideoError}
          crossOrigin="anonymous"
        />
      );
    }

    if ((activeSource === "override" || activeSource === "embed") && streamUrl) {
      return (
        <iframe
          key={streamUrl}
          src={streamUrl}
          className="w-full h-full"
          allowFullScreen
          sandbox="allow-forms allow-pointer-lock allow-same-origin allow-scripts allow-top-navigation"
          onError={tryNextEmbed}
        />
      );
    }

    return (
      <div className="w-full h-full flex flex-col items-center justify-center text-muted-foreground gap-2">
        <AlertTriangle size={32} className="text-yellow-500" />
        <p className="text-sm">No playback source available</p>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      {/* Sticky top bar + player container */}
      <div className="sticky top-0 z-40">
        {/* Top bar */}
        <div className="glass px-4 py-3 flex items-center gap-2 z-50">
          <button onClick={() => navigate(-1)} className="p-2 rounded-full hover:bg-secondary/50 transition-colors">
            <ArrowLeft size={20} />
          </button>
          <h1 className="font-display font-bold text-sm truncate flex-1">
            {detail ? getTitle(detail as any) : "Loading..."}
          </h1>

          {/* Download button */}
          {rawStreamUrl && (
            isDownloading ? (
              <div className="flex items-center gap-1.5 px-2">
                <Progress value={dlProgress} className="w-16 h-1.5" />
                <span className="text-[10px] text-muted-foreground">{dlProgress}%</span>
              </div>
            ) : isDownloaded ? (
              <button onClick={removeDownload} className="p-2 rounded-full hover:bg-secondary/50 transition-colors" title="Downloaded (tap to remove)">
                <CheckCircle2 size={18} className="text-primary" />
              </button>
            ) : (
              <button onClick={download} className="p-2 rounded-full hover:bg-secondary/50 transition-colors" title="Download for offline">
                <Download size={18} className="text-muted-foreground" />
              </button>
            )
          )}

          {activeSource === "offline" && (
            <span className="text-[10px] text-primary font-medium px-2">Offline</span>
          )}

          {/* PiP button */}
          {isNativeVideo && (
            <button onClick={togglePiP} className="p-2 rounded-full hover:bg-secondary/50 transition-colors" title="Picture-in-Picture">
              <PictureInPicture2 size={18} className="text-muted-foreground" />
            </button>
          )}

          <button onClick={handleToggleWatchlist} className="p-2 rounded-full hover:bg-secondary/50 transition-colors">
            {isInWatchlist ? <BookmarkCheck size={18} className="text-primary" /> : <Bookmark size={18} className="text-muted-foreground" />}
          </button>
          <button
            onClick={() => setTheaterMode(!theaterMode)}
            className={`p-2 rounded-full transition-colors ${theaterMode ? "text-primary bg-primary/10" : "hover:bg-secondary/50 text-muted-foreground"}`}
          >
            <Maximize2 size={18} />
          </button>
        </div>

        {/* Sticky player */}
        <div className={`relative bg-black ${theaterMode ? "w-full aspect-video" : "max-w-5xl mx-auto aspect-video"}`}>
          {renderPlayer()}
        </div>
      </div>

      {/* Details - scrollable below sticky player */}
      <div className="max-w-5xl mx-auto px-4 mt-4 space-y-4">
        <AdBanner placement="watch_page" className="mb-4" />

        {mediaType === "tv" && detail && (
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex items-center gap-2">
              <label className="text-xs text-muted-foreground">Season</label>
              <select value={season} onChange={(e) => { setSeason(Number(e.target.value)); setEpisode(1); setVideoError(false); setBridgeError(false); setEmbedIndex(0); }} className="bg-secondary/60 border border-border/30 rounded-xl px-3 py-2 text-sm outline-none focus:border-primary/50">
                {(detail.seasons || []).filter((s) => s.season_number > 0).map((s) => (
                  <option key={s.season_number} value={s.season_number}>{s.name}</option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-2">
              <label className="text-xs text-muted-foreground">Episode</label>
              <select value={episode} onChange={(e) => { setEpisode(Number(e.target.value)); setVideoError(false); setBridgeError(false); setEmbedIndex(0); }} className="bg-secondary/60 border border-border/30 rounded-xl px-3 py-2 text-sm outline-none focus:border-primary/50">
                {seasonData?.episodes?.map((ep) => (
                  <option key={ep.episode_number} value={ep.episode_number}>Ep {ep.episode_number}: {ep.name}</option>
                )) || (
                  Array.from({ length: detail.seasons?.find(s => s.season_number === season)?.episode_count || 10 }, (_, i) => (
                    <option key={i + 1} value={i + 1}>Episode {i + 1}</option>
                  ))
                )}
              </select>
            </div>
          </div>
        )}

        {detail && (
          <div className="glass rounded-2xl p-5 border border-border/30">
            <div className="flex gap-4">
              <img src={getImageUrl(detail.poster_path, "w200")} alt={getTitle(detail as any)} className="w-24 h-36 rounded-xl object-cover hidden sm:block" />
              <div className="flex-1 min-w-0">
                <h2 className="font-display font-bold text-xl mb-1">{getTitle(detail as any)}</h2>
                {detail.tagline && <p className="text-primary text-xs italic mb-2">{detail.tagline}</p>}
                <div className="flex flex-wrap gap-2 mb-3">
                  {detail.genres?.map((g) => (
                    <span key={g.id} className="px-2 py-0.5 rounded-md bg-secondary/60 text-xs border border-border/30">{g.name}</span>
                  ))}
                </div>
                <p className="text-muted-foreground text-sm leading-relaxed line-clamp-3">{detail.overview}</p>
              </div>
            </div>
          </div>
        )}

        {mediaType === "tv" && seasonData?.episodes && (
          <div>
            <h3 className="font-display font-bold text-base mb-3">Episodes</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {seasonData.episodes.map((ep) => (
                <button key={ep.episode_number} onClick={() => { setEpisode(ep.episode_number); setVideoError(false); setBridgeError(false); setEmbedIndex(0); }}
                  className={`text-left p-3 rounded-xl transition-all ${episode === ep.episode_number ? "bg-primary/10 border border-primary/30" : "bg-secondary/30 border border-border/20 hover:bg-secondary/50"}`}
                >
                  <div className="flex gap-3">
                    {ep.still_path && <img src={getImageUrl(ep.still_path, "w200")} alt={ep.name} className="w-24 h-14 rounded-lg object-cover flex-shrink-0" loading="lazy" />}
                    <div className="min-w-0">
                      <p className="text-xs font-semibold truncate">E{ep.episode_number}: {ep.name}</p>
                      <p className="text-[10px] text-muted-foreground line-clamp-2 mt-0.5">{ep.overview}</p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {similar?.results && similar.results.length > 0 && (
        <div className="mt-6">
          <TMDBRow title="You Might Also Like" items={similar.results} variant="default" />
        </div>
      )}
    </div>
  );
};

function formatTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export default Watch;
