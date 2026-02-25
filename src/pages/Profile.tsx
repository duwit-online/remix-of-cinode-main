import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { User, LogOut, Film, Tv, Clock, Heart, Settings } from "lucide-react";

const Profile = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const stored = localStorage.getItem("cinode_user");
    if (stored) {
      setUser(JSON.parse(stored));
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("cinode_user");
    navigate("/auth");
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center">
          <User size={48} className="mx-auto text-muted-foreground mb-4" />
          <h2 className="font-display font-bold text-xl mb-2">Not Signed In</h2>
          <p className="text-muted-foreground text-sm mb-6">Sign in to access your profile</p>
          <button
            onClick={() => navigate("/auth")}
            className="px-6 py-3 rounded-2xl bg-primary text-primary-foreground font-semibold text-sm glow-primary"
          >
            Sign In
          </button>
        </motion.div>
      </div>
    );
  }

  const stats = [
    { icon: Film, label: "Movies Watched", value: "0" },
    { icon: Tv, label: "Shows Watched", value: "0" },
    { icon: Clock, label: "Watch Time", value: "0h" },
    { icon: Heart, label: "Favorites", value: (user.watchlist?.length || 0).toString() },
  ];

  return (
    <div className="min-h-screen bg-background pt-16 pb-24 md:pb-8 px-4 md:px-12">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-2xl mx-auto">
        {/* Profile Header */}
        <div className="glass rounded-3xl p-6 border border-border/30 mb-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center">
              <User size={28} className="text-primary-foreground" />
            </div>
            <div>
              <h1 className="font-display font-bold text-xl">{user.name}</h1>
              <p className="text-muted-foreground text-sm">{user.email}</p>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          {stats.map(({ icon: Icon, label, value }) => (
            <div key={label} className="glass rounded-2xl p-4 border border-border/30 text-center">
              <Icon size={20} className="mx-auto text-primary mb-2" />
              <p className="font-display font-bold text-lg">{value}</p>
              <p className="text-muted-foreground text-xs">{label}</p>
            </div>
          ))}
        </div>

        {/* Actions */}
        <div className="space-y-2">
          <button
            onClick={() => navigate("/collections")}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl glass border border-border/30 hover:bg-secondary/50 transition-colors text-left"
          >
            <Heart size={18} className="text-primary" />
            <span className="text-sm font-medium">My Collections</span>
          </button>
          <button
            onClick={() => {}}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl glass border border-border/30 hover:bg-secondary/50 transition-colors text-left"
          >
            <Settings size={18} className="text-muted-foreground" />
            <span className="text-sm font-medium">Settings</span>
          </button>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl glass border border-border/30 hover:bg-destructive/10 transition-colors text-left"
          >
            <LogOut size={18} className="text-destructive" />
            <span className="text-sm font-medium text-destructive">Sign Out</span>
          </button>
        </div>
      </motion.div>
    </div>
  );
};

export default Profile;
