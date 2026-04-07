import { useState, useMemo, useRef, useCallback, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Maximize2, Bookmark, BookmarkCheck, AlertTriangle, Download, CheckCircle2, PictureInPicture2, Star, Calendar, Clock, Users, Play, Volume2 } from "lucide-react";
import { motion } from "framer-motion";
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

  const rawStreamUrl = useMemo(() => {
    if (bridgeData?.stream_url) return bridgeData.stream_url;
    if (jellyfinData?.stream_url && !videoError) return jellyfinData.stream_url;
    if ((override as any)?.custom_url) return (override as any).custom_url;
    return "";
  }, [bridgeData, jellyfinData, videoError, override]);

  const isDirectVideo = useMemo(() => isDirectVideoUrl(rawStreamUrl), [rawStreamUrl]);

  const { isDownloaded, isDownloading, progress: dlProgress, offlineUrl, download, removeDownload } = useOfflineDownload(
    rawStreamUrl,
    mediaType, tmdbId,
    detail ? getTitle(detail as any) : "",
    detail?.poster_path || "",
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

  const togglePiP = async () => {
    const vid = videoRef.current;
    if (!vid) return;
    try {
      if (document.pictureInPictureElement) await document.exitPictureInPicture();
      else await vid.requestPictureInPicture();
    } catch {
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

  const cast = credits?.cast?.slice(0, 10) || [];
  const director = credits?.crew?.find((c: any) => c.job === "Director");
  const producers = credits?.crew?.filter((c: any) => c.job === "Producer")?.slice(0, 3) || [];

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
      <div className="sticky top-0 z-40">
        <div className="glass px-4 py-3 flex items-center gap-2 z-50">
          <button onClick={() => navigate(-1)} className="p-2 rounded-full hover:bg-secondary/50 transition-colors">
            <ArrowLeft size={20} />
          </button>
          <h1 className="font-display font-bold text-sm truncate flex-1">
            {detail ? getTitle(detail as any) : "Loading..."}
          </h1>

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

        <div className={`relative bg-black ${theaterMode ? "w-full aspect-video" : "max-w-5xl mx-auto aspect-video"}`}>
          {renderPlayer()}
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 mt-4 space-y-6">
        <AdBanner placement="watch_page" className="mb-4" />

        {mediaType === "tv" && detail && (
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex items-center gap-2">
              <label className="text-xs text-muted-foreground">Season</label>
              <select value={season} onChange={(e) => { setSeason(Number(e.target.value)); setEpisode(1); setVideoError(false); setBridgeError(false); setEmbedIndex(0); hasResumed.current = false; }} className="bg-secondary/60 border border-border/30 rounded-xl px-3 py-2 text-sm outline-none focus:border-primary/50">
                {(detail.seasons || []).filter((s) => s.season_number > 0).map((s) => (
                  <option key={s.season_number} value={s.season_number}>{s.name}</option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-2">
              <label className="text-xs text-muted-foreground">Episode</label>
              <select value={episode} onChange={(e) => { setEpisode(Number(e.target.value)); setVideoError(false); setBridgeError(false); setEmbedIndex(0); hasResumed.current = false; }} className="bg-secondary/60 border border-border/30 rounded-xl px-3 py-2 text-sm outline-none focus:border-primary/50">
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

        {/* Enhanced Detail Section — responsive for desktop */}
        {detail && (
          <div className="glass rounded-2xl border border-border/30 overflow-hidden">
            {/* Backdrop banner on desktop */}
            <div className="hidden lg:block relative h-[200px]">
              <img
                src={getImageUrl(detail.backdrop_path || detail.poster_path, "w1280")}
                alt=""
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-card via-card/60 to-transparent" />
            </div>

            <div className="p-5 lg:p-8 lg:-mt-20 relative">
              <div className="flex gap-5">
                <img
                  src={getImageUrl(detail.poster_path, "w300")}
                  alt={getTitle(detail as any)}
                  className="w-24 h-36 lg:w-40 lg:h-60 rounded-xl object-cover flex-shrink-0 shadow-lg hidden sm:block"
                />
                <div className="flex-1 min-w-0">
                  <h2 className="font-display font-bold text-xl lg:text-3xl mb-1">{getTitle(detail as any)}</h2>
                  {detail.tagline && <p className="text-primary text-xs lg:text-sm italic mb-3">{detail.tagline}</p>}

                  <div className="flex flex-wrap items-center gap-3 mb-3 text-xs lg:text-sm text-muted-foreground">
                    <span className="flex items-center gap-1 text-primary font-semibold">
                      <Star size={14} className="fill-primary" /> {(detail.vote_average ?? 0).toFixed(1)}
                    </span>
                    {(detail as any).release_date && (
                      <span className="flex items-center gap-1"><Calendar size={14} /> {(detail as any).release_date}</span>
                    )}
                    {(detail as any).first_air_date && (
                      <span className="flex items-center gap-1"><Calendar size={14} /> {(detail as any).first_air_date}</span>
                    )}
                    {detail.runtime && (
                      <span className="flex items-center gap-1"><Clock size={14} /> {detail.runtime} min</span>
                    )}
                    {detail.number_of_seasons && (
                      <span>{detail.number_of_seasons} Seasons</span>
                    )}
                    {detail.status && <span className="px-2 py-0.5 rounded-md bg-secondary/60 border border-border/30">{detail.status}</span>}
                  </div>

                  <div className="flex flex-wrap gap-2 mb-3">
                    {detail.genres?.map((g) => (
                      <span key={g.id} className="px-2 py-0.5 rounded-md bg-secondary/60 text-xs border border-border/30">{g.name}</span>
                    ))}
                  </div>

                  <p className="text-muted-foreground text-sm lg:text-base leading-relaxed line-clamp-4 lg:line-clamp-none">{detail.overview}</p>

                  {/* Crew info — visible on larger screens */}
                  <div className="hidden lg:flex flex-wrap gap-6 mt-4 text-sm">
                    {director && (
                      <div>
                        <span className="text-muted-foreground">Director:</span>{" "}
                        <span className="font-medium">{director.name}</span>
                      </div>
                    )}
                    {producers.length > 0 && (
                      <div>
                        <span className="text-muted-foreground">Producers:</span>{" "}
                        <span className="font-medium">{producers.map((p: any) => p.name).join(", ")}</span>
                      </div>
                    )}
                    {(detail as any).budget > 0 && (
                      <div>
                        <span className="text-muted-foreground">Budget:</span>{" "}
                        <span className="font-medium">${((detail as any).budget / 1_000_000).toFixed(0)}M</span>
                      </div>
                    )}
                    {(detail as any).revenue > 0 && (
                      <div>
                        <span className="text-muted-foreground">Revenue:</span>{" "}
                        <span className="font-medium">${((detail as any).revenue / 1_000_000).toFixed(0)}M</span>
                      </div>
                    )}
                  </div>

                  {/* Production companies */}
                  {(detail as any).production_companies && (detail as any).production_companies.length > 0 && (
                    <div className="hidden lg:flex flex-wrap gap-4 mt-4 items-center">
                      {(detail as any).production_companies.slice(0, 4).map((pc: any) => (
                        <div key={pc.id} className="flex items-center gap-2 text-xs text-muted-foreground">
                          {pc.logo_path && (
                            <img src={getImageUrl(pc.logo_path, "w92")} alt={pc.name} className="h-6 object-contain opacity-70" />
                          )}
                          <span>{pc.name}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Mobile crew info */}
              <div className="lg:hidden mt-3">
                {director && <p className="text-xs text-muted-foreground">Director: <span className="text-foreground font-medium">{director.name}</span></p>}
              </div>
            </div>
          </div>
        )}

        {/* Cast */}
        {cast.length > 0 && (
          <div>
            <h3 className="font-display font-bold text-base lg:text-lg mb-3">Cast</h3>
            <div className="flex gap-3 lg:gap-4 overflow-x-auto scrollbar-hide pb-2">
              {cast.map((person: any) => (
                <div key={person.id} className="flex-shrink-0 w-20 lg:w-28 text-center">
                  <img
                    src={person.profile_path ? getImageUrl(person.profile_path, "w185") : "/placeholder.svg"}
                    alt={person.name}
                    className="w-16 h-16 lg:w-24 lg:h-24 rounded-full object-cover mx-auto mb-1"
                    loading="lazy"
                  />
                  <p className="text-[10px] lg:text-xs font-medium line-clamp-1">{person.name}</p>
                  <p className="text-[9px] lg:text-[10px] text-muted-foreground line-clamp-1">{person.character}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {mediaType === "tv" && seasonData?.episodes && (
          <div>
            <h3 className="font-display font-bold text-base lg:text-lg mb-3">Episodes</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {seasonData.episodes.map((ep) => (
                <button key={ep.episode_number} onClick={() => { setEpisode(ep.episode_number); setVideoError(false); setBridgeError(false); setEmbedIndex(0); hasResumed.current = false; }}
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
