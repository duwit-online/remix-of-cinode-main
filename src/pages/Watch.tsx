import { useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Monitor, Maximize2, Server } from "lucide-react";
import { motion } from "framer-motion";
import { useMovieDetail, useTVDetail, useSeasonDetail, useSimilar } from "@/hooks/useTMDB";
import { getStreamUrl, getBackdropUrl, getImageUrl, getTitle } from "@/lib/tmdb";
import TMDBRow from "@/components/TMDBRow";
import { Skeleton } from "@/components/ui/skeleton";

const servers = [
  { id: 1, name: "AutoEmbed", label: "Server 1" },
  { id: 2, name: "VidSrcMe", label: "Server 2" },
  { id: 3, name: "SuperEmbed", label: "Server 3" },
];

const Watch = () => {
  const { type, id } = useParams<{ type: string; id: string }>();
  const navigate = useNavigate();
  const mediaType = type as "movie" | "tv";
  const tmdbId = Number(id);

  const [activeServer, setActiveServer] = useState(1);
  const [season, setSeason] = useState(1);
  const [episode, setEpisode] = useState(1);
  const [theaterMode, setTheaterMode] = useState(true);

  const { data: movieDetail, isLoading: movieLoading } = useMovieDetail(tmdbId);
  const { data: tvDetail, isLoading: tvLoading } = useTVDetail(tmdbId);
  const detail = mediaType === "movie" ? movieDetail : tvDetail;
  const isLoading = mediaType === "movie" ? movieLoading : tvLoading;

  const { data: seasonData } = useSeasonDetail(
    mediaType === "tv" ? tmdbId : 0,
    season
  );
  const { data: similar } = useSimilar(mediaType, tmdbId);

  const streamUrl = useMemo(() => {
    if (mediaType === "tv") {
      return getStreamUrl(activeServer, "tv", tmdbId, season, episode);
    }
    return getStreamUrl(activeServer, "movie", tmdbId);
  }, [activeServer, mediaType, tmdbId, season, episode]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background pt-16 px-4">
        <Skeleton className="w-full aspect-video max-w-5xl mx-auto rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      {/* Header */}
      <div className="fixed top-0 left-0 right-0 z-50 glass px-4 py-3 flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="p-2 rounded-full hover:bg-secondary/50 transition-colors">
          <ArrowLeft size={20} />
        </button>
        <h1 className="font-display font-bold text-sm truncate flex-1">
          {detail ? getTitle(detail as any) : "Loading..."}
        </h1>
        <button
          onClick={() => setTheaterMode(!theaterMode)}
          className={`p-2 rounded-full transition-colors ${theaterMode ? "text-primary bg-primary/10" : "hover:bg-secondary/50 text-muted-foreground"}`}
        >
          <Maximize2 size={18} />
        </button>
      </div>

      {/* Video Player */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className={`pt-14 ${theaterMode ? "" : "max-w-5xl mx-auto px-4"}`}
      >
        <div className={`relative bg-black ${theaterMode ? "w-full aspect-video" : "rounded-2xl overflow-hidden aspect-video"}`}>
          <iframe
            key={streamUrl}
            src={streamUrl}
            className="w-full h-full"
            allowFullScreen
            sandbox="allow-forms allow-pointer-lock allow-same-origin allow-scripts allow-top-navigation"
          />
        </div>
      </motion.div>

      {/* Controls */}
      <div className="max-w-5xl mx-auto px-4 mt-4 space-y-4">
        {/* Server Switcher */}
        <div className="flex items-center gap-2 flex-wrap">
          <Server size={16} className="text-muted-foreground" />
          <span className="text-xs text-muted-foreground mr-1">Source:</span>
          {servers.map((s) => (
            <button
              key={s.id}
              onClick={() => setActiveServer(s.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
                activeServer === s.id
                  ? "bg-primary text-primary-foreground glow-primary"
                  : "bg-secondary/60 text-muted-foreground hover:text-foreground hover:bg-secondary"
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>

        {/* TV Show Season/Episode Selector */}
        {mediaType === "tv" && detail && (
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex items-center gap-2">
              <label className="text-xs text-muted-foreground">Season</label>
              <select
                value={season}
                onChange={(e) => { setSeason(Number(e.target.value)); setEpisode(1); }}
                className="bg-secondary/60 border border-border/30 rounded-xl px-3 py-2 text-sm outline-none focus:border-primary/50"
              >
                {(detail.seasons || [])
                  .filter((s) => s.season_number > 0)
                  .map((s) => (
                    <option key={s.season_number} value={s.season_number}>
                      {s.name}
                    </option>
                  ))}
              </select>
            </div>
            <div className="flex items-center gap-2">
              <label className="text-xs text-muted-foreground">Episode</label>
              <select
                value={episode}
                onChange={(e) => setEpisode(Number(e.target.value))}
                className="bg-secondary/60 border border-border/30 rounded-xl px-3 py-2 text-sm outline-none focus:border-primary/50"
              >
                {seasonData?.episodes?.map((ep) => (
                  <option key={ep.episode_number} value={ep.episode_number}>
                    Ep {ep.episode_number}: {ep.name}
                  </option>
                )) || (
                  Array.from({ length: detail.seasons?.find(s => s.season_number === season)?.episode_count || 10 }, (_, i) => (
                    <option key={i + 1} value={i + 1}>Episode {i + 1}</option>
                  ))
                )}
              </select>
            </div>
          </div>
        )}

        {/* Movie Info */}
        {detail && (
          <div className="glass rounded-2xl p-5 border border-border/30">
            <div className="flex gap-4">
              <img
                src={getImageUrl(detail.poster_path, "w200")}
                alt={getTitle(detail as any)}
                className="w-24 h-36 rounded-xl object-cover hidden sm:block"
              />
              <div className="flex-1 min-w-0">
                <h2 className="font-display font-bold text-xl mb-1">{getTitle(detail as any)}</h2>
                {detail.tagline && (
                  <p className="text-primary text-xs italic mb-2">{detail.tagline}</p>
                )}
                <div className="flex flex-wrap gap-2 mb-3">
                  {detail.genres?.map((g) => (
                    <span key={g.id} className="px-2 py-0.5 rounded-md bg-secondary/60 text-xs border border-border/30">
                      {g.name}
                    </span>
                  ))}
                </div>
                <p className="text-muted-foreground text-sm leading-relaxed line-clamp-3">
                  {detail.overview}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Episode Grid for TV */}
        {mediaType === "tv" && seasonData?.episodes && (
          <div>
            <h3 className="font-display font-bold text-base mb-3">Episodes</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {seasonData.episodes.map((ep) => (
                <button
                  key={ep.episode_number}
                  onClick={() => setEpisode(ep.episode_number)}
                  className={`text-left p-3 rounded-xl transition-all ${
                    episode === ep.episode_number
                      ? "bg-primary/10 border border-primary/30"
                      : "bg-secondary/30 border border-border/20 hover:bg-secondary/50"
                  }`}
                >
                  <div className="flex gap-3">
                    {ep.still_path && (
                      <img
                        src={getImageUrl(ep.still_path, "w200")}
                        alt={ep.name}
                        className="w-24 h-14 rounded-lg object-cover flex-shrink-0"
                        loading="lazy"
                      />
                    )}
                    <div className="min-w-0">
                      <p className="text-xs font-semibold truncate">
                        E{ep.episode_number}: {ep.name}
                      </p>
                      <p className="text-[10px] text-muted-foreground line-clamp-2 mt-0.5">
                        {ep.overview}
                      </p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Similar */}
      {similar?.results && similar.results.length > 0 && (
        <div className="mt-6">
          <TMDBRow title="You Might Also Like" items={similar.results} variant="default" />
        </div>
      )}
    </div>
  );
};

export default Watch;
