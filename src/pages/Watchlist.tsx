import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Bookmark, Trash2, Play } from "lucide-react";
import { useWatchlist, useToggleWatchlist } from "@/hooks/useWatchlist";
import { useAuth } from "@/contexts/AuthContext";
import { getImageUrl } from "@/lib/tmdb";

const Watchlist = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { data: watchlist, isLoading } = useWatchlist();
  const toggleWatchlist = useToggleWatchlist();

  if (!user) {
    return (
      <div className="min-h-screen bg-background pt-20 px-4 text-center">
        <Bookmark size={48} className="mx-auto text-muted-foreground mb-4" />
        <h1 className="font-display font-bold text-xl mb-2">Your Watchlist</h1>
        <p className="text-muted-foreground text-sm mb-4">Sign in to save movies and shows.</p>
        <button onClick={() => navigate("/auth")} className="px-6 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium">
          Sign In
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pt-20 pb-24 md:pb-8 px-4 md:px-8">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-5xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <Bookmark size={24} className="text-primary" />
          <h1 className="font-display font-bold text-2xl">My Watchlist</h1>
        </div>

        {isLoading ? (
          <p className="text-muted-foreground text-sm">Loading...</p>
        ) : watchlist?.length === 0 ? (
          <div className="glass rounded-2xl p-8 border border-border/30 text-center">
            <Bookmark size={48} className="mx-auto text-muted-foreground mb-3" />
            <p className="text-muted-foreground text-sm">Nothing here yet. Browse movies and shows to add them.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {watchlist?.map((item: any) => (
              <motion.div
                key={item.id}
                layout
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="group relative rounded-xl overflow-hidden bg-card border border-border/30"
              >
                <img
                  src={getImageUrl(item.poster_path, "w300")}
                  alt={item.title}
                  className="w-full aspect-[2/3] object-cover"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-3">
                  <p className="text-xs font-medium truncate mb-2">{item.title}</p>
                  <div className="flex gap-1">
                    <button
                      onClick={() => navigate(`/watch/${item.media_type}/${item.tmdb_id}`)}
                      className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg bg-primary text-primary-foreground text-[10px] font-medium"
                    >
                      <Play size={10} /> Watch
                    </button>
                    <button
                      onClick={() => toggleWatchlist.mutate({
                        tmdbId: item.tmdb_id,
                        mediaType: item.media_type,
                        title: item.title,
                        posterPath: item.poster_path,
                        isInList: true,
                      })}
                      className="p-1.5 rounded-lg bg-destructive/10 text-destructive"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </motion.div>
    </div>
  );
};

export default Watchlist;
