import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Plus, Trash2, Server, Eye, EyeOff, Power, PowerOff } from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "@/hooks/use-toast";

interface StreamingServer {
  id: string;
  name: string;
  server_type: string;
  server_url: string;
  api_key_encrypted: string;
  is_enabled: boolean;
  priority: number;
}

const AdminServers = () => {
  const { user } = useAuth();
  const [servers, setServers] = useState<StreamingServer[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", server_type: "jellyfin", server_url: "", api_key: "", priority: "0" });
  const [saving, setSaving] = useState(false);
  const [visibleKeys, setVisibleKeys] = useState<Set<string>>(new Set());

  useEffect(() => { fetchServers(); }, []);

  const fetchServers = async () => {
    const { data } = await supabase
      .from("streaming_servers" as any)
      .select("*")
      .order("priority", { ascending: false });
    if (data) setServers(data as any);
  };

  const handleAdd = async () => {
    if (!form.name || !form.server_url || !form.api_key) {
      toast({ title: "Missing fields", description: "Name, URL and API Key are required.", variant: "destructive" });
      return;
    }
    setSaving(true);
    const { error } = await supabase.from("streaming_servers" as any).insert({
      name: form.name,
      server_type: form.server_type,
      server_url: form.server_url.replace(/\/$/, ""),
      api_key_encrypted: form.api_key,
      priority: parseInt(form.priority) || 0,
      created_by: user?.id,
    } as any);
    if (!error) {
      toast({ title: "Server added" });
      setShowForm(false);
      setForm({ name: "", server_type: "jellyfin", server_url: "", api_key: "", priority: "0" });
      fetchServers();
    } else {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
    setSaving(false);
  };

  const toggleEnabled = async (id: string, current: boolean) => {
    await supabase.from("streaming_servers" as any).update({ is_enabled: !current } as any).eq("id", id);
    fetchServers();
    toast({ title: !current ? "Server enabled" : "Server disabled" });
  };

  const handleDelete = async (id: string) => {
    await supabase.from("streaming_servers" as any).delete().eq("id", id);
    fetchServers();
    toast({ title: "Server removed" });
  };

  const toggleKeyVisibility = (id: string) => {
    setVisibleKeys((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const maskKey = (key: string) => key.slice(0, 4) + "••••••••" + key.slice(-4);

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <p className="text-sm text-muted-foreground">Manage streaming servers (Jellyfin, Emby, etc.)</p>
          <p className="text-xs text-muted-foreground/60 mt-1">API keys are stored securely and only accessible by admins.</p>
        </div>
        <button onClick={() => setShowForm(true)} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium">
          <Plus size={16} /> Add Server
        </button>
      </div>

      {showForm && (
        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="glass rounded-2xl p-5 border border-primary/30 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Server Name *</label>
              <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="My Jellyfin" className="w-full bg-secondary/50 border border-border/30 rounded-xl px-3 py-2 text-sm outline-none focus:border-primary/50" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Server Type</label>
              <select value={form.server_type} onChange={(e) => setForm({ ...form, server_type: e.target.value })} className="w-full bg-secondary/50 border border-border/30 rounded-xl px-3 py-2 text-sm outline-none">
                <option value="jellyfin">Jellyfin</option>
                <option value="emby">Emby</option>
                <option value="plex">Plex</option>
                <option value="custom">Custom</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Server URL *</label>
              <input type="url" value={form.server_url} onChange={(e) => setForm({ ...form, server_url: e.target.value })} placeholder="http://163.245.223.36:8096" className="w-full bg-secondary/50 border border-border/30 rounded-xl px-3 py-2 text-sm outline-none focus:border-primary/50" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">API Key *</label>
              <input type="password" value={form.api_key} onChange={(e) => setForm({ ...form, api_key: e.target.value })} placeholder="Your API key" className="w-full bg-secondary/50 border border-border/30 rounded-xl px-3 py-2 text-sm outline-none focus:border-primary/50" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Priority (higher = first)</label>
              <input type="number" value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })} className="w-full bg-secondary/50 border border-border/30 rounded-xl px-3 py-2 text-sm outline-none focus:border-primary/50" />
            </div>
          </div>
          <div className="flex gap-2 justify-end">
            <button onClick={() => setShowForm(false)} className="px-4 py-2 rounded-xl text-sm text-muted-foreground hover:bg-secondary/50">Cancel</button>
            <button onClick={handleAdd} disabled={saving} className="px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium disabled:opacity-50">
              {saving ? "Saving..." : "Save"}
            </button>
          </div>
        </motion.div>
      )}

      <div className="space-y-2">
        {servers.length === 0 ? (
          <div className="glass rounded-2xl p-8 border border-border/30 text-center">
            <Server size={32} className="mx-auto text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">No streaming servers configured.</p>
          </div>
        ) : (
          servers.map((s) => (
            <div key={s.id} className={`glass rounded-2xl p-4 border transition-colors ${s.is_enabled ? "border-primary/30" : "border-border/30 opacity-60"}`}>
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`w-2 h-2 rounded-full ${s.is_enabled ? "bg-green-500" : "bg-muted-foreground"}`} />
                    <span className="text-sm font-medium">{s.name}</span>
                    <span className="px-2 py-0.5 rounded-md bg-secondary text-[10px] font-bold uppercase text-muted-foreground">{s.server_type}</span>
                    <span className="text-[10px] text-muted-foreground">P:{s.priority}</span>
                  </div>
                  <p className="text-xs text-muted-foreground truncate">{s.server_url}</p>
                  <div className="flex items-center gap-1 mt-1">
                    <p className="text-xs text-muted-foreground font-mono">
                      {visibleKeys.has(s.id) ? s.api_key_encrypted : maskKey(s.api_key_encrypted)}
                    </p>
                    <button onClick={() => toggleKeyVisibility(s.id)} className="p-1 hover:bg-secondary/50 rounded">
                      {visibleKeys.has(s.id) ? <EyeOff size={12} /> : <Eye size={12} />}
                    </button>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={() => toggleEnabled(s.id, s.is_enabled)} className={`p-2 rounded-full transition-colors ${s.is_enabled ? "text-green-500 hover:bg-green-500/10" : "text-muted-foreground hover:bg-secondary/50"}`}>
                    {s.is_enabled ? <Power size={16} /> : <PowerOff size={16} />}
                  </button>
                  <button onClick={() => handleDelete(s.id)} className="p-2 rounded-full hover:bg-destructive/10 text-destructive">
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default AdminServers;
