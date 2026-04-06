import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Film, Tv, ChevronDown, ChevronRight, Database } from "lucide-react";
import { useState } from "react";

interface MediaEntry {
  id: string;
  tmdb_id: number;
  title: string | null;
  media_type: string;
  season: number | null;
  episode: number | null;
  source: string;
  stream_url: string;
  file_name: string | null;
  created_at: string;
  is_active: boolean;
}

const AdminStreamedLibrary = () => {
  const [expandedSources, setExpandedSources] = useState<Record<string, boolean>>({});
  const [expandedTypes, setExpandedTypes] = useState<Record<string, boolean>>({});

  const { data: entries = [], isLoading } = useQuery({
    queryKey: ["admin-streamed-library"],
    queryFn: async () => {
      const { data } = await supabase
        .from("media_sources")
        .select("*")
        .order("created_at", { ascending: false });
      return (data || []) as MediaEntry[];
    },
  });

  // Group by source → media_type → items
  const grouped = entries.reduce<Record<string, { movies: MediaEntry[]; tv: Record<number, MediaEntry[]> }>>((acc, e) => {
    const src = e.source || "unknown";
    if (!acc[src]) acc[src] = { movies: [], tv: {} };

    if (e.media_type === "tv") {
      const key = e.tmdb_id;
      if (!acc[src].tv[key]) acc[src].tv[key] = [];
      acc[src].tv[key].push(e);
    } else {
      acc[src].movies.push(e);
    }
    return acc;
  }, {});

  const toggle = (key: string, map: Record<string, boolean>, setter: (v: Record<string, boolean>) => void) => {
    setter({ ...map, [key]: !map[key] });
  };

  if (isLoading) {
    return <div className="text-center py-12 text-muted-foreground text-sm">Loading library...</div>;
  }

  if (entries.length === 0) {
    return (
      <div className="glass rounded-2xl p-8 border border-border/30 text-center">
        <Database size={32} className="mx-auto text-muted-foreground mb-2" />
        <p className="text-sm text-muted-foreground">No streamed media found yet. Media gets cached here when users play content via API sources (Telegram Bridge, Jellyfin, etc.).</p>
      </div>
    );
  }

  const sourceNames: Record<string, string> = {
    telegram_bridge: "Telegram Bridge",
    jellyfin: "Jellyfin",
    manual: "Manual / Admin",
    override: "Admin Override",
  };

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-bold flex items-center gap-2"><Database size={20} /> Streamed Library</h2>
        <p className="text-xs text-muted-foreground mt-1">
          All films and TV episodes fetched or streamed by each source. Total: <strong>{entries.length}</strong> entries across <strong>{Object.keys(grouped).length}</strong> sources.
        </p>
      </div>

      {Object.entries(grouped).map(([source, data]) => {
        const srcKey = `src-${source}`;
        const isOpen = expandedSources[srcKey] !== false; // default open
        const movieCount = data.movies.length;
        const tvShowCount = Object.keys(data.tv).length;
        const tvEpCount = Object.values(data.tv).reduce((s, eps) => s + eps.length, 0);

        return (
          <div key={source} className="glass rounded-2xl border border-border/30 overflow-hidden">
            {/* Source Header */}
            <button
              onClick={() => toggle(srcKey, expandedSources, setExpandedSources)}
              className="w-full flex items-center gap-3 p-4 hover:bg-secondary/30 transition-colors text-left"
            >
              {isOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
              <span className="font-semibold text-sm">{sourceNames[source] || source}</span>
              <div className="flex gap-2 ml-auto">
                {movieCount > 0 && (
                  <span className="px-2 py-0.5 rounded-full bg-primary/20 text-primary text-[10px] font-bold">
                    {movieCount} Movies
                  </span>
                )}
                {tvShowCount > 0 && (
                  <span className="px-2 py-0.5 rounded-full bg-green-500/20 text-green-400 text-[10px] font-bold">
                    {tvShowCount} Shows · {tvEpCount} Eps
                  </span>
                )}
              </div>
            </button>

            {isOpen && (
              <div className="px-4 pb-4 space-y-3">
                {/* Movies */}
                {movieCount > 0 && (
                  <div>
                    <button
                      onClick={() => toggle(`${srcKey}-movies`, expandedTypes, setExpandedTypes)}
                      className="flex items-center gap-2 text-xs font-bold text-muted-foreground mb-2 hover:text-foreground"
                    >
                      <Film size={13} />
                      Movies ({movieCount})
                      {expandedTypes[`${srcKey}-movies`] === false ? <ChevronRight size={12} /> : <ChevronDown size={12} />}
                    </button>
                    {expandedTypes[`${srcKey}-movies`] !== false && (
                      <div className="space-y-1 ml-5">
                        {data.movies.map((m) => (
                          <div key={m.id} className="flex items-center gap-3 py-1.5 border-b border-border/10 last:border-0">
                            <span className="text-xs font-mono text-muted-foreground w-16 shrink-0">#{m.tmdb_id}</span>
                            <span className="text-sm truncate flex-1">{m.title || "Untitled"}</span>
                            <span className={`w-2 h-2 rounded-full shrink-0 ${m.is_active ? "bg-green-500" : "bg-muted-foreground/30"}`} title={m.is_active ? "Active" : "Inactive"} />
                            <span className="text-[10px] text-muted-foreground shrink-0">
                              {new Date(m.created_at).toLocaleDateString()}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* TV Shows */}
                {tvShowCount > 0 && (
                  <div>
                    <button
                      onClick={() => toggle(`${srcKey}-tv`, expandedTypes, setExpandedTypes)}
                      className="flex items-center gap-2 text-xs font-bold text-muted-foreground mb-2 hover:text-foreground"
                    >
                      <Tv size={13} />
                      TV Shows ({tvShowCount})
                      {expandedTypes[`${srcKey}-tv`] === false ? <ChevronRight size={12} /> : <ChevronDown size={12} />}
                    </button>
                    {expandedTypes[`${srcKey}-tv`] !== false && (
                      <div className="space-y-2 ml-5">
                        {Object.entries(data.tv).map(([tmdbId, episodes]) => {
                          const showKey = `${srcKey}-tv-${tmdbId}`;
                          const showOpen = expandedTypes[showKey] !== false;
                          const showTitle = episodes[0]?.title || "Untitled";
                          const sorted = [...episodes].sort((a, b) => (a.season || 0) - (b.season || 0) || (a.episode || 0) - (b.episode || 0));

                          return (
                            <div key={tmdbId} className="border border-border/10 rounded-xl overflow-hidden">
                              <button
                                onClick={() => toggle(showKey, expandedTypes, setExpandedTypes)}
                                className="w-full flex items-center gap-3 px-3 py-2 hover:bg-secondary/20 text-left text-sm"
                              >
                                {showOpen ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                                <span className="font-mono text-xs text-muted-foreground">#{tmdbId}</span>
                                <span className="truncate flex-1 font-medium">{showTitle}</span>
                                <span className="text-[10px] text-muted-foreground">{episodes.length} eps</span>
                              </button>
                              {showOpen && (
                                <div className="px-3 pb-2 space-y-0.5">
                                  {sorted.map((ep) => (
                                    <div key={ep.id} className="flex items-center gap-3 py-1 text-xs">
                                      <span className="font-mono text-muted-foreground w-14 shrink-0">
                                        S{String(ep.season || 0).padStart(2, "0")}E{String(ep.episode || 0).padStart(2, "0")}
                                      </span>
                                      <span className="truncate flex-1 text-muted-foreground">{ep.file_name || ep.stream_url.slice(0, 60)}</span>
                                      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${ep.is_active ? "bg-green-500" : "bg-muted-foreground/30"}`} />
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default AdminStreamedLibrary;
