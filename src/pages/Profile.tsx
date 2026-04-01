import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { User, LogOut, Film, Tv, Clock, Heart, Settings, Shield, Crown, Users } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useIsPremium } from "@/hooks/useSubscription";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const Profile = () => {
  const navigate = useNavigate();
  const { user, profile, isAdmin, signOut, loading } = useAuth();
  const { isPremium } = useIsPremium();

  // Check if user is an affiliate
  const { data: affiliate } = useQuery({
    queryKey: ["my-affiliate-check", user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data } = await supabase.from("affiliates").select("id").eq("user_id", user.id).eq("is_active", true).maybeSingle();
      return data;
    },
    enabled: !!user,
  });

  const handleLogout = async () => {
    await signOut();
    navigate("/auth");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center">
          <User size={48} className="mx-auto text-muted-foreground mb-4" />
          <h2 className="font-display font-bold text-xl mb-2">Not Signed In</h2>
          <p className="text-muted-foreground text-sm mb-6">Sign in to access your profile</p>
          <button onClick={() => navigate("/auth")} className="px-6 py-3 rounded-2xl bg-primary text-primary-foreground font-semibold text-sm glow-primary">
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
    { icon: Heart, label: "Favorites", value: "0" },
  ];

  return (
    <div className="min-h-screen bg-background pt-16 pb-24 md:pb-8 px-4 md:px-12">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-2xl mx-auto">
        <div className="glass rounded-3xl p-6 border border-border/30 mb-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center">
              <User size={28} className="text-primary-foreground" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-display font-bold text-xl">{profile?.display_name || user.email}</h1>
                {isAdmin && <span className="px-2 py-0.5 rounded-md bg-primary/20 text-primary text-[10px] font-bold">ADMIN</span>}
                {isPremium && <span className="px-2 py-0.5 rounded-md bg-yellow-500/20 text-yellow-400 text-[10px] font-bold">PREMIUM</span>}
              </div>
              <p className="text-muted-foreground text-sm">{user.email}</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-6">
          {stats.map(({ icon: Icon, label, value }) => (
            <div key={label} className="glass rounded-2xl p-4 border border-border/30 text-center">
              <Icon size={20} className="mx-auto text-primary mb-2" />
              <p className="font-display font-bold text-lg">{value}</p>
              <p className="text-muted-foreground text-xs">{label}</p>
            </div>
          ))}
        </div>

        <div className="space-y-2">
          {!isPremium && (
            <button
              onClick={() => navigate("/premium")}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl glass border border-yellow-500/30 hover:bg-yellow-500/10 transition-colors text-left"
            >
              <Crown size={18} className="text-yellow-500" />
              <span className="text-sm font-medium text-yellow-400">Upgrade to Premium</span>
            </button>
          )}
          {isAdmin && (
            <button onClick={() => navigate("/admin")} className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl glass border border-primary/30 hover:bg-primary/10 transition-colors text-left">
              <Shield size={18} className="text-primary" />
              <span className="text-sm font-medium text-primary">Admin Dashboard</span>
            </button>
          )}
          {affiliate && (
            <button onClick={() => navigate("/affiliates")} className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl glass border border-green-500/30 hover:bg-green-500/10 transition-colors text-left">
              <Users size={18} className="text-green-400" />
              <span className="text-sm font-medium text-green-400">Affiliate Dashboard</span>
            </button>
          )}
          <button onClick={() => navigate("/collections")} className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl glass border border-border/30 hover:bg-secondary/50 transition-colors text-left">
            <Heart size={18} className="text-primary" />
            <span className="text-sm font-medium">My Collections</span>
          </button>
          <button onClick={() => navigate("/downloads")} className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl glass border border-border/30 hover:bg-secondary/50 transition-colors text-left">
            <Film size={18} className="text-muted-foreground" />
            <span className="text-sm font-medium">Downloads</span>
          </button>
          <button onClick={() => {}} className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl glass border border-border/30 hover:bg-secondary/50 transition-colors text-left">
            <Settings size={18} className="text-muted-foreground" />
            <span className="text-sm font-medium">Settings</span>
          </button>
          <button onClick={handleLogout} className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl glass border border-border/30 hover:bg-destructive/10 transition-colors text-left">
            <LogOut size={18} className="text-destructive" />
            <span className="text-sm font-medium text-destructive">Sign Out</span>
          </button>
        </div>
      </motion.div>
    </div>
  );
};

export default Profile;
