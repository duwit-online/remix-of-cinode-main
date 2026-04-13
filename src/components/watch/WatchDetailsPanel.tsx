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
  seasonData: TMDBSeasonDetail | undefined;
  onSeasonChange: (value: number) => void;
  onEpisodeChange: (value: number) => void;
}

const WatchDetailsPanel: React.FC<WatchDetailsPanelProps> = ({
  detail, mediaType, cast, director, producers,
  season, episode, seasonData, onSeasonChange, onEpisodeChange
}) => {
  const title = getTitle(detail);
  const year = getYear(detail);
  const genres = detail.genres?.map(g => g.name).join(", ");

  return (
    <div className="space-y-6">
      {/* Title & Meta */}
      <div className="flex flex-col sm:flex-row gap-5">
        <img
          src={getImageUrl(detail.poster_path, "w342")}
          alt={title}
          className="w-28 sm:w-36 rounded-xl shadow-lg flex-shrink-0"
        />
        <div className="flex flex-col gap-2 min-w-0">
          <h1 className="text-2xl sm:text-3xl font-black leading-tight">
            {title} {year && <span className="text-muted-foreground font-medium">({year})</span>}
          </h1>
          {detail.tagline && <p className="text-sm italic text-muted-foreground">{detail.tagline}</p>}
          <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
            {genres && <span>{genres}</span>}
            {detail.runtime && <span>• {detail.runtime} min</span>}
            {detail.vote_average > 0 && <span>• ⭐ {detail.vote_average.toFixed(1)}</span>}
            {detail.status && <span>• {detail.status}</span>}
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed mt-1 line-clamp-4 sm:line-clamp-none">
            {detail.overview}
          </p>
          {director && (
            <p className="text-xs text-muted-foreground mt-1">
              <span className="text-foreground font-semibold">Director:</span> {director.name}
            </p>
          )}
          {producers.length > 0 && (
            <p className="text-xs text-muted-foreground">
              <span className="text-foreground font-semibold">Producers:</span> {producers.map((p: any) => p.name).join(", ")}
            </p>
          )}
        </div>
      </div>

      {/* TV Season/Episode Selector */}
      {mediaType === "tv" && detail.seasons && (
        <div className="space-y-3">
          <div className="flex items-center gap-3 flex-wrap">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Season</label>
            <div className="flex gap-1.5 flex-wrap">
              {detail.seasons.filter(s => s.season_number > 0).map(s => (
                <button
                  key={s.season_number}
                  onClick={() => onSeasonChange(s.season_number)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    s.season_number === season
                      ? "bg-primary text-primary-foreground"
                      : "bg-secondary/60 text-muted-foreground hover:bg-secondary"
                  }`}
                >
                  {s.season_number}
                </button>
              ))}
            </div>
          </div>

          {seasonData?.episodes && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-64 overflow-y-auto pr-1">
              {seasonData.episodes.map(ep => (
                <button
                  key={ep.episode_number}
                  onClick={() => onEpisodeChange(ep.episode_number)}
                  className={`flex items-start gap-3 rounded-xl p-2.5 text-left transition-colors ${
                    ep.episode_number === episode
                      ? "bg-primary/15 border border-primary/30"
                      : "bg-secondary/30 hover:bg-secondary/60"
                  }`}
                >
                  {ep.still_path && (
                    <img src={getImageUrl(ep.still_path, "w185")} alt="" className="w-20 rounded-lg flex-shrink-0" />
                  )}
                  <div className="min-w-0">
                    <p className="text-xs font-bold truncate">E{ep.episode_number}: {ep.name}</p>
                    <p className="text-[10px] text-muted-foreground line-clamp-2 mt-0.5">{ep.overview}</p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Cast */}
      {cast.length > 0 && (
        <div>
          <h3 className="text-sm font-bold mb-2">Cast</h3>
          <div className="flex gap-3 overflow-x-auto pb-2">
            {cast.map((person: any) => (
              <div key={person.id} className="flex flex-col items-center flex-shrink-0 w-16">
                <img
                  src={getImageUrl(person.profile_path, "w185")}
                  alt={person.name}
                  className="w-12 h-12 rounded-full object-cover bg-secondary"
                />
                <p className="text-[10px] text-center mt-1 leading-tight truncate w-full">{person.name}</p>
                <p className="text-[9px] text-muted-foreground text-center truncate w-full">{person.character}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default WatchDetailsPanel;
