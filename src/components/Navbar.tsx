import { useState } from "react";
import { Search, User, Bookmark, Crown } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate, useLocation } from "react-router-dom";
import NotificationBell from "@/components/NotificationBell";
import { useIsPremium } from "@/hooks/useSubscription";

const navItems = [
  { label: "Home", path: "/app" },
  { label: "Movies", path: "/movies" },
  { label: "TV Shows", path: "/tv" },
  { label: "Watchlist", path: "/watchlist" },
  { label: "Collections", path: "/collections" },
];

const Navbar = () => {
  const [searchOpen, setSearchOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { isPremium } = useIsPremium();

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 glass border-b-0 hidden md:block">
      <div className="flex items-center justify-between px-6 py-3 max-w-[1600px] mx-auto">
        <div className="flex items-center gap-8">
          <h1
            className="text-xl font-display font-black tracking-tight text-gradient cursor-pointer"
            onClick={() => navigate("/app")}
          >
            CINODE
          </h1>
          <div className="flex items-center gap-6">
            {navItems.map((item) => (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className={`text-sm font-medium transition-colors relative group ${
                  location.pathname === item.path ? "text-foreground" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {item.label}
                <span
                  className={`absolute -bottom-1 left-0 h-0.5 bg-primary rounded-full transition-all ${
                    location.pathname === item.path ? "w-full" : "w-0 group-hover:w-full"
                  }`}
                />
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {!isPremium && (
            <button onClick={() => navigate("/premium")} className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-yellow-500/20 text-yellow-400 text-xs font-semibold hover:bg-yellow-500/30 transition-colors">
              <Crown size={12} /> Upgrade
            </button>
          )}
          <AnimatePresence>
            {searchOpen && (
              <motion.input
                initial={{ width: 0, opacity: 0 }}
                animate={{ width: 200, opacity: 1 }}
                exit={{ width: 0, opacity: 0 }}
                className="bg-secondary/50 text-foreground text-sm px-4 py-2 rounded-full outline-none border border-border/50 focus:border-primary/50"
                placeholder="Search..."
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === "Enter" && e.currentTarget.value) {
                    navigate(`/search?q=${e.currentTarget.value}`);
                    setSearchOpen(false);
                  }
                }}
              />
            )}
          </AnimatePresence>
          <button
            onClick={() => {
              if (searchOpen) { navigate("/search"); setSearchOpen(false); } else { setSearchOpen(true); }
            }}
            className="p-2 rounded-full hover:bg-secondary/50 transition-colors text-muted-foreground hover:text-foreground"
          >
            <Search size={18} />
          </button>
          <NotificationBell />
          <button
            onClick={() => navigate("/profile")}
            className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center"
          >
            <User size={14} className="text-primary-foreground" />
          </button>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
