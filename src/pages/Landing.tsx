import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Play, Zap, TrendingUp, Film, Crown, ArrowRight } from "lucide-react";

const Landing = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      {/* Hero */}
      <div className="relative min-h-[90vh] flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-background to-background" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,hsl(var(--primary)/0.15),transparent_60%)]" />
        
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="relative z-10 text-center px-4 max-w-2xl mx-auto"
        >
          <h1 className="text-5xl md:text-7xl font-display font-black mb-4 text-gradient">CINODE</h1>
          <p className="text-lg md:text-xl text-muted-foreground mb-2">
            Stream Movies & TV Shows for Free
          </p>
          <p className="text-sm text-muted-foreground/70 mb-8 max-w-md mx-auto">
            Thousands of movies and TV shows at your fingertips. No credit card needed.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
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
        </motion.div>
      </div>

      {/* Features */}
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

      {/* Premium CTA */}
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

      {/* Footer */}
      <footer className="py-8 px-4 border-t border-border/20 text-center text-xs text-muted-foreground">
        <p>© {new Date().getFullYear()} Cinode. All rights reserved.</p>
      </footer>
    </div>
  );
};

export default Landing;
