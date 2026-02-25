import { Star, Play } from "lucide-react";
import { motion } from "framer-motion";
import { Movie } from "@/data/movies";

interface MovieCardProps {
  movie: Movie;
  variant?: "default" | "wide" | "tall";
  index?: number;
  onSelect: (movie: Movie) => void;
}

const MovieCard = ({ movie, variant = "default", index = 0, onSelect }: MovieCardProps) => {
  const baseClasses = "relative group cursor-pointer overflow-hidden card-shine flex-shrink-0";

  const variantClasses = {
    default: "w-[220px] h-[320px] rounded-3xl",
    wide: "w-[380px] h-[240px] rounded-2xl",
    tall: "w-[200px] h-[380px] rounded-[2rem]",
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.4, delay: index * 0.08 }}
      className={`${baseClasses} ${variantClasses[variant]}`}
      onClick={() => onSelect(movie)}
    >
      <img
        src={movie.image}
        alt={movie.title}
        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
        loading="lazy"
      />

      {/* Hover overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

      {/* Always visible bottom gradient */}
      <div className="absolute bottom-0 left-0 right-0 h-1/2 bg-gradient-to-t from-background/90 to-transparent" />

      {/* Info */}
      <div className="absolute bottom-0 left-0 right-0 p-4">
        <h3 className="font-display font-bold text-sm mb-1 line-clamp-1">{movie.title}</h3>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className="flex items-center gap-1 text-primary">
            <Star size={10} className="fill-primary" />
            {movie.rating}
          </span>
          <span>{movie.year}</span>
        </div>
      </div>

      {/* Play button on hover */}
      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
        <div className="w-12 h-12 rounded-full bg-primary/90 flex items-center justify-center glow-primary">
          <Play size={20} className="fill-primary-foreground text-primary-foreground ml-0.5" />
        </div>
      </div>
    </motion.div>
  );
};

export default MovieCard;
