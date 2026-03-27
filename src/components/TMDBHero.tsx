import { Play, Plus, Star, Info } from "lucide-react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { TMDBMovie, getBackdropUrl, getTitle, getYear, getMediaType } from "@/lib/tmdb";

interface TMDBHeroProps {
  item: TMDBMovie;
}

const TMDBHero = ({ item }: TMDBHeroProps) => {
  const navigate = useNavigate();
  const mediaType = getMediaType(item);

  return (
    <section className="relative h-[70vh] min-h-[500px] overflow-hidden">
      <div className="absolute inset-0">
        <img
          src={getBackdropUrl(item.backdrop_path)}
          alt={getTitle(item)}
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-background via-background/70 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-background/30" />
      </div>

      <div className="relative h-full flex items-end pb-20 px-4 md:px-12 max-w-[1600px] mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="max-w-lg"
        >
          <div className="flex items-center gap-3 mb-3">
            <span className="px-3 py-1 rounded-full bg-primary/20 text-primary text-xs font-semibold border border-primary/30">
              ★ Trending
            </span>
            <span className="text-muted-foreground text-sm">{getYear(item)}</span>
            <span className="px-2 py-0.5 rounded-md bg-secondary/60 text-xs uppercase">
              {mediaType}
            </span>
          </div>

          <h1 className="text-4xl md:text-6xl font-display font-black leading-[0.9] mb-3 tracking-tight">
            {getTitle(item)}
          </h1>

          <div className="flex items-center gap-3 mb-4 text-sm text-muted-foreground">
            <span className="flex items-center gap-1 text-primary font-semibold">
              <Star size={14} className="fill-primary" />
              {(item.vote_average ?? 0).toFixed(1)}
            </span>
          </div>

          <p className="text-muted-foreground text-sm leading-relaxed mb-6 max-w-md line-clamp-3">
            {item.overview}
          </p>

          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate(`/watch/${mediaType}/${item.id}`)}
              className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-primary text-primary-foreground font-semibold text-sm hover:brightness-110 transition-all glow-primary"
            >
              <Play size={16} className="fill-current" />
              Watch Now
            </button>
            <button
              onClick={() => navigate(`/watch/${mediaType}/${item.id}`)}
              className="flex items-center gap-2 px-5 py-3 rounded-2xl glass text-foreground font-medium text-sm hover:bg-secondary/80 transition-all"
            >
              <Info size={16} />
              More Info
            </button>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default TMDBHero;
