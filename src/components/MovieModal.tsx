import { X, Play, Plus, Star, Clock, Calendar } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Movie } from "@/data/movies";

interface MovieModalProps {
  movie: Movie | null;
  onClose: () => void;
}

const MovieModal = ({ movie, onClose }: MovieModalProps) => {
  return (
    <AnimatePresence>
      {movie && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center p-4"
          onClick={onClose}
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-background/80 backdrop-blur-md" />

          {/* Modal */}
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 30 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 30 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="relative w-full max-w-3xl rounded-3xl overflow-hidden glass border border-border/40"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Image */}
            <div className="relative h-[300px] md:h-[400px]">
              <img
                src={movie.image}
                alt={movie.title}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-card via-card/50 to-transparent" />

              <button
                onClick={onClose}
                className="absolute top-4 right-4 w-10 h-10 rounded-full glass flex items-center justify-center hover:bg-secondary/80 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 md:p-8 -mt-20 relative">
              <h2 className="text-3xl md:text-4xl font-display font-black mb-3">
                {movie.title}
              </h2>

              <div className="flex flex-wrap items-center gap-4 mb-5 text-sm">
                <span className="flex items-center gap-1.5 text-primary font-semibold">
                  <Star size={14} className="fill-primary" />
                  {movie.rating} / 10
                </span>
                <span className="flex items-center gap-1.5 text-muted-foreground">
                  <Clock size={14} />
                  {movie.duration}
                </span>
                <span className="flex items-center gap-1.5 text-muted-foreground">
                  <Calendar size={14} />
                  {movie.year}
                </span>
              </div>

              <div className="flex flex-wrap gap-2 mb-5">
                {movie.genre.map((g) => (
                  <span
                    key={g}
                    className="px-3 py-1 rounded-full bg-secondary/60 text-xs font-medium border border-border/30"
                  >
                    {g}
                  </span>
                ))}
              </div>

              <p className="text-muted-foreground text-sm leading-relaxed mb-8">
                {movie.description}
              </p>

              <div className="flex items-center gap-4">
                <button className="flex items-center gap-2 px-8 py-3.5 rounded-2xl bg-primary text-primary-foreground font-semibold text-sm hover:brightness-110 transition-all glow-primary">
                  <Play size={18} className="fill-current" />
                  Watch Now
                </button>
                <button className="flex items-center gap-2 px-6 py-3.5 rounded-2xl glass text-foreground font-medium text-sm hover:bg-secondary/80 transition-all border border-border/30">
                  <Plus size={18} />
                  Add to List
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default MovieModal;
