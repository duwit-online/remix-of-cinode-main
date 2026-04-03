import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus, Trash2, GripVertical, ArrowUp, ArrowDown, Play, Power, PowerOff, Pencil, Copy } from "lucide-react";

interface PlaybackSource {
  id: string;
  name: string;
  url_template: string;
  source_type: "embed" | "direct" | "api";
  is_enabled: boolean;
  priority: number;
}

const AdminPlaybackSources = () => {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", url_template: "", source_type: "embed" as string });

  const getDefaults = (): PlaybackSource[] => [
    { id: "telegram", name: "Telegram Bridge", url_template: "api://telegram-bridge/{tmdb_id}", source_type: "api", is_enabled: true, priority: 100 },
    { id: "jellyfin", name: "Jellyfin Servers", url_template: "api://jellyfin/{tmdb_id}", source_type: "api", is_enabled: true, priority: 90 },
    { id: "override", name: "Admin Override", url_template: "db://movie_overrides/{tmdb_id}", source_type: "direct", is_enabled: true, priority: 80 },
    { id: "vidsrc-cc", name: "VidSrc.cc", url_template: "https://vidsrc.cc/v2/embed/{type}/{tmdb_id}", source_type: "embed", is_enabled: true, priority: 70 },
    { id: "vidsrc-icu", name: "VidSrc.icu", url_template: "https://vidsrc.icu/embed/{type}/{tmdb_id}", source_type: "embed", is_enabled: true, priority: 60 },
    { id: "embed-su", name: "Embed.su", url_template: "https://embed.su/embed/{type}/{tmdb_id}", source_type: "embed", is_enabled: true, priority: 50 },
    { id: "vsembed", name: "VSEmbed", url_template: "https://vsembed.ru/embed/{type}/{imdb_id}", source_type: "embed", is_enabled: true, priority: 40 },
  ];

  const { data: sources } = useQuery({
    queryKey: ["admin-playback-sources"],
    queryFn: async () => {
      const { data } = await supabase.from("app_settings").select("*").eq("key", "playback_sources").maybeSingle();
      return ((data?.value as any)?.sources as PlaybackSource[]) || getDefaults();
    },
  });

  const saveSources = async (newSources: PlaybackSource[]) => {
    await supabase.from("app_settings").upsert({
      key: "playback_sources",
      value: { sources: newSources } as any,
      updated_at: new Date().toISOString(),
    }, { onConflict: "key" });
    qc.invalidateQueries({ queryKey: ["admin-playback-sources"] });
  };

  const addSource = async () => {
    if (!form.name || !form.url_template) { toast.error("Name and URL template required"); return; }

    if (editingId) {
      const updated = (sources || []).map((source) =>
        source.id === editingId
          ? { ...source, name: form.name, url_template: form.url_template, source_type: form.source_type as PlaybackSource["source_type"] }
          : source
      );
      await saveSources(updated);
      toast.success("Source updated");
      setEditingId(null);
      setShowForm(false);
      setForm({ name: "", url_template: "", source_type: "embed" });
      return;
    }

    const newSource: PlaybackSource = {
      id: Date.now().toString(),
      name: form.name,
      url_template: form.url_template,
      source_type: form.source_type as any,
      is_enabled: true,
      priority: (sources?.length || 0) > 0 ? Math.min(...(sources || []).map(s => s.priority)) - 10 : 0,
    };
    await saveSources([...(sources || []), newSource]);
    setShowForm(false);
    setForm({ name: "", url_template: "", source_type: "embed" });
    toast.success("Source added");
  };

  const startEdit = (source: PlaybackSource) => {
    setEditingId(source.id);
    setForm({ name: source.name, url_template: source.url_template, source_type: source.source_type });
    setShowForm(true);
  };

  const duplicateSource = async (source: PlaybackSource) => {
    const clone: PlaybackSource = {
      ...source,
      id: `${source.id}-${Date.now()}`,
      name: `${source.name} Copy`,
      priority: source.priority - 1,
    };
    await saveSources([...(sources || []), clone]);
    toast.success("Source duplicated");
  };

  const toggleSource = async (id: string) => {
    const updated = (sources || []).map(s => s.id === id ? { ...s, is_enabled: !s.is_enabled } : s);
    await saveSources(updated);
  };

  const removeSource = async (id: string) => {
    await saveSources((sources || []).filter(s => s.id !== id));
    toast.success("Removed");
  };

  const moveSource = async (id: string, direction: "up" | "down") => {
    const sorted = [...(sources || [])].sort((a, b) => b.priority - a.priority);
    const idx = sorted.findIndex(s => s.id === id);
    if (direction === "up" && idx > 0) {
      const temp = sorted[idx].priority;
      sorted[idx].priority = sorted[idx - 1].priority;
      sorted[idx - 1].priority = temp;
    } else if (direction === "down" && idx < sorted.length - 1) {
      const temp = sorted[idx].priority;
      sorted[idx].priority = sorted[idx + 1].priority;
      sorted[idx + 1].priority = temp;
    }
    await saveSources(sorted);
  };

  const sorted = [...(sources || [])].sort((a, b) => b.priority - a.priority);

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-lg font-bold flex items-center gap-2"><Play size={20} /> Playback Sources</h2>
          <p className="text-xs text-muted-foreground mt-1">Reorder and manage fallback playback sources. Higher priority = tried first.</p>
        </div>
        <button onClick={() => setShowForm(true)} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium">
          <Plus size={16} /> Add Source
        </button>
      </div>

      {showForm && (
        <div className="glass rounded-2xl p-4 border border-primary/30 space-y-3">
          <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Source name" className="w-full bg-secondary/50 border border-border/30 rounded-xl px-4 py-2 text-sm outline-none" />
          <input value={form.url_template} onChange={e => setForm({ ...form, url_template: e.target.value })} placeholder="URL template: https://example.com/embed/{type}/{tmdb_id}" className="w-full bg-secondary/50 border border-border/30 rounded-xl px-4 py-2 text-sm outline-none" />
          <select value={form.source_type} onChange={e => setForm({ ...form, source_type: e.target.value })} className="w-full bg-secondary/50 border border-border/30 rounded-xl px-4 py-2 text-sm outline-none">
            <option value="embed">Embed (iframe)</option>
            <option value="direct">Direct Video</option>
            <option value="api">API Source</option>
          </select>
          <div className="flex gap-2 justify-end">
            <button onClick={() => { setShowForm(false); setEditingId(null); setForm({ name: "", url_template: "", source_type: "embed" }); }} className="px-4 py-2 rounded-xl text-sm text-muted-foreground">Cancel</button>
            <button onClick={addSource} className="px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium">{editingId ? "Save Changes" : "Add"}</button>
          </div>
        </div>
      )}

      <div className="space-y-2">
        {sorted.map((s, i) => (
          <div key={s.id} className={`glass rounded-xl p-3 border flex items-center gap-3 ${s.is_enabled ? "border-border/30" : "border-border/30 opacity-50"}`}>
            <GripVertical size={14} className="text-muted-foreground" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">{s.name}</span>
                <span className="px-1.5 py-0.5 rounded bg-secondary text-[10px] font-bold uppercase text-muted-foreground">{s.source_type}</span>
                <span className="text-[10px] text-muted-foreground">P:{s.priority}</span>
              </div>
              <p className="text-xs text-muted-foreground truncate">{s.url_template}</p>
            </div>
            <div className="flex items-center gap-1">
              <button onClick={() => moveSource(s.id, "up")} disabled={i === 0} className="p-1.5 rounded hover:bg-secondary/50 disabled:opacity-20"><ArrowUp size={12} /></button>
              <button onClick={() => moveSource(s.id, "down")} disabled={i === sorted.length - 1} className="p-1.5 rounded hover:bg-secondary/50 disabled:opacity-20"><ArrowDown size={12} /></button>
              <button onClick={() => startEdit(s)} className="p-1.5 rounded hover:bg-secondary/50"><Pencil size={13} /></button>
              <button onClick={() => duplicateSource(s)} className="p-1.5 rounded hover:bg-secondary/50"><Copy size={13} /></button>
              <button onClick={() => toggleSource(s.id)} className={`p-1.5 rounded ${s.is_enabled ? "text-green-500" : "text-muted-foreground"}`}>
                {s.is_enabled ? <Power size={14} /> : <PowerOff size={14} />}
              </button>
              <button onClick={() => removeSource(s.id)} className="p-1.5 rounded hover:bg-destructive/10 text-destructive"><Trash2 size={14} /></button>
            </div>
          </div>
        ))}
      </div>

    </div>
  );
};

export default AdminPlaybackSources;
