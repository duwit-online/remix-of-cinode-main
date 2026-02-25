import { useState } from "react";
import { Search as SearchIcon, X } from "lucide-react";
import { motion } from "framer-motion";
import { useSearch, useMovieGenres } from "@/hooks/useTMDB";
import TMDBCard from "@/components/TMDBCard";
import { useMoviesByGenre } from "@/hooks/useTMDB";

const Search = () => {
  const [query, setQuery] = useState("");
  const [selectedGenre, setSelectedGenre] = useState<number | null>(null);
  const { data: searchResults, isLoading } = useSearch(query);
  const { data: genres } = useMovieGenres();
  const { data: genreMovies } = useMoviesByGenre(selectedGenre || 0);

  const displayResults = query.length > 1
    ? searchResults?.results?.filter((r) => r.media_type !== "person") || []
    : genreMovies?.results || [];

  return (
    <div className="min-h-screen bg-background pt-16 pb-24 md:pb-8 px-4 md:px-12">
      {/* Search Bar */}
      <div className="max-w-2xl mx-auto mb-8">
        <div className="relative">
          <SearchIcon size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search movies, TV shows..."
            className="w-full bg-secondary/50 border border-border/30 rounded-2xl pl-12 pr-12 py-3.5 text-sm outline-none focus:border-primary/50 transition-colors"
            autoFocus
          />
          {query && (
            <button
              onClick={() => setQuery("")}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X size={18} />
            </button>
          )}
        </div>
      </div>

      {/* Genre chips */}
      {!query && (
        <div className="flex flex-wrap gap-2 mb-6 max-w-4xl mx-auto">
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
      )}

      {/* Results */}
      {isLoading ? (
        <div className="text-center text-muted-foreground text-sm py-20">Searching...</div>
      ) : (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-7 gap-3 max-w-6xl mx-auto"
        >
          {displayResults.map((item, i) => (
            <TMDBCard key={item.id} item={item} index={i} />
          ))}
        </motion.div>
      )}

      {!query && !selectedGenre && (
        <div className="text-center text-muted-foreground text-sm py-20">
          Search for movies & TV shows or select a genre
        </div>
      )}
    </div>
  );
};

export default Search;
