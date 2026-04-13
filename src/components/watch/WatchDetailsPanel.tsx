import React from "react";
import { getImageUrl, getTitle, getYear, type TMDBDetail, type TMDBSeasonDetail } from "@/lib/tmdb";

interface WatchDetailsPanelProps {
  detail: TMDBDetail;
  mediaType: "movie" | "tv";
  cast: any[];
  director: any;
  producers: any[];
  season: number;
  episode: number;
  seasonData?: TMDBSeasonDetail;
  onSeasonChange: (value: number) => void;
  onEpisodeChange: (value: number) => void;
}

const WatchDetailsPanel: React.FC<WatchDetailsPanelProps> = ({
  detail, mediaType, cast, director, producers,
  season, episode, seasonData, onSeasonChange, onEpisodeChange,
}) => {
  const totalSeasons = (detail as any)?.number_of_seasons || 1;

  return (
    <div className="space-y-6">
      {/* Title & Meta */}
      <div className="flex flex-col gap-4 sm:flex-row sm:gap-6">
        <img
          src={getImageUrl(detail.poster_path, "w342")}
          alt={getTitle(detail)}
          className="w-28 sm:w-36 rounded-xl shadow-lg flex-shrink-0"
        />
        <div className="flex-1 min-w-0 space-y-2">
          <h1 className="text-xl sm:text-2xl font-black leading-tight">
            {getTitle(detail)}
            {detail.release_date && (
              <span className="ml-2 text-muted-foreground font-medium text-base">({getYear(detail)})</span>
            )}
          </h1>
          {detail.tagline && <p className="text-sm italic text-muted-foreground">{detail.tagline}</p>}

          <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
            {detail.vote_average > 0 && (
              <span className="rounded-full bg-primary/10 px-2 py-0.5 text-primary font-semibold">
                ⭐ {detail.vote_average.toFixed(1)}
              </span>
            )}
            {detail.runtime && <span>{detail.runtime} min</span>}
            {(detail as any).genres?.map((g: any) => (
              <span key={g.id} className="rounded-full bg-secondary px-2 py-0.5">{g.name}</span>
            ))}
          </div>

          <p className="text-sm text-muted-foreground leading-relaxed line-clamp-4 sm:line-clamp-none">
            {detail.overview}
          </p>

          {director && (
            <p className="text-xs text-muted-foreground">
              <span className="font-semibold text-foreground">Director:</span> {director.name}
            </p>
          )}
          {producers.length > 0 && (
            <p className="text-xs text-muted-foreground">
              <span className="font-semibold text-foreground">Producers:</span> {producers.map(p => p.name).join(", ")}
            </p>
          )}
        </div>
      </div>

      {/* Cast */}
      {cast.length > 0 && (
        <div>
          <h3 className="text-sm font-bold mb-2">Cast</h3>
          <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-none">
            {cast.map((c: any) => (
              <div key={c.id} className="flex-shrink-0 w-16 text-center">
                <img
                  src={c.profile_path ? getImageUrl(c.profile_path, "w185") : "/placeholder.svg"}
                  alt={c.name}
                  className="w-14 h-14 rounded-full object-cover mx-auto bg-secondary"
                />
                <p className="text-[10px] mt-1 truncate text-muted-foreground">{c.name}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TV Season/Episode Selector */}
      {mediaType === "tv" && (
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <label className="text-sm font-bold">Season</label>
            <select
              value={season}
              onChange={(e) => onSeasonChange(Number(e.target.value))}
              className="rounded-lg bg-secondary px-3 py-1.5 text-sm border border-border"
            >
              {Array.from({ length: totalSeasons }, (_, i) => (
                <option key={i + 1} value={i + 1}>Season {i + 1}</option>
              ))}
            </select>
          </div>

          {seasonData?.episodes && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-64 overflow-y-auto pr-1">
              {seasonData.episodes.map((ep: any) => (
                <button
                  key={ep.episode_number}
                  onClick={() => onEpisodeChange(ep.episode_number)}
                  className={`flex items-center gap-3 rounded-lg p-2 text-left text-sm transition-colors ${
                    ep.episode_number === episode
                      ? "bg-primary/15 border border-primary/30 text-foreground"
                      : "bg-secondary/40 hover:bg-secondary/70 text-muted-foreground"
                  }`}
                >
                  <span className="flex-shrink-0 w-8 h-8 rounded-md bg-secondary flex items-center justify-center text-xs font-bold">
                    {ep.episode_number}
                  </span>
                  <span className="truncate">{ep.name || `Episode ${ep.episode_number}`}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default WatchDetailsPanel;
