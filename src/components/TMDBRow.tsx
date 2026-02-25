import { useRef, useEffect } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { motion } from "framer-motion";
import TMDBCard from "./TMDBCard";
import { TMDBMovie } from "@/lib/tmdb";

interface TMDBRowProps {
  title: string;
  items: TMDBMovie[];
  variant?: "default" | "wide" | "tall";
  autoScroll?: boolean;
}

const TMDBRow = ({ title, items, variant = "default", autoScroll = true }: TMDBRowProps) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval>>();

  const scroll = (direction: "left" | "right") => {
    if (!scrollRef.current) return;
    const amount = direction === "left" ? -300 : 300;
    scrollRef.current.scrollBy({ left: amount, behavior: "smooth" });
  };

  useEffect(() => {
    if (!autoScroll || !scrollRef.current) return;
    
    intervalRef.current = setInterval(() => {
      if (!scrollRef.current) return;
      const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
      if (scrollLeft + clientWidth >= scrollWidth - 10) {
        scrollRef.current.scrollTo({ left: 0, behavior: "smooth" });
      } else {
        scrollRef.current.scrollBy({ left: 200, behavior: "smooth" });
      }
    }, 4000);

    return () => clearInterval(intervalRef.current);
  }, [autoScroll, items]);

  const handleMouseEnter = () => clearInterval(intervalRef.current);
  const handleMouseLeave = () => {
    if (!autoScroll) return;
    intervalRef.current = setInterval(() => {
      if (!scrollRef.current) return;
      const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
      if (scrollLeft + clientWidth >= scrollWidth - 10) {
        scrollRef.current.scrollTo({ left: 0, behavior: "smooth" });
      } else {
        scrollRef.current.scrollBy({ left: 200, behavior: "smooth" });
      }
    }, 4000);
  };

  if (!items.length) return null;

  return (
    <section className="py-4">
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        whileInView={{ opacity: 1, x: 0 }}
        viewport={{ once: true }}
        className="flex items-center justify-between mb-3 px-4 md:px-12"
      >
        <h2 className="text-lg font-display font-bold">{title}</h2>
        <div className="flex gap-1.5">
          <button
            onClick={() => scroll("left")}
            className="w-7 h-7 rounded-full bg-secondary/60 hover:bg-secondary flex items-center justify-center transition-colors text-muted-foreground hover:text-foreground"
          >
            <ChevronLeft size={14} />
          </button>
          <button
            onClick={() => scroll("right")}
            className="w-7 h-7 rounded-full bg-secondary/60 hover:bg-secondary flex items-center justify-center transition-colors text-muted-foreground hover:text-foreground"
          >
            <ChevronRight size={14} />
          </button>
        </div>
      </motion.div>

      <div
        ref={scrollRef}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        className="flex gap-3 overflow-x-auto scrollbar-hide px-4 md:px-12 pb-2"
      >
        {items.map((item, i) => (
          <TMDBCard key={item.id} item={item} variant={variant} index={i} />
        ))}
      </div>
    </section>
  );
};

export default TMDBRow;
