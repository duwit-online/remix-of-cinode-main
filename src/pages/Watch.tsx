import { useState, useMemo, useRef, useCallback, useEffect } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { AlertTriangle, ArrowLeft, Bookmark, BookmarkCheck, CheckCircle2, Download, LayoutPanelTop, Loader2 } from "lucide-react";
import { useMovieDetail, useTVDetail, useSeasonDetail, useSimilar, useCredits } from "@/hooks/useTMDB";
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
import { toast } from "@/hooks/use-toast";
import CinodePlayer from "@/components/watch/CinodePlayer";
import WatchDetailsPanel from "@/components/watch/WatchDetailsPanel";
import { getOfflineMediaKey, getOfflineMediaRecord } from "@/lib/offlineMedia";

type PlayerSource = "offline" | "telegram_bridge" | "jellyfin" | "override" | "embed" | "none";

const Watch = () => {
  const { type, id } = useParams<{ type: string; id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const mediaType = type as "movie" | "tv";
  const tmdbId = Number(id);
  const searchParams = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const initialSeason = Number(searchParams.get("season") || 1);
  const initialEpisode = Number(searchParams.get("episode") || 1);

  const [season, setSeason] = useState(initialSeason);
  const [episode, setEpisode] = useState(initialEpisode);
  const [theaterMode, setTheaterMode] = useState(false);
  const [adDone, setAdDone] = useState(false);
  const [videoError, setVideoError] = useState(false);
  const [bridgeError, setBridgeError] = useState(false);
  const [embedIndex, setEmbedIndex] = useState(0);
  const [offlineMeta, setOfflineMeta] = useState<any | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const hasResumed = useRef(false);

  useEffect(() => {
    if (mediaType !== "tv") return;
    setSeason(initialSeason || 1);
    setEpisode(initialEpisode || 1);
  }, [mediaType, tmdbId, initialSeason, initialEpisode]);

  useEffect(() => {
    const key = getOfflineMediaKey(mediaType, tmdbId, mediaType === "tv" ? season : undefined, mediaType === "tv" ? episode : undefined);
    getOfflineMediaRecord(key).then(setOfflineMeta).catch(() => setOfflineMeta(null));
  }, [mediaType, tmdbId, season, episode]);

  useEffect(() => {
    if (mediaType !== "tv") return;
    const next = `?season=${season}&episode=${episode}`;
    if (location.search !== next) navigate({ pathname: location.pathname, search: next }, { replace: true });
  }, [mediaType, season, episode, location.pathname, location.search, navigate]);

  const { data: movieDetail, isLoading: movieLoading } = useMovieDetail(tmdbId);
  const { data: tvDetail, isLoading: tvLoading } = useTVDetail(tmdbId);
  const detail = mediaType === "movie" ? movieDetail : tvDetail;
  const isLoading = mediaType === "movie" ? movieLoading : tvLoading;

  const { data: seasonData } = useSeasonDetail(mediaType === "tv" ? tmdbId : 0, season);
  const { data: similar } = useSimilar(mediaType, tmdbId);
  const { data: credits } = useCredits(mediaType, tmdbId);

  const isInWatchlist = useIsInWatchlist(tmdbId, mediaType);
  const toggleWatchlist = useToggleWatchlist();

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
        .order("created_at", { ascending: false });

      if (!data?.length) return null;
      if (mediaType === "tv") {
        return data.find((item) => item.season === season && item.episode === episode)
          || data.find((item) => item.season == null && item.episode == null)
          || null;
      }
      return data[0];
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

  const { savedTime, updateProgress, clearProgress } = usePlaybackProgress(
    mediaType, tmdbId,
    mediaType === "tv" ? season : undefined,
    mediaType === "tv" ? episode : undefined
  );

  // Check if URL is a direct video
  const isDirectVideoUrl = (url: string) => {
    if (!url) return false;
    if (/\.(mp4|mkv|webm|m3u8|avi|mov|flv|wmv|ts)(\?|$)/i.test(url)) return true;
    if (/\/(stream|play|video|download)\b/i.test(url)) return true;
    if (url.includes("functions/v1/jellyfin-proxy")) return true;
    return false;
  };

  const isDownloadableUrl = (url: string) => isDirectVideoUrl(url) && !url.includes("format=hls") && !url.endsWith(".m3u8");

  const rawStreamUrl = useMemo(() => {
    if (bridgeData?.stream_url) return bridgeData.stream_url;
    if (jellyfinData?.stream_url && !videoError) return jellyfinData.stream_url;
    if ((override as any)?.custom_url) return (override as any).custom_url;
    return "";
  }, [bridgeData, jellyfinData, videoError, override]);

  const isDirectVideo = useMemo(() => isDirectVideoUrl(rawStreamUrl), [rawStreamUrl]);
  const canDownload = useMemo(() => isDownloadableUrl(rawStreamUrl), [rawStreamUrl]);

  const { isDownloaded, isDownloading, progress: dlProgress, offlineUrl, download, removeDownload } = useOfflineDownload(
    canDownload ? rawStreamUrl : "",
    mediaType, tmdbId,
    detail ? getTitle(detail as any) : offlineMeta?.title || "",
    detail?.poster_path || offlineMeta?.posterPath || "",
    mediaType === "tv" ? season : undefined,
    mediaType === "tv" ? episode : undefined
  );

  // Load admin-configured playback source ordering
  const { data: playbackSourceConfig } = useQuery({
    queryKey: ["playback-sources-config"],
    queryFn: async () => {
      const { data } = await supabase.from("app_settings").select("*").eq("key", "playback_sources").maybeSingle();
      return (data?.value as any)?.sources as Array<{ id: string; name: string; url_template: string; source_type: string; is_enabled: boolean; priority: number }> | undefined;
    },
    staleTime: 60_000,
  });

  const { activeSource, streamUrl } = useMemo((): { activeSource: PlayerSource; streamUrl: string } => {
    if (offlineUrl) return { activeSource: "offline", streamUrl: offlineUrl };

    const orderedSources = playbackSourceConfig
      ? [...playbackSourceConfig].sort((a, b) => b.priority - a.priority).filter(s => s.is_enabled)
      : null;

    const trySource = (sourceId: string): { activeSource: PlayerSource; streamUrl: string } | null => {
      if (sourceId === "telegram" || sourceId.includes("telegram")) {
        if (bridgeData?.stream_url && !bridgeError) return { activeSource: "telegram_bridge", streamUrl: bridgeData.stream_url };
      } else if (sourceId === "jellyfin" || sourceId.includes("jellyfin")) {
        if (jellyfinData?.stream_url && !videoError) return { activeSource: "jellyfin", streamUrl: jellyfinData.stream_url };
      } else if (sourceId === "override" || sourceId.includes("override")) {
        if ((override as any)?.custom_url) return { activeSource: "override", streamUrl: (override as any).custom_url };
      } else {
        const src = orderedSources?.find(s => s.id === sourceId);
        if (src && src.source_type === "embed" && src.url_template) {
          let url = src.url_template
            .replace("{type}", mediaType)
            .replace("{tmdb_id}", String(tmdbId))
            .replace("{imdb_id}", imdbId || "")
            .replace("{id}", imdbId || String(tmdbId));
          if (mediaType === "tv") url += `/${season}/${episode}`;
          return { activeSource: "embed", streamUrl: url };
        }
      }
      return null;
    };

    if (orderedSources) {
      let embedsTriedCount = 0;
      for (const src of orderedSources) {
        if (src.source_type === "embed") {
          if (embedsTriedCount < embedIndex) { embedsTriedCount++; continue; }
        }
        const result = trySource(src.id);
        if (result) return result;
        if (src.source_type === "embed") embedsTriedCount++;
      }
    } else {
      if (bridgeData?.stream_url && !bridgeError) return { activeSource: "telegram_bridge", streamUrl: bridgeData.stream_url };
      if (jellyfinData?.stream_url && !videoError) return { activeSource: "jellyfin", streamUrl: jellyfinData.stream_url };
      if ((override as any)?.custom_url) return { activeSource: "override", streamUrl: (override as any).custom_url };
      if (embedIndex < embedProviders.length) {
        const provider = embedProviders[embedIndex];
        const url = provider.getUrl(mediaType, imdbId || "", tmdbId, mediaType === "tv" ? season : undefined, mediaType === "tv" ? episode : undefined);
        return { activeSource: "embed", streamUrl: url };
      }
    }

    return { activeSource: "none", streamUrl: "" };
  }, [offlineUrl, bridgeData, bridgeError, jellyfinData, videoError, override, imdbId, mediaType, season, episode, tmdbId, embedIndex, playbackSourceConfig]);

  const tryNextEmbed = useCallback(() => {
    if (embedIndex < embedProviders.length - 1) setEmbedIndex(prev => prev + 1);
  }, [embedIndex]);

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

  useEffect(() => { hasResumed.current = false; }, [season, episode, tmdbId]);

  const setSeasonAndReset = (value: number) => {
    setSeason(value);
    setEpisode(1);
    setVideoError(false);
    setBridgeError(false);
    setEmbedIndex(0);
    hasResumed.current = false;
  };

  const setEpisodeAndReset = (value: number) => {
    setEpisode(value);
    setVideoError(false);
    setBridgeError(false);
    setEmbedIndex(0);
    hasResumed.current = false;
  };

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
    if (activeSource === "telegram_bridge") { setBridgeError(true); return; }
    if (activeSource === "jellyfin" || activeSource === "override") { setVideoError(true); setEmbedIndex(0); return; }
    setVideoError(true);
    setEmbedIndex(0);
  };

  if (isLoading && !offlineMeta) {
    return (
      <div className="min-h-screen bg-background pt-16 px-4">
        <Skeleton className="w-full aspect-video max-w-6xl mx-auto rounded-[2rem]" />
      </div>
    );
  }

  const isNativeVideo = activeSource === "offline" || activeSource === "jellyfin" || activeSource === "telegram_bridge" || (activeSource === "override" && isDirectVideo);
  const isSourceLoading = bridgeLoading || jellyfinLoading;
  const displayTitle = detail ? getTitle(detail as any) : offlineMeta?.title || "Offline Video";
  const playerPoster = getImageUrl(detail?.backdrop_path || detail?.poster_path || offlineMeta?.posterPath || null, "w1280");

  const cast = credits?.cast?.slice(0, 10) || [];
  const director = credits?.crew?.find((c: any) => c.job === "Director");
  const producers = credits?.crew?.filter((c: any) => c.job === "Producer")?.slice(0, 3) || [];

  const renderPlayer = () => {
    if (!adDone) return <PreRollAd onComplete={() => setAdDone(true)} />;
    if (isSourceLoading && activeSource === "none") return <div className="w-full h-full flex items-center justify-center text-muted-foreground">Loading sources...</div>;

    if (isNativeVideo) {
      return (
        <CinodePlayer
          ref={videoRef}
          src={streamUrl}
          poster={playerPoster}
          title={displayTitle}
          onError={handleVideoError}
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
      <div className="sticky top-0 z-40 border-b border-border/20 bg-background/85 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center gap-2 px-3 py-3 sm:px-4">
          <button onClick={() => navigate(-1)} className="rounded-full p-2 transition-colors hover:bg-secondary/50">
            <ArrowLeft size={20} />
          </button>
          <h1 className="flex-1 truncate font-display text-sm font-bold sm:text-base">
            {displayTitle}
          </h1>

          <button
            onClick={isDownloaded ? removeDownload : download}
            disabled={(!canDownload && !isDownloaded) || isDownloading}
            className="flex items-center gap-2 rounded-full bg-secondary/60 px-3 py-2 text-xs text-foreground transition-colors disabled:opacity-40"
            title={canDownload || isDownloaded ? "Download for offline" : "Downloads work on direct streams only"}
          >
            isDownloading ? (
              <>
                <Loader2 size={14} className="animate-spin text-primary" />
                {dlProgress}%
              </>
            ) : isDownloaded ? (
              <>
                <CheckCircle2 size={14} className="text-primary" />
                Downloaded
              </>
            ) : (
              <>
                <Download size={14} className="text-primary" />
                Download
              </>
            )
          </button>

          {activeSource === "offline" && (
            <span className="rounded-full bg-primary/10 px-2 py-1 text-[10px] font-medium text-primary">Offline Ready</span>
          )}

          <button onClick={handleToggleWatchlist} className="rounded-full p-2 transition-colors hover:bg-secondary/50">
            {isInWatchlist ? <BookmarkCheck size={18} className="text-primary" /> : <Bookmark size={18} className="text-muted-foreground" />}
          </button>
          <button
            onClick={() => setTheaterMode(!theaterMode)}
            className={`rounded-full p-2 transition-colors ${theaterMode ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-secondary/50"}`}
          >
            <LayoutPanelTop size={18} />
          </button>
        </div>

        <div className="px-3 pb-4 sm:px-4">
          <div className={`mx-auto overflow-hidden rounded-[2rem] border border-border/30 bg-card shadow-2xl ${theaterMode ? "max-w-7xl" : "max-w-5xl"}`}>
            <div className="relative aspect-video bg-black lg:max-h-[72vh]">
          {renderPlayer()}
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto mt-2 max-w-7xl space-y-6 px-3 sm:px-4">
        <AdBanner placement="watch_page" className="mb-4" />

        {detail ? (
          <WatchDetailsPanel
            detail={detail as any}
            mediaType={mediaType}
            cast={cast}
            director={director}
            producers={producers}
            season={season}
            episode={episode}
            seasonData={seasonData}
            onSeasonChange={setSeasonAndReset}
            onEpisodeChange={setEpisodeAndReset}
          />
        ) : offlineMeta ? (
          <div className="glass rounded-[1.75rem] p-6">
            <h1 className="text-2xl font-black">{offlineMeta.title}</h1>
            <p className="mt-2 text-sm text-muted-foreground">Offline copy ready on this device.</p>
          </div>
        ) : null}
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
