import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Shield, Users, Film, Search, Plus, Trash2, Edit, ArrowLeft, Upload } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

interface MovieOverride {
  id: string;
  tmdb_id: number;
  media_type: string;
  custom_url: string | null;
  custom_title: string | null;
  season: number | null;
  episode: number | null;
  created_at: string;
}

interface UserWithRole {
  user_id: string;
  email: string;
  display_name: string;
  role: string | null;
}

const Admin = () => {
  const { user, isAdmin, loading } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<"overrides" | "users">("overrides");
  const [overrides, setOverrides] = useState<MovieOverride[]>([]);
  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [showAddOverride, setShowAddOverride] = useState(false);

  // Override form state
  const [formTmdbId, setFormTmdbId] = useState("");
  const [formMediaType, setFormMediaType] = useState<"movie" | "tv">("movie");
  const [formCustomUrl, setFormCustomUrl] = useState("");
  const [formCustomTitle, setFormCustomTitle] = useState("");
  const [formSeason, setFormSeason] = useState("");
  const [formEpisode, setFormEpisode] = useState("");
  const [formFile, setFormFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!loading && (!user || !isAdmin)) {
      navigate("/");
    }
  }, [user, isAdmin, loading, navigate]);

  useEffect(() => {
    if (isAdmin) {
      fetchOverrides();
      fetchUsers();
    }
  }, [isAdmin]);

  const fetchOverrides = async () => {
    const { data } = await supabase
      .from("movie_overrides")
      .select("*")
      .order("created_at", { ascending: false });
    if (data) setOverrides(data as MovieOverride[]);
  };

  const fetchUsers = async () => {
    const { data: profiles } = await supabase.from("profiles").select("*");
    const { data: roles } = await supabase.from("user_roles").select("*");

    if (profiles) {
      const usersWithRoles = profiles.map((p: any) => ({
        user_id: p.user_id,
        email: p.email || "N/A",
        display_name: p.display_name || "Unknown",
        role: roles?.find((r: any) => r.user_id === p.user_id)?.role || "user",
      }));
      setUsers(usersWithRoles);
    }
  };

  const handleAddOverride = async () => {
    if (!formTmdbId) return;
    setSaving(true);

    let finalUrl = formCustomUrl;

    // If file selected, upload to storage (placeholder - files would need a bucket)
    if (formFile) {
      // For local file, create an object URL reference
      finalUrl = URL.createObjectURL(formFile);
    }

    const override: any = {
      tmdb_id: parseInt(formTmdbId),
      media_type: formMediaType,
      custom_url: finalUrl || null,
      custom_title: formCustomTitle || null,
      season: formSeason ? parseInt(formSeason) : null,
      episode: formEpisode ? parseInt(formEpisode) : null,
      created_by: user?.id,
    };

    const { error } = await supabase.from("movie_overrides").upsert(override, {
      onConflict: "tmdb_id,media_type,season,episode",
    });

    if (!error) {
      setShowAddOverride(false);
      resetForm();
      fetchOverrides();
    }
    setSaving(false);
  };

  const handleDeleteOverride = async (id: string) => {
    await supabase.from("movie_overrides").delete().eq("id", id);
    fetchOverrides();
  };

  const handleToggleAdmin = async (userId: string, currentRole: string) => {
    if (currentRole === "admin") {
      await supabase.from("user_roles").delete().eq("user_id", userId).eq("role", "admin");
    } else {
      await supabase.from("user_roles").upsert(
        { user_id: userId, role: "admin" as any },
        { onConflict: "user_id,role" }
      );
    }
    fetchUsers();
  };

  const resetForm = () => {
    setFormTmdbId("");
    setFormMediaType("movie");
    setFormCustomUrl("");
    setFormCustomTitle("");
    setFormSeason("");
    setFormEpisode("");
    setFormFile(null);
  };

  if (loading || !isAdmin) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pt-16 pb-24 md:pb-8 px-4 md:px-8">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => navigate("/profile")} className="p-2 rounded-full hover:bg-secondary/50">
            <ArrowLeft size={20} />
          </button>
          <Shield size={24} className="text-primary" />
          <h1 className="font-display font-bold text-2xl">Admin Dashboard</h1>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setActiveTab("overrides")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
              activeTab === "overrides" ? "bg-primary text-primary-foreground" : "bg-secondary/50 text-muted-foreground hover:bg-secondary"
            }`}
          >
            <Film size={16} /> Movie Overrides
          </button>
          <button
            onClick={() => setActiveTab("users")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
              activeTab === "users" ? "bg-primary text-primary-foreground" : "bg-secondary/50 text-muted-foreground hover:bg-secondary"
            }`}
          >
            <Users size={16} /> Users
          </button>
        </div>

        {/* Movie Overrides Tab */}
        {activeTab === "overrides" && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <p className="text-sm text-muted-foreground">
                Override any movie/TV show URL with a custom source or local file.
              </p>
              <button
                onClick={() => setShowAddOverride(true)}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium"
              >
                <Plus size={16} /> Add Override
              </button>
            </div>

            {/* Add Override Form */}
            {showAddOverride && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                className="glass rounded-2xl p-5 border border-primary/30 space-y-3"
              >
                <h3 className="font-display font-bold text-sm">New Override</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">TMDB ID *</label>
                    <input
                      type="number"
                      value={formTmdbId}
                      onChange={(e) => setFormTmdbId(e.target.value)}
                      placeholder="e.g. 385687"
                      className="w-full bg-secondary/50 border border-border/30 rounded-xl px-3 py-2 text-sm outline-none focus:border-primary/50"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">Type</label>
                    <select
                      value={formMediaType}
                      onChange={(e) => setFormMediaType(e.target.value as "movie" | "tv")}
                      className="w-full bg-secondary/50 border border-border/30 rounded-xl px-3 py-2 text-sm outline-none"
                    >
                      <option value="movie">Movie</option>
                      <option value="tv">TV Show</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">Custom Title</label>
                    <input
                      type="text"
                      value={formCustomTitle}
                      onChange={(e) => setFormCustomTitle(e.target.value)}
                      placeholder="Override title (optional)"
                      className="w-full bg-secondary/50 border border-border/30 rounded-xl px-3 py-2 text-sm outline-none focus:border-primary/50"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">Custom URL</label>
                    <input
                      type="url"
                      value={formCustomUrl}
                      onChange={(e) => setFormCustomUrl(e.target.value)}
                      placeholder="https://custom-source.com/video"
                      className="w-full bg-secondary/50 border border-border/30 rounded-xl px-3 py-2 text-sm outline-none focus:border-primary/50"
                    />
                  </div>
                  {formMediaType === "tv" && (
                    <>
                      <div>
                        <label className="text-xs text-muted-foreground mb-1 block">Season</label>
                        <input
                          type="number"
                          value={formSeason}
                          onChange={(e) => setFormSeason(e.target.value)}
                          placeholder="1"
                          className="w-full bg-secondary/50 border border-border/30 rounded-xl px-3 py-2 text-sm outline-none focus:border-primary/50"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-muted-foreground mb-1 block">Episode</label>
                        <input
                          type="number"
                          value={formEpisode}
                          onChange={(e) => setFormEpisode(e.target.value)}
                          placeholder="1"
                          className="w-full bg-secondary/50 border border-border/30 rounded-xl px-3 py-2 text-sm outline-none focus:border-primary/50"
                        />
                      </div>
                    </>
                  )}
                </div>

                {/* Local file picker */}
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Or pick a local file</label>
                  <label className="flex items-center gap-2 px-4 py-3 rounded-xl bg-secondary/30 border border-dashed border-border/50 cursor-pointer hover:bg-secondary/50 transition-colors">
                    <Upload size={16} className="text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">
                      {formFile ? formFile.name : "Choose video file..."}
                    </span>
                    <input
                      type="file"
                      accept="video/*"
                      className="hidden"
                      onChange={(e) => setFormFile(e.target.files?.[0] || null)}
                    />
                  </label>
                </div>

                <div className="flex gap-2 justify-end">
                  <button
                    onClick={() => { setShowAddOverride(false); resetForm(); }}
                    className="px-4 py-2 rounded-xl text-sm text-muted-foreground hover:bg-secondary/50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleAddOverride}
                    disabled={saving || !formTmdbId}
                    className="px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium disabled:opacity-50"
                  >
                    {saving ? "Saving..." : "Save Override"}
                  </button>
                </div>
              </motion.div>
            )}

            {/* Overrides List */}
            <div className="space-y-2">
              {overrides.length === 0 ? (
                <div className="glass rounded-2xl p-8 border border-border/30 text-center">
                  <Film size={32} className="mx-auto text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground">No overrides yet. Add one to customize a movie/show URL.</p>
                </div>
              ) : (
                overrides.map((o) => (
                  <div key={o.id} className="glass rounded-2xl p-4 border border-border/30 flex items-center justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="px-2 py-0.5 rounded-md bg-primary/20 text-primary text-[10px] font-bold uppercase">
                          {o.media_type}
                        </span>
                        <span className="text-xs text-muted-foreground">TMDB: {o.tmdb_id}</span>
                        {o.season && <span className="text-xs text-muted-foreground">S{o.season}E{o.episode}</span>}
                      </div>
                      {o.custom_title && <p className="text-sm font-medium truncate">{o.custom_title}</p>}
                      <p className="text-xs text-muted-foreground truncate">{o.custom_url || "No URL set"}</p>
                    </div>
                    <button
                      onClick={() => handleDeleteOverride(o.id)}
                      className="p-2 rounded-full hover:bg-destructive/10 text-destructive transition-colors"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Users Tab */}
        {activeTab === "users" && (
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground mb-4">
              Manage user roles. Toggle admin access for any user.
            </p>
            {users.map((u) => (
              <div key={u.user_id} className="glass rounded-2xl p-4 border border-border/30 flex items-center justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium">{u.display_name}</p>
                    {u.role === "admin" && (
                      <span className="px-2 py-0.5 rounded-md bg-primary/20 text-primary text-[10px] font-bold">ADMIN</span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">{u.email}</p>
                </div>
                <button
                  onClick={() => handleToggleAdmin(u.user_id, u.role || "user")}
                  disabled={u.user_id === user?.id}
                  className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
                    u.role === "admin"
                      ? "bg-destructive/10 text-destructive hover:bg-destructive/20"
                      : "bg-primary/10 text-primary hover:bg-primary/20"
                  } disabled:opacity-30`}
                >
                  {u.role === "admin" ? "Remove Admin" : "Make Admin"}
                </button>
              </div>
            ))}
          </div>
        )}
      </motion.div>
    </div>
  );
};

export default Admin;
