import { useState } from "react";
import Navbar from "@/components/Navbar";
import HeroSection from "@/components/HeroSection";
import CategoryRow from "@/components/CategoryRow";
import MovieModal from "@/components/MovieModal";
import { movies, categories, Movie } from "@/data/movies";

const Index = () => {
  const [selectedMovie, setSelectedMovie] = useState<Movie | null>(null);

  const featuredMovie = movies.find((m) => m.featured)!;

  const getMoviesForCategory = (ids: string[]) =>
    ids.map((id) => movies.find((m) => m.id === id)!).filter(Boolean);

  const variants: Array<"default" | "wide" | "tall"> = ["default", "wide", "tall", "default"];

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <HeroSection movie={featuredMovie} onSelect={setSelectedMovie} />

      <div className="relative -mt-16 z-10 pb-20">
        {categories.map((cat, i) => (
          <CategoryRow
            key={cat.name}
            title={cat.name}
            movieList={getMoviesForCategory(cat.movies)}
            variant={variants[i % variants.length]}
            onSelectMovie={setSelectedMovie}
          />
        ))}
      </div>

      <MovieModal movie={selectedMovie} onClose={() => setSelectedMovie(null)} />
    </div>
  );
};

export default Index;
