import { Star, Play } from "lucide-react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { TMDBMovie, getImageUrl, getTitle, getYear, getMediaType } from "@/lib/tmdb";

interface TMDBCardProps {
  item: TMDBMovie;
  variant?: "default" | "wide" | "tall";
  index?: number;
}

const TMDBCard = ({ item, variant = "default", index = 0 }: TMDBCardProps) => {
  const navigate = useNavigate();
  const mediaType = getMediaType(item);

  const handleClick = () => {
    navigate(`/watch/${mediaType}/${item.id}`);
  };

  const baseClasses = "relative group cursor-pointer overflow-hidden card-shine flex-shrink-0";

  const variantClasses = {
    default: "w-[150px] h-[225px] rounded-2xl",
    wide: "w-[260px] h-[160px] rounded-xl",
    tall: "w-[140px] h-[260px] rounded-2xl",
  };

  const image = variant === "wide"
    ? getImageUrl(item.backdrop_path || item.poster_path, "w780")
    : getImageUrl(item.poster_path);

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.3, delay: index * 0.05 }}
      className={`${baseClasses} ${variantClasses[variant]}`}
      onClick={handleClick}
    >
      <img
        src={image}
        alt={getTitle(item)}
        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
        loading="lazy"
      />

      <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      <div className="absolute bottom-0 left-0 right-0 h-1/2 bg-gradient-to-t from-background/90 to-transparent" />

      <div className="absolute bottom-0 left-0 right-0 p-3">
        <h3 className="font-display font-bold text-xs mb-0.5 line-clamp-1">{getTitle(item)}</h3>
        <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
          <span className="flex items-center gap-0.5 text-primary">
            <Star size={8} className="fill-primary" />
            {(item.vote_average ?? 0).toFixed(1)}
          </span>
          <span>{getYear(item)}</span>
        </div>
      </div>

      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
        <div className="w-10 h-10 rounded-full bg-primary/90 flex items-center justify-center glow-primary">
          <Play size={16} className="fill-primary-foreground text-primary-foreground ml-0.5" />
        </div>
      </div>
    </motion.div>
  );
};

export default TMDBCard;
