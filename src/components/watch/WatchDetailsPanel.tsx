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
    <section className="space-y-6">
      <div className="overflow-hidden rounded-[2rem] border border-border/30 bg-card/70">
        <div className="relative min-h-[420px] overflow-hidden lg:min-h-[520px]">
          <img src={getBackdropUrl(detail.backdrop_path || detail.poster_path)} alt={getTitle(detail)} className="absolute inset-0 h-full w-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/65 to-background/10" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,hsl(var(--primary)/0.28),transparent_34%),radial-gradient(circle_at_bottom_left,hsl(var(--accent)/0.22),transparent_28%)]" />

          <div className="relative z-10 flex h-full flex-col justify-end p-5 sm:p-7 lg:p-10">
            <div className="grid gap-6 lg:grid-cols-[220px,1fr] lg:items-end">
              <img
                src={getImageUrl(detail.poster_path, "w500")}
                alt={getTitle(detail)}
                className="mx-auto hidden w-44 rounded-[1.5rem] border border-border/30 object-cover shadow-2xl lg:block"
                loading="lazy"
              />

              <div className="space-y-4">
                <div className="flex flex-wrap items-center gap-2 text-[11px] uppercase tracking-[0.28em] text-primary">
                  <span className="rounded-full bg-primary/15 px-3 py-1">Stream Now</span>
                  <span className="rounded-full bg-card/70 px-3 py-1 text-foreground/80">{mediaType === "movie" ? "Movie" : "Series"}</span>
                  {detail.status && <span className="rounded-full bg-card/70 px-3 py-1 text-foreground/80">{detail.status}</span>}
                </div>

                <div>
                  <h1 className="max-w-4xl text-3xl font-black leading-tight sm:text-4xl lg:text-6xl">{getTitle(detail)}</h1>
                  {detail.tagline && <p className="mt-2 max-w-2xl text-sm italic text-primary/90 lg:text-lg">{detail.tagline}</p>}
                </div>

                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                  <div className="glass rounded-2xl px-4 py-3">
                    <div className="flex items-center gap-2 text-primary"><Star size={14} className="fill-primary" /> Audience</div>
                    <p className="mt-1 text-lg font-bold">{safeScore(detail.vote_average)}/10</p>
                  </div>
                  <div className="glass rounded-2xl px-4 py-3">
                    <div className="flex items-center gap-2 text-accent"><Calendar size={14} /> Release</div>
                    <p className="mt-1 text-lg font-bold">{getYear(detail) || "TBA"}</p>
                  </div>
                  <div className="glass rounded-2xl px-4 py-3">
                    <div className="flex items-center gap-2 text-primary"><Clock3 size={14} /> Length</div>
                    <p className="mt-1 text-lg font-bold">{detail.runtime ? `${detail.runtime} min` : detail.number_of_seasons ? `${detail.number_of_seasons} seasons` : "—"}</p>
                  </div>
                  <div className="glass rounded-2xl px-4 py-3">
                    <div className="flex items-center gap-2 text-accent"><Users size={14} /> Team</div>
                    <p className="mt-1 text-lg font-bold">{director?.name || producers[0]?.name || "Cinode Pick"}</p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  {detail.genres?.map((genre) => (
                    <span key={genre.id} className="rounded-full border border-border/30 bg-card/60 px-3 py-1 text-xs text-foreground/85">
                      {genre.name}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.2fr,0.8fr]">
        <div className="glass rounded-[1.75rem] p-5 sm:p-6">
          <div className="mb-3 flex items-center gap-2 text-primary"><Sparkles size={16} /> Storyline</div>
          <p className="text-sm leading-7 text-foreground/85 sm:text-base">{detail.overview || "No overview available yet."}</p>
        </div>

        <div className="glass rounded-[1.75rem] p-5 sm:p-6">
          <div className="mb-4 flex items-center gap-2 text-accent"><Layers3 size={16} /> Production Notes</div>
          <div className="space-y-3 text-sm text-foreground/85">
            {director && <p><span className="text-muted-foreground">Director:</span> <span className="font-semibold">{director.name}</span></p>}
            {producers.length > 0 && <p><span className="text-muted-foreground">Producers:</span> <span className="font-semibold">{producers.map((producer) => producer.name).join(", ")}</span></p>}
            {(detail as any).budget > 0 && <p><span className="text-muted-foreground">Budget:</span> <span className="font-semibold">${((detail as any).budget / 1_000_000).toFixed(0)}M</span></p>}
            {(detail as any).revenue > 0 && <p><span className="text-muted-foreground">Revenue:</span> <span className="font-semibold">${((detail as any).revenue / 1_000_000).toFixed(0)}M</span></p>}
            {(detail as any).production_companies?.length > 0 && (
              <div>
                <p className="mb-2 text-muted-foreground">Studios</p>
                <div className="flex flex-wrap gap-2">
                  {(detail as any).production_companies.slice(0, 5).map((company: any) => (
                    <span key={company.id} className="rounded-full bg-secondary/60 px-3 py-1 text-xs">{company.name}</span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {mediaType === "tv" && (
        <div className="glass rounded-[1.75rem] p-5 sm:p-6">
          <div className="mb-4 flex items-center gap-2 text-primary"><Tv2 size={16} /> Episode Navigator</div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <select value={season} onChange={(event) => onSeasonChange(Number(event.target.value))} className="rounded-2xl bg-secondary/70 px-4 py-3 text-sm outline-none ring-1 ring-border/40">
              {(detail.seasons || []).filter((item) => item.season_number > 0).map((item) => (
                <option key={item.season_number} value={item.season_number}>{item.name}</option>
              ))}
            </select>
            <select value={episode} onChange={(event) => onEpisodeChange(Number(event.target.value))} className="rounded-2xl bg-secondary/70 px-4 py-3 text-sm outline-none ring-1 ring-border/40">
              {(seasonData?.episodes || []).map((item) => (
                <option key={item.episode_number} value={item.episode_number}>Episode {item.episode_number}: {item.name}</option>
              ))}
            </select>
          </div>

          {seasonData?.episodes?.length ? (
            <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {seasonData.episodes.map((item) => (
                <button
                  key={item.episode_number}
                  onClick={() => onEpisodeChange(item.episode_number)}
                  className={`overflow-hidden rounded-[1.35rem] border text-left transition-all ${episode === item.episode_number ? "border-primary/40 bg-primary/10" : "border-border/20 bg-secondary/20 hover:bg-secondary/40"}`}
                >
                  {item.still_path && <img src={getImageUrl(item.still_path, "w500")} alt={item.name} className="h-36 w-full object-cover" loading="lazy" />}
                  <div className="p-4">
                    <p className="text-xs uppercase tracking-[0.25em] text-primary">Episode {item.episode_number}</p>
                    <h3 className="mt-1 text-sm font-semibold">{item.name}</h3>
                    <p className="mt-2 line-clamp-3 text-xs text-muted-foreground">{item.overview || "No overview available."}</p>
                  </div>
                </button>
              ))}
            </div>
          ) : null}
        </div>
      )}

      {cast.length > 0 && (
        <div className="glass rounded-[1.75rem] p-5 sm:p-6">
          <div className="mb-4 flex items-center gap-2 text-accent"><Users size={16} /> Cast Spotlight</div>
          <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide">
            {cast.map((person: any) => (
              <div key={person.id} className="w-24 flex-shrink-0 text-center sm:w-28">
                <img
                  src={person.profile_path ? getImageUrl(person.profile_path, "w185") : "/placeholder.svg"}
                  alt={person.name}
                  className="mx-auto h-20 w-20 rounded-full border border-border/30 object-cover sm:h-24 sm:w-24"
                  loading="lazy"
                />
                <p className="mt-2 line-clamp-1 text-xs font-semibold">{person.name}</p>
                <p className="line-clamp-1 text-[10px] text-muted-foreground">{person.character}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
};

export default WatchDetailsPanel;
