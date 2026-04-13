import { Calendar, Clock3, Layers3, Sparkles, Star, Tv2, Users } from "lucide-react";
import { getBackdropUrl, getImageUrl, getTitle, getYear, type TMDBDetail, type TMDBSeasonDetail } from "@/lib/tmdb";

interface WatchDetailsPanelProps {
  detail: TMDBDetail;
  mediaType: "movie" | "tv";
  cast: any[];
  director?: any;
  producers: any[];
  season: number;
  episode: number;
  seasonData?: TMDBSeasonDetail;
  onSeasonChange: (value: number) => void;
  onEpisodeChange: (value: number) => void;
}

const safeScore = (score?: number) => (typeof score === "number" ? score.toFixed(1) : "N/A");

/* ── Sticky sidebar: Storyline + Cast ── */
export const WatchSidePanel = ({
  detail,
  cast,
}: {
  detail: TMDBDetail;
  cast: any[];
}) => (
  <div className="flex h-full flex-col gap-4 overflow-y-auto scrollbar-hide">
    {/* Storyline */}
    <div className="rounded-2xl border border-border/20 bg-card/80 p-4">
      <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-primary">
        <Sparkles size={14} /> Storyline
      </div>
      <p className="text-xs leading-6 text-foreground/85 sm:text-sm sm:leading-7">
        {detail.overview || "No overview available yet."}
      </p>
    </div>

    {/* Cast Spotlight – horizontal scroll */}
    {cast.length > 0 && (
      <div className="rounded-2xl border border-border/20 bg-card/80 p-4">
        <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-accent">
          <Users size={14} /> Cast Spotlight
        </div>
        <div className="flex gap-3 overflow-x-auto pb-1 scrollbar-hide">
          {cast.map((person: any) => (
            <div key={person.id} className="w-[72px] flex-shrink-0 text-center">
              <img
                src={person.profile_path ? getImageUrl(person.profile_path, "w185") : "/placeholder.svg"}
                alt={person.name}
                className="mx-auto h-16 w-16 rounded-full border border-border/30 object-cover"
                loading="lazy"
              />
              <p className="mt-1.5 line-clamp-1 text-[10px] font-semibold">{person.name}</p>
              <p className="line-clamp-1 text-[9px] text-muted-foreground">{person.character}</p>
            </div>
          ))}
        </div>
      </div>
    )}
  </div>
);

/* ── Scrollable details: Banner + Production Notes + Episode Nav ── */
const WatchDetailsPanel = ({
  detail,
  mediaType,
  cast,
  director,
  producers,
  season,
  episode,
  seasonData,
  onSeasonChange,
  onEpisodeChange,
}: WatchDetailsPanelProps) => {
  return (
    <section className="space-y-5">
      {/* Movie/Show info banner */}
      <div className="overflow-hidden rounded-2xl border border-border/20 bg-card/70">
        <div className="relative min-h-[260px] overflow-hidden sm:min-h-[320px]">
          <img
            src={getBackdropUrl(detail.backdrop_path || detail.poster_path)}
            alt={getTitle(detail)}
            className="absolute inset-0 h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/80 to-background/20" />

          <div className="relative z-10 flex h-full min-h-[260px] flex-col justify-end p-4 sm:min-h-[320px] sm:p-6">
            <div className="grid gap-5 lg:grid-cols-[1fr,0.6fr] lg:items-end">
              <div className="flex items-end gap-4">
                <img
                  src={getImageUrl(detail.poster_path, "w500")}
                  alt={getTitle(detail)}
                  className="hidden w-28 rounded-xl border border-border/30 object-cover shadow-xl sm:block lg:w-36"
                  loading="lazy"
                />
                <div className="flex-1 space-y-3">
                  <div className="flex flex-wrap items-center gap-2 text-[10px] uppercase tracking-[0.25em] text-primary">
                    <span className="rounded-full bg-primary/15 px-2.5 py-0.5">Stream Now</span>
                    <span className="rounded-full bg-card/70 px-2.5 py-0.5 text-foreground/80">
                      {mediaType === "movie" ? "Movie" : "Series"}
                    </span>
                    {detail.status && (
                      <span className="rounded-full bg-card/70 px-2.5 py-0.5 text-foreground/80">{detail.status}</span>
                    )}
                  </div>

                  <h2 className="max-w-2xl text-xl font-black leading-tight sm:text-2xl lg:text-3xl">
                    {getTitle(detail)}
                  </h2>
                  {detail.tagline && (
                    <p className="max-w-xl text-xs italic text-primary/80 sm:text-sm">{detail.tagline}</p>
                  )}

                  {/* Stats row */}
                  <div className="flex flex-wrap gap-2 text-xs">
                    <div className="flex items-center gap-1.5 rounded-xl bg-card/60 px-3 py-1.5 backdrop-blur-sm">
                      <Star size={12} className="fill-primary text-primary" />
                      <span className="font-bold">{safeScore(detail.vote_average)}/10</span>
                    </div>
                    <div className="flex items-center gap-1.5 rounded-xl bg-card/60 px-3 py-1.5 backdrop-blur-sm">
                      <Calendar size={12} className="text-accent" />
                      <span className="font-bold">{getYear(detail) || "TBA"}</span>
                    </div>
                    <div className="flex items-center gap-1.5 rounded-xl bg-card/60 px-3 py-1.5 backdrop-blur-sm">
                      <Clock3 size={12} className="text-primary" />
                      <span className="font-bold">
                        {detail.runtime ? `${detail.runtime} min` : detail.number_of_seasons ? `${detail.number_of_seasons} seasons` : "—"}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 rounded-xl bg-card/60 px-3 py-1.5 backdrop-blur-sm">
                      <Users size={12} className="text-accent" />
                      <span className="font-bold">{director?.name || producers[0]?.name || "Cinode Pick"}</span>
                    </div>
                  </div>

                  {/* Genres */}
                  <div className="flex flex-wrap gap-1.5">
                    {detail.genres?.map((genre) => (
                      <span key={genre.id} className="rounded-full border border-border/30 bg-card/50 px-2.5 py-0.5 text-[10px] text-foreground/85">
                        {genre.name}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Production Notes */}
              <div className="rounded-xl border border-border/20 bg-card/60 p-4 backdrop-blur-sm">
                <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-accent">
                  <Layers3 size={14} /> Production Notes
                </div>
                <div className="space-y-2 text-xs text-foreground/85">
                  {director && (
                    <p>
                      <span className="text-muted-foreground">Director:</span>{" "}
                      <span className="font-semibold">{director.name}</span>
                    </p>
                  )}
                  {producers.length > 0 && (
                    <p>
                      <span className="text-muted-foreground">Producers:</span>{" "}
                      <span className="font-semibold">{producers.map((p) => p.name).join(", ")}</span>
                    </p>
                  )}
                  {(detail as any).budget > 0 && (
                    <p>
                      <span className="text-muted-foreground">Budget:</span>{" "}
                      <span className="font-semibold">${((detail as any).budget / 1_000_000).toFixed(0)}M</span>
                    </p>
                  )}
                  {(detail as any).revenue > 0 && (
                    <p>
                      <span className="text-muted-foreground">Revenue:</span>{" "}
                      <span className="font-semibold">${((detail as any).revenue / 1_000_000).toFixed(0)}M</span>
                    </p>
                  )}
                  {(detail as any).production_companies?.length > 0 && (
                    <div className="pt-1">
                      <p className="mb-1.5 text-muted-foreground">Studios</p>
                      <div className="flex flex-wrap gap-1.5">
                        {(detail as any).production_companies.slice(0, 4).map((company: any) => (
                          <span key={company.id} className="rounded-full bg-secondary/60 px-2.5 py-0.5 text-[10px]">
                            {company.name}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Episode Navigator for TV */}
      {mediaType === "tv" && (
        <div className="rounded-2xl border border-border/20 bg-card/70 p-4 sm:p-5">
          <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-primary">
            <Tv2 size={14} /> Episode Navigator
          </div>
          <div className="flex flex-col gap-2.5 sm:flex-row">
            <select
              value={season}
              onChange={(e) => onSeasonChange(Number(e.target.value))}
              className="rounded-xl bg-secondary/70 px-3 py-2 text-xs outline-none ring-1 ring-border/40"
            >
              {(detail.seasons || []).filter((s) => s.season_number > 0).map((s) => (
                <option key={s.season_number} value={s.season_number}>{s.name}</option>
              ))}
            </select>
            <select
              value={episode}
              onChange={(e) => onEpisodeChange(Number(e.target.value))}
              className="rounded-xl bg-secondary/70 px-3 py-2 text-xs outline-none ring-1 ring-border/40"
            >
              {(seasonData?.episodes || []).map((ep) => (
                <option key={ep.episode_number} value={ep.episode_number}>
                  Episode {ep.episode_number}: {ep.name}
                </option>
              ))}
            </select>
          </div>

          {seasonData?.episodes?.length ? (
            <div className="mt-4 grid gap-2.5 sm:grid-cols-2 xl:grid-cols-3">
              {seasonData.episodes.map((ep) => (
                <button
                  key={ep.episode_number}
                  onClick={() => onEpisodeChange(ep.episode_number)}
                  className={`overflow-hidden rounded-xl border text-left transition-all ${
                    episode === ep.episode_number
                      ? "border-primary/40 bg-primary/10"
                      : "border-border/20 bg-secondary/20 hover:bg-secondary/40"
                  }`}
                >
                  {ep.still_path && (
                    <img src={getImageUrl(ep.still_path, "w500")} alt={ep.name} className="h-28 w-full object-cover" loading="lazy" />
                  )}
                  <div className="p-3">
                    <p className="text-[10px] uppercase tracking-[0.2em] text-primary">Episode {ep.episode_number}</p>
                    <h3 className="mt-0.5 text-xs font-semibold">{ep.name}</h3>
                    <p className="mt-1 line-clamp-2 text-[10px] text-muted-foreground">{ep.overview || "No overview."}</p>
                  </div>
                </button>
              ))}
            </div>
          ) : null}
        </div>
      )}
    </section>
  );
};

export default WatchDetailsPanel;
