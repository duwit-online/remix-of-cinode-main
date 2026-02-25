import { Play, Plus, Star } from "lucide-react";
import { motion } from "framer-motion";
import { Movie } from "@/data/movies";

interface HeroSectionProps {
  movie: Movie;
  onSelect: (movie: Movie) => void;
}

const HeroSection = ({ movie, onSelect }: HeroSectionProps) => {
  return (
    <section className="relative h-[85vh] min-h-[600px] overflow-hidden">
      {/* Background Image */}
      <div className="absolute inset-0">
        <img
          src={movie.image}
          alt={movie.title}
          className="w-full h-full object-cover"
        />
        {/* Overlays */}
        <div className="absolute inset-0 bg-gradient-to-r from-background via-background/70 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-background/30" />
      </div>

      {/* Content */}
      <div className="relative h-full flex items-end pb-24 px-6 md:px-16 max-w-[1600px] mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="max-w-xl"
        >
          {/* Badge */}
          <div className="flex items-center gap-3 mb-4">
            <span className="px-3 py-1 rounded-full bg-primary/20 text-primary text-xs font-semibold border border-primary/30">
              ★ Featured
            </span>
            <span className="text-muted-foreground text-sm">{movie.year}</span>
          </div>

          {/* Title */}
          <h2 className="text-5xl md:text-7xl font-display font-black leading-[0.9] mb-4 tracking-tight">
            {movie.title}
          </h2>

          {/* Meta */}
          <div className="flex items-center gap-4 mb-5 text-sm text-muted-foreground">
            <span className="flex items-center gap-1 text-primary font-semibold">
              <Star size={14} className="fill-primary" />
              {movie.rating}
            </span>
            <span>{movie.duration}</span>
            <span className="flex gap-2">
              {movie.genre.map((g) => (
                <span key={g} className="px-2 py-0.5 rounded-md bg-secondary/60 text-xs">
                  {g}
                </span>
              ))}
            </span>
          </div>

          {/* Description */}
          <p className="text-muted-foreground text-sm leading-relaxed mb-8 max-w-md">
            {movie.description}
          </p>

          {/* Buttons */}
          <div className="flex items-center gap-4">
            <button
              onClick={() => onSelect(movie)}
              className="flex items-center gap-2 px-8 py-3.5 rounded-2xl bg-primary text-primary-foreground font-semibold text-sm hover:brightness-110 transition-all glow-primary"
            >
              <Play size={18} className="fill-current" />
              Watch Now
            </button>
            <button className="flex items-center gap-2 px-6 py-3.5 rounded-2xl glass text-foreground font-medium text-sm hover:bg-secondary/80 transition-all">
              <Plus size={18} />
              My List
            </button>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default HeroSection;
