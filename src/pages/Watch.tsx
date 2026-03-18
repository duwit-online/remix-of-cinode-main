import { useState, useMemo, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Maximize2, Bookmark, BookmarkCheck, AlertTriangle, SkipForward } from "lucide-react";
import { motion } from "framer-motion";
import { useMovieDetail, useTVDetail, useSeasonDetail, useSimilar } from "@/hooks/useTMDB";
import { embedProviders, getImageUrl, getTitle, getTVExternalIds } from "@/lib/tmdb";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useIsInWatchlist, useToggleWatchlist } from "@/hooks/useWatchlist";
import { useJellyfinStream } from "@/hooks/useJellyfinStream";
import TMDBRow from "@/components/TMDBRow";
import AdBanner from "@/components/AdBanner";
import PreRollAd from "@/components/PreRollAd";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/hooks/use-toast";

type PlayerSource = "jellyfin" | "override" | "embed" | "none";

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
  const [embedIndex, setEmbedIndex] = useState(0);
  const videoRef = useRef<HTMLVideoElement>(null);

  const { data: movieDetail, isLoading: movieLoading } = useMovieDetail(tmdbId);
  const { data: tvDetail, isLoading: tvLoading } = useTVDetail(tmdbId);
  const detail = mediaType === "movie" ? movieDetail : tvDetail;
  const isLoading = mediaType === "movie" ? movieLoading : tvLoading;

  const { data: seasonData } = useSeasonDetail(mediaType === "tv" ? tmdbId : 0, season);
  const { data: similar } = useSimilar(mediaType, tmdbId);

  const isInWatchlist = useIsInWatchlist(tmdbId, mediaType);
  const toggleWatchlist = useToggleWatchlist();

  // Jellyfin stream lookup
  const { data: jellyfinData, isLoading: jellyfinLoading } = useJellyfinStream(
    tmdbId,
    mediaType,
    mediaType === "tv" ? season : undefined,
    mediaType === "tv" ? episode : undefined
  );

  // DB override
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

  // IMDB ID for vsembed fallback
  const { data: tvExternalIds } = useQuery({
    queryKey: ["tvExternalIds", tmdbId],
    queryFn: () => getTVExternalIds(tmdbId),
    enabled: mediaType === "tv",
  });

  const imdbId = mediaType === "movie"
    ? (movieDetail as any)?.imdb_id
    : tvExternalIds?.imdb_id;

  // Determine which source to use (fallback chain)
  const { activeSource, streamUrl } = useMemo((): { activeSource: PlayerSource; streamUrl: string } => {
    // 1. Jellyfin (highest priority)
    if (jellyfinData?.stream_url && !videoError) {
      return { activeSource: "jellyfin", streamUrl: jellyfinData.stream_url };
    }

    // 2. DB override
    if ((override as any)?.custom_url) {
      return { activeSource: "override", streamUrl: (override as any).custom_url };
    }

    // 3. Embed providers fallback chain
    if (embedIndex < embedProviders.length) {
      const provider = embedProviders[embedIndex];
      const url = provider.getUrl(mediaType, imdbId || "", tmdbId, mediaType === "tv" ? season : undefined, mediaType === "tv" ? episode : undefined);
      return { activeSource: "embed", streamUrl: url };
    }

    return { activeSource: "none", streamUrl: "" };
  }, [jellyfinData, videoError, override, imdbId, mediaType, season, episode, tmdbId, embedIndex]);

  const tryNextEmbed = useCallback(() => {
    if (embedIndex < embedProviders.length - 1) {
      setEmbedIndex(prev => prev + 1);
      toast({ title: "Trying another source...", description: `Switching to ${embedProviders[embedIndex + 1].name}` });
    }
  }, [embedIndex]);

  const handleToggleWatchlist = () => {
    if (!user) {
      toast({ title: "Sign in required", description: "Sign in to save to your watchlist." });
      return;
    }
    toggleWatchlist.mutate({
      tmdbId,
      mediaType,
      title: detail ? getTitle(detail as any) : "",
      posterPath: detail?.poster_path || "",
      isInList: isInWatchlist,
    });
  };

  const handleVideoError = () => {
    setVideoError(true);
    console.warn("Jellyfin video playback failed, falling back...");
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background pt-16 px-4">
        <Skeleton className="w-full aspect-video max-w-5xl mx-auto rounded-2xl" />
      </div>
    );
  }

  const renderPlayer = () => {
    if (!adDone) return <PreRollAd onComplete={() => setAdDone(true)} />;

    if (jellyfinLoading) {
      return <div className="w-full h-full flex items-center justify-center text-muted-foreground">Checking streaming servers...</div>;
    }

    if (activeSource === "jellyfin") {
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
      // Check if override URL is a direct video file
      const isDirectVideo = /\.(mp4|mkv|webm|m3u8)(\?|$)/i.test(streamUrl);
      if (isDirectVideo && activeSource === "override") {
        return (
          <video
            src={streamUrl}
            className="w-full h-full bg-black"
            controls
            autoPlay
            crossOrigin="anonymous"
          />
        );
      }

      return (
        <div className="relative w-full h-full">
          <iframe
            key={streamUrl}
            src={streamUrl}
            className="w-full h-full"
            allowFullScreen
            sandbox="allow-forms allow-pointer-lock allow-same-origin allow-scripts allow-top-navigation"
          />
          {activeSource === "embed" && embedIndex < embedProviders.length - 1 && (
            <button
              onClick={tryNextEmbed}
              className="absolute bottom-4 right-4 flex items-center gap-1 px-3 py-1.5 rounded-lg bg-secondary/80 backdrop-blur text-xs text-foreground hover:bg-secondary transition-colors"
            >
              <SkipForward size={14} /> Try next source
            </button>
          )}
        </div>
      );
    }

    return (
      <div className="w-full h-full flex flex-col items-center justify-center text-muted-foreground gap-2">
        <AlertTriangle size={32} className="text-yellow-500" />
        <p className="text-sm">No playback source available</p>
        <p className="text-xs">This content is not available on any configured server.</p>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      <div className="fixed top-0 left-0 right-0 z-50 glass px-4 py-3 flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="p-2 rounded-full hover:bg-secondary/50 transition-colors">
          <ArrowLeft size={20} />
        </button>
        <h1 className="font-display font-bold text-sm truncate flex-1">
          {detail ? getTitle(detail as any) : "Loading..."}
        </h1>
        {activeSource !== "none" && (
          <span className="px-2 py-0.5 rounded-md bg-secondary/60 text-[10px] text-muted-foreground uppercase hidden sm:block">
            {activeSource === "jellyfin" && jellyfinData?.server_name ? jellyfinData.server_name : activeSource}
          </span>
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

      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className={`pt-14 ${theaterMode ? "" : "max-w-5xl mx-auto px-4"}`}>
        <div className={`relative bg-background ${theaterMode ? "w-full aspect-video" : "rounded-2xl overflow-hidden aspect-video"}`}>
          {renderPlayer()}
        </div>
      </motion.div>

      <div className="max-w-5xl mx-auto px-4 mt-4 space-y-4">
        <AdBanner placement="watch_page" className="mb-4" />

        {mediaType === "tv" && detail && (
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex items-center gap-2">
              <label className="text-xs text-muted-foreground">Season</label>
              <select value={season} onChange={(e) => { setSeason(Number(e.target.value)); setEpisode(1); setVideoError(false); }} className="bg-secondary/60 border border-border/30 rounded-xl px-3 py-2 text-sm outline-none focus:border-primary/50">
                {(detail.seasons || []).filter((s) => s.season_number > 0).map((s) => (
                  <option key={s.season_number} value={s.season_number}>{s.name}</option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-2">
              <label className="text-xs text-muted-foreground">Episode</label>
              <select value={episode} onChange={(e) => { setEpisode(Number(e.target.value)); setVideoError(false); }} className="bg-secondary/60 border border-border/30 rounded-xl px-3 py-2 text-sm outline-none focus:border-primary/50">
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
                <button key={ep.episode_number} onClick={() => { setEpisode(ep.episode_number); setVideoError(false); }}
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

export default Watch;
