import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Play } from "lucide-react";
import { getImageUrl } from "@/lib/tmdb";

const STORAGE_KEY = "cinode_playback_progress";

interface ProgressEntry {
  currentTime: number;
  duration: number;
  updatedAt: number;
}

interface ContinueItem {
  key: string;
  mediaType: string;
  tmdbId: number;
  season?: number;
  episode?: number;
  currentTime: number;
  duration: number;
  updatedAt: number;
  percent: number;
}

function parseKey(key: string): { mediaType: string; tmdbId: number; season?: number; episode?: number } | null {
  const tvMatch = key.match(/^(tv)-(\d+)-s(\d+)e(\d+)$/);
  if (tvMatch) return { mediaType: "tv", tmdbId: parseInt(tvMatch[2]), season: parseInt(tvMatch[3]), episode: parseInt(tvMatch[4]) };
  const movieMatch = key.match(/^(movie|tv)-(\d+)$/);
  if (movieMatch) return { mediaType: movieMatch[1], tmdbId: parseInt(movieMatch[2]) };
  return null;
}

function formatTime(s: number): string {
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${String(sec).padStart(2, "0")}`;
}

const TMDB_IMG = "https://image.tmdb.org/t/p/";
const TMDB_KEY = "2dca580c2a14b55200e784d157207b4d";

const ContinueWatchingRow = () => {
  const navigate = useNavigate();
  const [items, setItems] = useState<(ContinueItem & { poster?: string; title?: string })[]>([]);

  useEffect(() => {
    try {
      const raw: Record<string, ProgressEntry> = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
      const parsed: ContinueItem[] = Object.entries(raw)
        .map(([key, entry]) => {
          const info = parseKey(key);
          if (!info || entry.currentTime < 30) return null;
          const percent = entry.duration > 0 ? (entry.currentTime / entry.duration) * 100 : 0;
          if (percent > 95) return null;
          return { key, ...info, ...entry, percent };
        })
        .filter(Boolean) as ContinueItem[];

      parsed.sort((a, b) => b.updatedAt - a.updatedAt);
      const top = parsed.slice(0, 20);

      // Fetch posters from TMDB
      Promise.all(
        top.map(async (item) => {
          try {
            const endpoint = item.mediaType === "tv" ? "tv" : "movie";
            const res = await fetch(`https://api.themoviedb.org/3/${endpoint}/${item.tmdbId}?api_key=${TMDB_KEY}`);
            const data = await res.json();
            return { ...item, poster: data.poster_path, title: data.title || data.name };
          } catch {
            return item;
          }
        })
      ).then(setItems);
    } catch {
      // no-op
    }
  }, []);

  if (items.length === 0) return null;

  return (
    <div className="px-4 md:px-8 mb-4">
      <h2 className="font-display font-bold text-base mb-3">▶️ Continue Watching</h2>
      <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-2">
        {items.map((item) => (
          <button
            key={item.key}
            onClick={() => {
              const path = `/watch/${item.mediaType}/${item.tmdbId}`;
              navigate(path);
            }}
            className="flex-shrink-0 w-32 group relative"
          >
            <div className="relative rounded-xl overflow-hidden aspect-[2/3] bg-secondary/30">
              {item.poster ? (
                <img src={`${TMDB_IMG}w300${item.poster}`} alt={item.title} className="w-full h-full object-cover" loading="lazy" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                  <Play size={24} />
                </div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
              <div className="absolute bottom-0 left-0 right-0 p-2">
                <div className="w-full h-1 bg-foreground/20 rounded-full mb-1">
                  <div className="h-full bg-primary rounded-full" style={{ width: `${item.percent}%` }} />
                </div>
                <p className="text-[9px] text-foreground/70">{formatTime(item.currentTime)} left</p>
              </div>
              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/30">
                <Play size={28} className="text-white" fill="white" />
              </div>
            </div>
            <p className="text-xs font-medium mt-1 truncate text-left">{item.title || `ID:${item.tmdbId}`}</p>
            {item.season && (
              <p className="text-[10px] text-muted-foreground text-left">S{item.season} E{item.episode}</p>
            )}
          </button>
        ))}
      </div>
    </div>
  );
};

export default ContinueWatchingRow;
