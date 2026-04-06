import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus, Trash2, GripVertical, ArrowUp, ArrowDown, Play, Power, PowerOff, Pencil, Copy, Info } from "lucide-react";

interface PlaybackSource {
  id: string;
  name: string;
  url_template: string;
  source_type: "embed" | "direct" | "api";
  is_enabled: boolean;
  priority: number;
}

const SOURCE_TYPE_INFO: Record<string, { label: string; desc: string; example: string }> = {
  api: {
    label: "API Source",
    desc: "Calls a backend service (Telegram Bridge, Jellyfin) to search and resolve a direct video stream URL. The video then plays natively in the browser player with full controls, PiP, download, and resume support.",
    example: "api://telegram-bridge/{tmdb_id}  →  Calls Cinode Telegram Bridge API which returns a direct MP4 stream URL.",
  },
  direct: {
    label: "Direct Video",
    desc: "A direct video file URL (MP4, MKV, M3U8). Plays natively in the browser player with full controls. Supports PiP, download, and resume. This is what Admin Overrides use — you set a custom video URL for a specific movie.",
    example: "db://movie_overrides/{tmdb_id}  →  Looks up admin-set custom URL from the database for that TMDB ID.",
  },
  embed: {
    label: "Embed (iframe)",
    desc: "Loads a third-party player page inside an iframe. The video plays in the provider's own player. Limited control — no PiP, no download, no resume tracking. Used as fallback when no direct source is available.",
    example: "https://vidsrc.cc/v2/embed/movie/{tmdb_id}  →  Loads VidSrc player page with the movie.",
  },
};

const AdminPlaybackSources = () => {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", url_template: "", source_type: "embed" as string });
  const [expandedInfo, setExpandedInfo] = useState<string | null>(null);

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
    const clone: PlaybackSource = { ...source, id: `${source.id}-${Date.now()}`, name: `${source.name} Copy`, priority: source.priority - 1 };
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

  const typeInfo = SOURCE_TYPE_INFO[form.source_type] || SOURCE_TYPE_INFO.embed;

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-lg font-bold flex items-center gap-2"><Play size={20} /> Playback Sources</h2>
          <p className="text-xs text-muted-foreground mt-1">Sources are tried <strong>top-to-bottom</strong>. The first enabled source that returns a playable video wins. Drag to reorder fallback priority.</p>
        </div>
        <button onClick={() => { setShowForm(true); setEditingId(null); setForm({ name: "", url_template: "", source_type: "embed" }); }} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium">
          <Plus size={16} /> Add Source
        </button>
      </div>

      {/* Legend */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        {Object.entries(SOURCE_TYPE_INFO).map(([key, val]) => (
          <div key={key} className="bg-secondary/30 border border-border/20 rounded-xl p-3 text-xs">
            <span className="font-bold text-foreground">{val.label}</span>
            <p className="text-muted-foreground mt-1">{val.desc}</p>
          </div>
        ))}
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
          <div className="bg-secondary/20 rounded-xl p-3 text-xs text-muted-foreground">
            <span className="font-semibold text-foreground">{typeInfo.label}:</span> {typeInfo.desc}
            <p className="mt-1 font-mono text-[10px] text-muted-foreground/70">Example: {typeInfo.example}</p>
          </div>
          <div className="flex gap-2 justify-end">
            <button onClick={() => { setShowForm(false); setEditingId(null); setForm({ name: "", url_template: "", source_type: "embed" }); }} className="px-4 py-2 rounded-xl text-sm text-muted-foreground">Cancel</button>
            <button onClick={addSource} className="px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium">{editingId ? "Save Changes" : "Add"}</button>
          </div>
        </div>
      )}

      <div className="space-y-2">
        {sorted.map((s, i) => (
          <div key={s.id} className={`glass rounded-xl p-3 border flex items-center gap-3 ${s.is_enabled ? "border-border/30" : "border-border/30 opacity-50"}`}>
            <div className="flex flex-col items-center gap-0.5 text-muted-foreground">
              <span className="text-[10px] font-bold text-primary">#{i + 1}</span>
              <GripVertical size={14} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-medium">{s.name}</span>
                <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase ${
                  s.source_type === "api" ? "bg-primary/20 text-primary" :
                  s.source_type === "direct" ? "bg-green-500/20 text-green-400" :
                  "bg-secondary text-muted-foreground"
                }`}>{s.source_type}</span>
              </div>
              <p className="text-xs text-muted-foreground truncate">{s.url_template}</p>
              {expandedInfo === s.id && (
                <p className="text-xs text-muted-foreground/70 mt-1">{SOURCE_TYPE_INFO[s.source_type]?.desc}</p>
              )}
            </div>
            <div className="flex items-center gap-1">
              <button onClick={() => moveSource(s.id, "up")} disabled={i === 0} className="p-1.5 rounded hover:bg-secondary/50 disabled:opacity-20"><ArrowUp size={12} /></button>
              <button onClick={() => moveSource(s.id, "down")} disabled={i === sorted.length - 1} className="p-1.5 rounded hover:bg-secondary/50 disabled:opacity-20"><ArrowDown size={12} /></button>
              <button onClick={() => setExpandedInfo(expandedInfo === s.id ? null : s.id)} className="p-1.5 rounded hover:bg-secondary/50"><Info size={13} /></button>
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
