import { usePopularMovies, useTopRatedMovies, useNowPlaying, useUpcoming, useMovieGenres, useMoviesByGenre } from "@/hooks/useTMDB";
import { useState } from "react";
import TMDBRow from "@/components/TMDBRow";
import TMDBCard from "@/components/TMDBCard";
import { motion } from "framer-motion";

const Movies = () => {
  const [selectedGenre, setSelectedGenre] = useState<number | null>(null);
  const { data: popular } = usePopularMovies();
  const { data: topRated } = useTopRatedMovies();
  const { data: nowPlaying } = useNowPlaying();
  const { data: upcoming } = useUpcoming();
  const { data: genres } = useMovieGenres();
  const { data: genreMovies } = useMoviesByGenre(selectedGenre || 0);

  return (
    <div className="min-h-screen bg-background pt-16 pb-24 md:pb-8">
      <div className="px-4 md:px-12 mb-4">
        <h1 className="text-2xl font-display font-black mb-4">Movies</h1>
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

      {selectedGenre && genreMovies ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-7 gap-3 px-4 md:px-12"
        >
          {genreMovies.results.map((item, i) => (
            <TMDBCard key={item.id} item={item} index={i} />
          ))}
        </motion.div>
      ) : (
        <>
          <TMDBRow title="🎬 Popular" items={popular?.results || []} variant="default" />
          <TMDBRow title="⭐ Top Rated" items={topRated?.results || []} variant="wide" />
          <TMDBRow title="🎥 Now Playing" items={nowPlaying?.results || []} variant="default" />
          <TMDBRow title="📅 Coming Soon" items={upcoming?.results || []} variant="tall" />
        </>
      )}
    </div>
  );
};

export default Movies;
