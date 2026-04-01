import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Plus, Trash2, Film, Edit2, Copy, ToggleLeft, ToggleRight, Play, X } from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "@/hooks/use-toast";

interface MovieOverride {
  id: string;
  tmdb_id: number;
  media_type: string;
  custom_url: string | null;
  custom_title: string | null;
  season: number | null;
  episode: number | null;
}

const AdminContent = () => {
  const { user } = useAuth();
  const [overrides, setOverrides] = useState<MovieOverride[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [testUrl, setTestUrl] = useState<string | null>(null);
  const [form, setForm] = useState({ tmdb_id: "", media_type: "movie", custom_url: "", custom_title: "", season: "", episode: "" });
  const [saving, setSaving] = useState(false);

  useEffect(() => { fetchOverrides(); }, []);

  const fetchOverrides = async () => {
    const { data } = await supabase.from("movie_overrides").select("*").order("created_at", { ascending: false });
    if (data) setOverrides(data as MovieOverride[]);
  };

  const resetForm = () => {
    setForm({ tmdb_id: "", media_type: "movie", custom_url: "", custom_title: "", season: "", episode: "" });
    setEditingId(null);
  };

  const handleSave = async () => {
    if (!form.tmdb_id) return;
    setSaving(true);
    const payload: any = {
      tmdb_id: parseInt(form.tmdb_id),
      media_type: form.media_type,
      custom_url: form.custom_url || null,
      custom_title: form.custom_title || null,
      season: form.season ? parseInt(form.season) : null,
      episode: form.episode ? parseInt(form.episode) : null,
      created_by: user?.id,
    };

    let error;
    if (editingId) {
      ({ error } = await supabase.from("movie_overrides").update(payload).eq("id", editingId));
    } else {
      ({ error } = await supabase.from("movie_overrides").insert(payload));
    }

    if (!error) {
      toast({ title: editingId ? "Override updated" : "Override saved" });
      setShowForm(false);
      resetForm();
      fetchOverrides();
    } else {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
    setSaving(false);
  };

  const startEdit = (o: MovieOverride) => {
    setEditingId(o.id);
    setForm({
      tmdb_id: String(o.tmdb_id),
      media_type: o.media_type,
      custom_url: o.custom_url || "",
      custom_title: o.custom_title || "",
      season: o.season ? String(o.season) : "",
      episode: o.episode ? String(o.episode) : "",
    });
    setShowForm(true);
  };

  const duplicateOverride = async (o: MovieOverride) => {
    await supabase.from("movie_overrides").insert({
      tmdb_id: o.tmdb_id,
      media_type: o.media_type,
      custom_url: o.custom_url,
      custom_title: o.custom_title ? `${o.custom_title} (Copy)` : null,
      season: o.season,
      episode: o.episode,
      created_by: user?.id,
    } as any);
    toast({ title: "Override duplicated" });
    fetchOverrides();
  };

  const handleDelete = async (id: string) => {
    await supabase.from("movie_overrides").delete().eq("id", id);
    fetchOverrides();
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-muted-foreground">Override streaming URLs for any movie/TV show.</p>
        <button onClick={() => { resetForm(); setShowForm(true); }} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium">
          <Plus size={16} /> Add
        </button>
      </div>

      {showForm && (
        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="glass rounded-2xl p-5 border border-primary/30 space-y-3">
          <h3 className="font-display font-bold text-sm">{editingId ? "Edit Override" : "New Override"}</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">TMDB ID *</label>
              <input type="number" value={form.tmdb_id} onChange={(e) => setForm({ ...form, tmdb_id: e.target.value })} placeholder="385687" className="w-full bg-secondary/50 border border-border/30 rounded-xl px-3 py-2 text-sm outline-none focus:border-primary/50" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Type</label>
              <select value={form.media_type} onChange={(e) => setForm({ ...form, media_type: e.target.value })} className="w-full bg-secondary/50 border border-border/30 rounded-xl px-3 py-2 text-sm outline-none">
                <option value="movie">Movie</option>
                <option value="tv">TV Show</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Custom Title</label>
              <input type="text" value={form.custom_title} onChange={(e) => setForm({ ...form, custom_title: e.target.value })} placeholder="Optional" className="w-full bg-secondary/50 border border-border/30 rounded-xl px-3 py-2 text-sm outline-none focus:border-primary/50" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Stream URL (any video/embed link)</label>
              <input type="text" value={form.custom_url} onChange={(e) => setForm({ ...form, custom_url: e.target.value })} placeholder="http://... or https://..." className="w-full bg-secondary/50 border border-border/30 rounded-xl px-3 py-2 text-sm outline-none focus:border-primary/50" />
            </div>
            {form.media_type === "tv" && (
              <>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Season</label>
                  <input type="number" value={form.season} onChange={(e) => setForm({ ...form, season: e.target.value })} className="w-full bg-secondary/50 border border-border/30 rounded-xl px-3 py-2 text-sm outline-none focus:border-primary/50" />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Episode</label>
                  <input type="number" value={form.episode} onChange={(e) => setForm({ ...form, episode: e.target.value })} className="w-full bg-secondary/50 border border-border/30 rounded-xl px-3 py-2 text-sm outline-none focus:border-primary/50" />
                </div>
              </>
            )}
          </div>
          <div className="flex gap-2 justify-end">
            <button onClick={() => { setShowForm(false); resetForm(); }} className="px-4 py-2 rounded-xl text-sm text-muted-foreground hover:bg-secondary/50">Cancel</button>
            <button onClick={handleSave} disabled={saving || !form.tmdb_id} className="px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium disabled:opacity-50">
              {saving ? "Saving..." : editingId ? "Update" : "Save"}
            </button>
          </div>
        </motion.div>
      )}

      <div className="space-y-2">
        {overrides.length === 0 ? (
          <div className="glass rounded-2xl p-8 border border-border/30 text-center">
            <Film size={32} className="mx-auto text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">No overrides yet.</p>
          </div>
        ) : (
          overrides.map((o) => (
            <div key={o.id} className="glass rounded-2xl p-4 border border-border/30 flex items-center justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="px-2 py-0.5 rounded-md bg-primary/20 text-primary text-[10px] font-bold uppercase">{o.media_type}</span>
                  <span className="text-xs text-muted-foreground">TMDB: {o.tmdb_id}</span>
                  {o.season && <span className="text-xs text-muted-foreground">S{o.season}E{o.episode}</span>}
                </div>
                {o.custom_title && <p className="text-sm font-medium truncate">{o.custom_title}</p>}
                <p className="text-xs text-muted-foreground truncate">{o.custom_url || "No URL"}</p>
              </div>
              <div className="flex items-center gap-1">
                {o.custom_url && (
                  <button onClick={() => setTestUrl(o.custom_url)} className="p-2 rounded-full hover:bg-secondary/50 text-muted-foreground" title="Test Stream"><Play size={14} /></button>
                )}
                <button onClick={() => startEdit(o)} className="p-2 rounded-full hover:bg-secondary/50 text-muted-foreground" title="Edit"><Edit2 size={14} /></button>
                <button onClick={() => duplicateOverride(o)} className="p-2 rounded-full hover:bg-secondary/50 text-muted-foreground" title="Duplicate"><Copy size={14} /></button>
                <button onClick={() => handleDelete(o.id)} className="p-2 rounded-full hover:bg-destructive/10 text-destructive"><Trash2 size={16} /></button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Test Stream Modal */}
      {testUrl && (
        <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4" onClick={() => setTestUrl(null)}>
          <div className="w-full max-w-3xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm text-muted-foreground truncate">{testUrl}</span>
              <button onClick={() => setTestUrl(null)} className="p-2 text-muted-foreground"><X size={18} /></button>
            </div>
            <div className="aspect-video bg-black rounded-xl overflow-hidden">
              {/\.(mp4|mkv|webm|m3u8|avi|mov)(\?|$)/i.test(testUrl) || /\/(stream|play|video)\b/i.test(testUrl) ? (
                <video src={testUrl} controls autoPlay className="w-full h-full" crossOrigin="anonymous" />
              ) : (
                <iframe src={testUrl} className="w-full h-full" allowFullScreen sandbox="allow-forms allow-pointer-lock allow-same-origin allow-scripts allow-top-navigation" />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminContent;
