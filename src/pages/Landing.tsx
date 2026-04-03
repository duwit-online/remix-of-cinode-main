import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Play, Zap, TrendingUp, Film, Crown, ArrowRight, Sparkles, Smartphone, ShieldCheck, Clapperboard } from "lucide-react";
import { useAiringToday, useNowPlaying, usePopularTV, useTrending } from "@/hooks/useTMDB";
import TMDBCard from "@/components/TMDBCard";
import TMDBRow from "@/components/TMDBRow";

const Landing = () => {
  const navigate = useNavigate();
  const { data: trending } = useTrending("day");
  const { data: nowPlaying } = useNowPlaying();
  const { data: popularTV } = usePopularTV();
  const { data: airingToday } = useAiringToday();

  const previewItems = [...(nowPlaying?.results || []), ...(popularTV?.results || [])].slice(0, 6);

  return (
    <div className="min-h-screen bg-background">
      <div className="relative min-h-[90vh] flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-background to-background" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,hsl(var(--primary)/0.15),transparent_60%)]" />
        <div className="absolute inset-0 opacity-30 [background-image:radial-gradient(hsl(var(--foreground)/0.08)_1px,transparent_1px)] [background-size:18px_18px]" />
        
        <div className="relative z-10 w-full max-w-6xl mx-auto px-4 py-20 grid gap-10 lg:grid-cols-[1.1fr_0.9fr] items-center">
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center lg:text-left"
          >
            <div className="inline-flex items-center gap-2 rounded-full border border-border/40 bg-secondary/40 px-4 py-2 text-xs font-medium mb-5">
              <Sparkles size={14} className="text-primary" /> Free movie nights, binge weekends, zero boring screens
            </div>
            <h1 className="text-5xl md:text-7xl font-display font-black mb-4 text-gradient">CINODE</h1>
            <p className="text-xl md:text-2xl text-foreground mb-3">
              Stream movies and TV shows with a fast, cinematic, mobile-first vibe.
            </p>
            <p className="text-sm md:text-base text-muted-foreground mb-8 max-w-xl mx-auto lg:mx-0">
              Browse trending hits, jump into TV marathons, save your progress, upgrade for premium, and keep everything feeling like a real entertainment app.
            </p>

            <div className="flex flex-col sm:flex-row gap-3 justify-center lg:justify-start mb-8">
              <button
                onClick={() => navigate("/app")}
                className="flex items-center justify-center gap-2 px-8 py-4 rounded-2xl bg-primary text-primary-foreground font-bold text-lg glow-primary hover:brightness-110 transition-all"
              >
                <Play size={20} className="fill-primary-foreground" /> Start Watching
              </button>
              <button
                onClick={() => navigate("/auth")}
                className="flex items-center justify-center gap-2 px-8 py-4 rounded-2xl border-2 border-border/50 text-foreground font-semibold hover:bg-secondary/50 transition-all"
              >
                Sign In <ArrowRight size={16} />
              </button>
            </div>

            <div className="grid grid-cols-3 gap-3 text-left">
              {[
                { icon: Smartphone, title: "Mobile feel", desc: "Built for thumb-first browsing" },
                { icon: ShieldCheck, title: "Account gated", desc: "Playback opens after sign-in" },
                { icon: Clapperboard, title: "Fresh picks", desc: "Movies, shows, genres, rows" },
              ].map((item) => (
                <div key={item.title} className="rounded-2xl border border-border/30 bg-secondary/30 p-3">
                  <item.icon size={18} className="text-primary mb-2" />
                  <p className="text-sm font-semibold">{item.title}</p>
                  <p className="text-xs text-muted-foreground">{item.desc}</p>
                </div>
              ))}
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.15 }} className="relative">
            <div className="absolute -inset-4 rounded-[2rem] bg-gradient-to-br from-primary/20 to-accent/20 blur-2xl" />
            <div className="relative glass rounded-[2rem] border border-border/30 p-4">
              <div className="grid grid-cols-2 gap-3">
                {previewItems.map((item, index) => (
                  <TMDBCard key={`${item.id}-${index}`} item={item} variant={index % 3 === 0 ? "wide" : "default"} index={index} />
                ))}
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      <section className="px-4 pb-8 -mt-10 relative z-10">
        <div className="max-w-6xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { value: "24/7", label: "Browse Anytime" },
            { value: "10+", label: "Discovery Rows" },
            { value: "TV + Film", label: "All in One Place" },
            { value: "Premium", label: "Optional Upgrade" },
          ].map((item) => (
            <div key={item.label} className="glass rounded-2xl border border-border/30 p-4 text-center">
              <p className="text-2xl font-display font-black text-primary">{item.value}</p>
              <p className="text-xs text-muted-foreground">{item.label}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="py-12 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-end justify-between gap-4 mb-8">
            <div>
              <h2 className="text-2xl md:text-4xl font-display font-black">Latest picks worth tapping first</h2>
              <p className="text-sm text-muted-foreground mt-2 max-w-2xl">A landing page preview of the fast rows inside the app, mixing latest movies, TV drops, and trending titles.</p>
            </div>
            <button onClick={() => navigate("/app")} className="hidden md:inline-flex items-center gap-2 rounded-2xl border border-border/30 bg-secondary/40 px-5 py-3 text-sm font-medium hover:bg-secondary/60">
              Open App <ArrowRight size={14} />
            </button>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {previewItems.map((item, index) => (
              <TMDBCard key={`grid-${item.id}-${index}`} item={item} variant="default" index={index} />
            ))}
          </div>
        </div>
      </section>

      <section className="py-20 px-4">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-display font-bold text-center mb-12">Why Cinode?</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { icon: Film, title: "Free Streaming", desc: "Browse and stream thousands of movies and TV shows without any subscription." },
              { icon: Zap, title: "Fast Player", desc: "Multiple streaming sources with automatic fallback for uninterrupted playback." },
              { icon: TrendingUp, title: "Always Fresh", desc: "Trending, popular, and newly released content updated daily from TMDB." },
            ].map((f, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.15 }}
                className="glass rounded-2xl p-6 border border-border/30 text-center"
              >
                <f.icon size={32} className="text-primary mx-auto mb-3" />
                <h3 className="font-display font-bold mb-2">{f.title}</h3>
                <p className="text-sm text-muted-foreground">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <TMDBRow title="🎬 Latest Movies" items={nowPlaying?.results || []} variant="default" />
      <TMDBRow title="📺 Latest TV Shows" items={airingToday?.results || []} variant="default" />
      <TMDBRow title="🔥 Trending Right Now" items={trending?.results || []} variant="wide" />

      <section className="py-16 px-4">
        <div className="max-w-6xl mx-auto grid gap-6 md:grid-cols-3">
          {[
            { title: "Browse", desc: "Guests can explore movies, TV, genres, search, and details before creating an account." },
            { title: "Sign in to play", desc: "Playback is gated so watching starts only after authentication, keeping the flow clean." },
            { title: "Upgrade later", desc: "Premium removes ads and unlocks faster priority streaming with manual payment verification." },
          ].map((item) => (
            <div key={item.title} className="glass rounded-3xl border border-border/30 p-6">
              <p className="text-lg font-display font-bold mb-2">{item.title}</p>
              <p className="text-sm text-muted-foreground">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="py-16 px-4">
        <div className="max-w-lg mx-auto glass rounded-3xl p-8 border border-primary/30 text-center">
          <Crown size={36} className="text-yellow-500 mx-auto mb-3" />
          <h2 className="text-xl font-display font-bold mb-2">Go Premium</h2>
          <p className="text-sm text-muted-foreground mb-4">Remove ads, faster streaming, and early access starting at ₦500/month.</p>
          <button onClick={() => navigate("/premium")} className="px-6 py-3 rounded-xl bg-primary text-primary-foreground font-semibold text-sm">
            Upgrade Now
          </button>
        </div>
      </section>

      <footer className="py-8 px-4 border-t border-border/20 text-center text-xs text-muted-foreground">
        <p>© {new Date().getFullYear()} Cinode. All rights reserved.</p>
      </footer>
    </div>
  );
};

export default Landing;
