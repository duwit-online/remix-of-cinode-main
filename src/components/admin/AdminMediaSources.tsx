import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Plus, Trash2, Search, Play, Edit2, X, Check } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "@/hooks/use-toast";

const AdminMediaSources = () => {
  const { user } = useAuth();
  const [sources, setSources] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [searching, setSearching] = useState(false);
  const [testUrl, setTestUrl] = useState<string | null>(null);
  const [editId, setEditId] = useState<string | null>(null);
  const [editUrl, setEditUrl] = useState("");
  const [form, setForm] = useState({
    tmdb_id: "", media_type: "movie", season: "", episode: "", title: "", stream_url: "",
  });

  useEffect(() => { fetchSources(); }, []);

  const fetchSources = async () => {
    const { data } = await supabase
      .from("media_sources")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100);
    setSources((data as any[]) || []);
  };

  const handleAdd = async () => {
    if (!form.tmdb_id || !form.stream_url) return;
    const { error } = await supabase.from("media_sources").insert({
      tmdb_id: parseInt(form.tmdb_id),
      media_type: form.media_type,
      season: form.season ? parseInt(form.season) : null,
      episode: form.episode ? parseInt(form.episode) : null,
      title: form.title || null,
      stream_url: form.stream_url,
      source: "manual",
      created_by: user?.id,
    } as any);
    if (!error) {
      toast({ title: "Source added" });
      setShowForm(false);
      setForm({ tmdb_id: "", media_type: "movie", season: "", episode: "", title: "", stream_url: "" });
      fetchSources();
    } else {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const triggerSearch = async () => {
    if (!form.tmdb_id) return;
    setSearching(true);
    try {
      const { data, error } = await supabase.functions.invoke("telegram-bridge", {
        body: {
          tmdb_id: parseInt(form.tmdb_id),
          media_type: form.media_type,
          season: form.season ? parseInt(form.season) : undefined,
          episode: form.episode ? parseInt(form.episode) : undefined,
          title: form.title,
        },
      });
      if (data?.status === "success") {
        toast({ title: "Stream found!", description: data.file_name || data.stream_url });
        setForm({ ...form, stream_url: data.stream_url });
        fetchSources();
      } else {
        toast({ title: "Not found", description: "No stream found on Cinode Bridge", variant: "destructive" });
      }
    } catch {
      toast({ title: "Bridge error", variant: "destructive" });
    }
    setSearching(false);
  };

  const handleDelete = async (id: string) => {
    await supabase.from("media_sources").delete().eq("id", id);
    fetchSources();
  };

  const handleSaveEdit = async (id: string) => {
    if (!editUrl) return;
    await supabase.from("media_sources").update({ stream_url: editUrl } as any).eq("id", id);
    setEditId(null);
    fetchSources();
    toast({ title: "Updated" });
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-muted-foreground">Manage cached streams from Telegram Bridge & manual sources.</p>
        <button onClick={() => setShowForm(true)} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium">
          <Plus size={16} /> Add Source
        </button>
      </div>

      {showForm && (
        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="glass rounded-2xl p-5 border border-primary/30 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">TMDB ID *</label>
              <input value={form.tmdb_id} onChange={(e) => setForm({ ...form, tmdb_id: e.target.value })} placeholder="550" className="w-full bg-secondary/50 border border-border/30 rounded-xl px-3 py-2 text-sm outline-none focus:border-primary/50" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Type</label>
              <select value={form.media_type} onChange={(e) => setForm({ ...form, media_type: e.target.value })} className="w-full bg-secondary/50 border border-border/30 rounded-xl px-3 py-2 text-sm outline-none">
                <option value="movie">Movie</option>
                <option value="tv">TV Show</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Title</label>
              <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Fight Club" className="w-full bg-secondary/50 border border-border/30 rounded-xl px-3 py-2 text-sm outline-none focus:border-primary/50" />
            </div>
            <div className="flex gap-2">
              <div className="flex-1">
                <label className="text-xs text-muted-foreground mb-1 block">Season</label>
                <input value={form.season} onChange={(e) => setForm({ ...form, season: e.target.value })} placeholder="1" className="w-full bg-secondary/50 border border-border/30 rounded-xl px-3 py-2 text-sm outline-none focus:border-primary/50" />
              </div>
              <div className="flex-1">
                <label className="text-xs text-muted-foreground mb-1 block">Episode</label>
                <input value={form.episode} onChange={(e) => setForm({ ...form, episode: e.target.value })} placeholder="1" className="w-full bg-secondary/50 border border-border/30 rounded-xl px-3 py-2 text-sm outline-none focus:border-primary/50" />
              </div>
            </div>
            <div className="sm:col-span-2">
              <label className="text-xs text-muted-foreground mb-1 block">Stream URL</label>
              <input value={form.stream_url} onChange={(e) => setForm({ ...form, stream_url: e.target.value })} placeholder="https://..." className="w-full bg-secondary/50 border border-border/30 rounded-xl px-3 py-2 text-sm outline-none focus:border-primary/50" />
            </div>
          </div>
          <div className="flex gap-2 justify-end">
            <button onClick={triggerSearch} disabled={searching || !form.tmdb_id} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-accent/20 text-accent text-sm font-medium disabled:opacity-50">
              <Search size={14} /> {searching ? "Searching..." : "Trigger Search"}
            </button>
            <button onClick={() => setShowForm(false)} className="px-4 py-2 rounded-xl text-sm text-muted-foreground hover:bg-secondary/50">Cancel</button>
            <button onClick={handleAdd} disabled={!form.tmdb_id || !form.stream_url} className="px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium disabled:opacity-50">Save</button>
          </div>
        </motion.div>
      )}

      {/* Test Stream Modal */}
      <AnimatePresence>
        {testUrl && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center p-4" onClick={() => setTestUrl(null)}>
            <div className="w-full max-w-3xl" onClick={(e) => e.stopPropagation()}>
              <div className="flex justify-end mb-2">
                <button onClick={() => setTestUrl(null)} className="p-2 rounded-full bg-foreground/10 hover:bg-foreground/20"><X size={18} /></button>
              </div>
              <video src={testUrl} controls autoPlay className="w-full rounded-xl bg-black" />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="space-y-2">
        {sources.length === 0 ? (
          <div className="glass rounded-2xl p-8 border border-border/30 text-center">
            <Search size={32} className="mx-auto text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">No media sources cached yet.</p>
          </div>
        ) : (
          sources.map((s) => (
            <div key={s.id} className="glass rounded-2xl p-4 border border-border/30 flex items-start gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <span className="px-2 py-0.5 rounded-md bg-primary/20 text-primary text-[10px] font-bold uppercase">{s.source}</span>
                  <span className="text-xs text-muted-foreground">{s.media_type} • TMDB:{s.tmdb_id}</span>
                  {s.season && <span className="text-xs text-muted-foreground">S{s.season}E{s.episode}</span>}
                </div>
                <p className="text-sm font-medium">{s.title || "Untitled"}</p>
                {editId === s.id ? (
                  <div className="flex items-center gap-2 mt-1">
                    <input value={editUrl} onChange={(e) => setEditUrl(e.target.value)} className="flex-1 bg-secondary/50 border border-border/30 rounded-lg px-2 py-1 text-xs outline-none" />
                    <button onClick={() => handleSaveEdit(s.id)} className="p-1 text-primary"><Check size={14} /></button>
                    <button onClick={() => setEditId(null)} className="p-1 text-muted-foreground"><X size={14} /></button>
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground truncate">{s.stream_url}</p>
                )}
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
                <button onClick={() => setTestUrl(s.stream_url)} className="p-2 rounded-full hover:bg-secondary/50 text-primary" title="Test Stream"><Play size={14} /></button>
                <button onClick={() => { setEditId(s.id); setEditUrl(s.stream_url); }} className="p-2 rounded-full hover:bg-secondary/50 text-muted-foreground" title="Edit"><Edit2 size={14} /></button>
                <button onClick={() => handleDelete(s.id)} className="p-2 rounded-full hover:bg-destructive/10 text-destructive" title="Delete"><Trash2 size={14} /></button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default AdminMediaSources;
