import { useRef } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { motion } from "framer-motion";
import MovieCard from "./MovieCard";
import { Movie } from "@/data/movies";

interface CategoryRowProps {
  title: string;
  movieList: Movie[];
  variant?: "default" | "wide" | "tall";
  onSelectMovie: (movie: Movie) => void;
}

const CategoryRow = ({ title, movieList, variant = "default", onSelectMovie }: CategoryRowProps) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  const scroll = (direction: "left" | "right") => {
    if (!scrollRef.current) return;
    const amount = direction === "left" ? -400 : 400;
    scrollRef.current.scrollBy({ left: amount, behavior: "smooth" });
  };

  return (
    <section className="py-6">
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        whileInView={{ opacity: 1, x: 0 }}
        viewport={{ once: true }}
        className="flex items-center justify-between mb-5 px-6 md:px-16"
      >
        <h2 className="text-xl font-display font-bold">
          {title}
        </h2>
        <div className="flex gap-2">
          <button
            onClick={() => scroll("left")}
            className="w-8 h-8 rounded-full bg-secondary/60 hover:bg-secondary flex items-center justify-center transition-colors text-muted-foreground hover:text-foreground"
          >
            <ChevronLeft size={16} />
          </button>
          <button
            onClick={() => scroll("right")}
            className="w-8 h-8 rounded-full bg-secondary/60 hover:bg-secondary flex items-center justify-center transition-colors text-muted-foreground hover:text-foreground"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </motion.div>

      <div
        ref={scrollRef}
        className="flex gap-4 overflow-x-auto scrollbar-hide px-6 md:px-16 pb-2"
      >
        {movieList.map((movie, i) => (
          <MovieCard
            key={movie.id}
            movie={movie}
            variant={variant}
            index={i}
            onSelect={onSelectMovie}
          />
        ))}
      </div>
    </section>
  );
};

export default CategoryRow;
