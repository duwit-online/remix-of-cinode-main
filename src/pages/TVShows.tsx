import { usePopularTV, useTopRatedTV, useAiringToday, useTVGenres } from "@/hooks/useTMDB";
import { useState } from "react";
import TMDBRow from "@/components/TMDBRow";
import TMDBCard from "@/components/TMDBCard";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { getTVByGenre } from "@/lib/tmdb";

const TVShows = () => {
  const [selectedGenre, setSelectedGenre] = useState<number | null>(null);
  const { data: popular } = usePopularTV();
  const { data: topRated } = useTopRatedTV();
  const { data: airingToday } = useAiringToday();
  const { data: genres } = useTVGenres();
  const { data: genreTV } = useQuery({
    queryKey: ["tv-genre", selectedGenre],
    queryFn: () => getTVByGenre(selectedGenre!),
    enabled: !!selectedGenre,
  });

  return (
    <div className="min-h-screen bg-background pt-16 pb-24 md:pb-8">
      <div className="px-4 md:px-12 mb-4">
        <h1 className="text-2xl font-display font-black mb-4">TV Shows</h1>
        <div className="flex flex-wrap gap-2">
          {genres?.genres?.map((g) => (
            <button
              key={g.id}
              onClick={() => setSelectedGenre(selectedGenre === g.id ? null : g.id)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                selectedGenre === g.id
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary/60 text-muted-foreground hover:text-foreground hover:bg-secondary"
              }`}
            >
              {g.name}
            </button>
          ))}
        </div>
      </div>

      {selectedGenre && genreTV ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-7 gap-3 px-4 md:px-12"
        >
          {genreTV.results.map((item, i) => (
            <TMDBCard key={item.id} item={{ ...item, media_type: "tv" }} index={i} />
          ))}
        </motion.div>
      ) : (
        <>
          <TMDBRow title="📺 Popular" items={(popular?.results || []).map(i => ({ ...i, media_type: "tv" }))} variant="default" />
          <TMDBRow title="🏆 Top Rated" items={(topRated?.results || []).map(i => ({ ...i, media_type: "tv" }))} variant="wide" />
          <TMDBRow title="📡 Airing Today" items={(airingToday?.results || []).map(i => ({ ...i, media_type: "tv" }))} variant="default" />
        </>
      )}
    </div>
  );
};

export default TVShows;
