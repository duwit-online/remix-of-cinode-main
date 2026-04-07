import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Plus, Trash2, Server, Eye, EyeOff, Power, PowerOff, Pencil, Copy, Info, Loader2, PlugZap } from "lucide-react";
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

const SERVER_INFO: Record<string, { desc: string; help: string }> = {
  jellyfin: {
    desc: "Jellyfin is a free, open-source media server. It hosts your own movie/TV library and streams them over the network.",
    help: "1. Install Jellyfin on your server/PC\n2. Go to Dashboard → API Keys → Create a new key\n3. Enter the server URL (e.g. http://YOUR_IP:8096)\n4. Paste the API key here\n\nCinode will search your Jellyfin library by TMDB ID and stream the matching file directly to users.",
  },
  emby: {
    desc: "Emby is a media server similar to Jellyfin (its commercial fork). It organises and streams your personal media.",
    help: "Same setup as Jellyfin — create an API key from Emby dashboard, enter the URL and key here.",
  },
  plex: {
    desc: "Plex is a popular commercial media server that streams your personal library with a polished interface.",
    help: "Use a Plex Token as the API key. Find it in Plex Web → inspect network requests for 'X-Plex-Token'.",
  },
  custom: {
    desc: "Any custom streaming server that exposes a direct video URL via an API.",
    help: "Provide the base URL and authentication key. Cinode will call your server to resolve video streams.",
  },
};

const AdminServers = () => {
  const { user } = useAuth();
  const [servers, setServers] = useState<StreamingServer[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", server_type: "jellyfin", server_url: "", api_key: "", priority: "0" });
  const [saving, setSaving] = useState(false);
  const [visibleKeys, setVisibleKeys] = useState<Set<string>>(new Set());
  const [showInfo, setShowInfo] = useState<string | null>(null);
  const [testingId, setTestingId] = useState<string | null>(null);
  const [testResults, setTestResults] = useState<Record<string, { ok: boolean; server_name?: string; version?: string; product_name?: string; local_address?: string; error?: string }>>({});

  useEffect(() => { fetchServers(); }, []);

  const fetchServers = async () => {
    const { data } = await supabase
      .from("streaming_servers")
      .select("*")
      .order("priority", { ascending: false });
    if (data) setServers(data as any);
  };

  const resetForm = () => {
    setForm({ name: "", server_type: "jellyfin", server_url: "", api_key: "", priority: "0" });
    setEditingId(null);
    setShowForm(false);
  };

  const handleSave = async () => {
    if (!form.name || !form.server_url || (!form.api_key && !editingId)) {
      toast({ title: "Missing fields", description: "Name, URL and API Key are required.", variant: "destructive" });
      return;
    }
    setSaving(true);

    if (editingId) {
      const updateData: any = {
        name: form.name,
        server_type: form.server_type,
        server_url: form.server_url.replace(/\/$/, ""),
        priority: parseInt(form.priority) || 0,
      };
      if (form.api_key) updateData.api_key_encrypted = form.api_key;
      const { error } = await supabase.from("streaming_servers").update(updateData).eq("id", editingId);
      if (!error) { toast({ title: "Server updated" }); resetForm(); fetchServers(); }
      else toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      const { error } = await supabase.from("streaming_servers").insert({
        name: form.name,
        server_type: form.server_type,
        server_url: form.server_url.replace(/\/$/, ""),
        api_key_encrypted: form.api_key,
        priority: parseInt(form.priority) || 0,
        created_by: user?.id,
      } as any);
      if (!error) { toast({ title: "Server added" }); resetForm(); fetchServers(); }
      else toast({ title: "Error", description: error.message, variant: "destructive" });
    }
    setSaving(false);
  };

  const startEdit = (s: StreamingServer) => {
    setEditingId(s.id);
    setForm({ name: s.name, server_type: s.server_type, server_url: s.server_url, api_key: "", priority: String(s.priority) });
    setShowForm(true);
  };

  const duplicateServer = async (s: StreamingServer) => {
    const { error } = await supabase.from("streaming_servers").insert({
      name: `${s.name} (Copy)`,
      server_type: s.server_type,
      server_url: s.server_url,
      api_key_encrypted: s.api_key_encrypted,
      priority: s.priority - 1,
      created_by: user?.id,
    } as any);
    if (!error) { toast({ title: "Server duplicated" }); fetchServers(); }
  };

  const toggleEnabled = async (id: string, current: boolean) => {
    await supabase.from("streaming_servers").update({ is_enabled: !current } as any).eq("id", id);
    fetchServers();
    toast({ title: !current ? "Server enabled" : "Server disabled" });
  };

  const handleDelete = async (id: string) => {
    await supabase.from("streaming_servers").delete().eq("id", id);
    fetchServers();
    toast({ title: "Server removed" });
  };

  const toggleKeyVisibility = (id: string) => {
    setVisibleKeys((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  };

  const maskKey = (key: string) => key.length > 8 ? key.slice(0, 4) + "••••••••" + key.slice(-4) : "••••••••";

  const handleTestConnection = async (id: string) => {
    setTestingId(id);
    try {
      const { data, error } = await supabase.functions.invoke("jellyfin-proxy", {
        body: { action: "test_connection", server_id: id },
      });

      if (error || !data?.ok) {
        const message = data?.error || error?.message || "Connection failed";
        setTestResults((prev) => ({ ...prev, [id]: { ok: false, error: message } }));
        toast({ title: "Connection failed", description: message, variant: "destructive" });
        return;
      }

      setTestResults((prev) => ({ ...prev, [id]: data }));
      toast({ title: "Server connected", description: `${data.server_name || "Server"} responded successfully.` });
    } catch (e: any) {
      const message = e?.message || "Connection failed";
      setTestResults((prev) => ({ ...prev, [id]: { ok: false, error: message } }));
      toast({ title: "Connection failed", description: message, variant: "destructive" });
    } finally {
      setTestingId(null);
    }
  };

  const info = SERVER_INFO[form.server_type] || SERVER_INFO.custom;

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <p className="text-sm text-muted-foreground">Manage streaming servers (Jellyfin, Emby, etc.)</p>
          <p className="text-xs text-muted-foreground/60 mt-1">API keys are stored securely and only accessible by admins.</p>
        </div>
        <button onClick={() => { resetForm(); setShowForm(true); }} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium">
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
              <label className="text-xs text-muted-foreground mb-1 block">API Key {editingId ? "(leave blank to keep current)" : "*"}</label>
              <input type="password" value={form.api_key} onChange={(e) => setForm({ ...form, api_key: e.target.value })} placeholder={editingId ? "Leave blank to keep current" : "Your API key"} className="w-full bg-secondary/50 border border-border/30 rounded-xl px-3 py-2 text-sm outline-none focus:border-primary/50" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Priority (higher = first)</label>
              <input type="number" value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })} className="w-full bg-secondary/50 border border-border/30 rounded-xl px-3 py-2 text-sm outline-none focus:border-primary/50" />
            </div>
          </div>

          {/* Server type info */}
          <div className="bg-secondary/30 border border-border/20 rounded-xl p-3 text-xs text-muted-foreground space-y-1">
            <div className="flex items-center gap-1.5 font-semibold text-foreground"><Info size={12} /> What is {form.server_type}?</div>
            <p>{info.desc}</p>
            <p className="whitespace-pre-line mt-1 text-muted-foreground/80">{info.help}</p>
          </div>

          <div className="flex gap-2 justify-end">
            <button onClick={resetForm} className="px-4 py-2 rounded-xl text-sm text-muted-foreground hover:bg-secondary/50">Cancel</button>
            <button onClick={handleSave} disabled={saving} className="px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium disabled:opacity-50">
              {saving ? "Saving..." : editingId ? "Update" : "Save"}
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
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
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
                  <button onClick={() => handleTestConnection(s.id)} className="p-2 rounded-full hover:bg-secondary/50 text-primary" title="Test Connection" disabled={testingId === s.id}>
                    {testingId === s.id ? <Loader2 size={14} className="animate-spin" /> : <PlugZap size={14} />}
                  </button>
                  <button onClick={() => startEdit(s)} className="p-2 rounded-full hover:bg-secondary/50 text-muted-foreground" title="Edit">
                    <Pencil size={14} />
                  </button>
                  <button onClick={() => duplicateServer(s)} className="p-2 rounded-full hover:bg-secondary/50 text-muted-foreground" title="Duplicate">
                    <Copy size={14} />
                  </button>
                  <button onClick={() => setShowInfo(showInfo === s.id ? null : s.id)} className="p-2 rounded-full hover:bg-secondary/50 text-muted-foreground" title="Info">
                    <Info size={14} />
                  </button>
                  <button onClick={() => toggleEnabled(s.id, s.is_enabled)} className={`p-2 rounded-full transition-colors ${s.is_enabled ? "text-green-500 hover:bg-green-500/10" : "text-muted-foreground hover:bg-secondary/50"}`}>
                    {s.is_enabled ? <Power size={16} /> : <PowerOff size={16} />}
                  </button>
                  <button onClick={() => handleDelete(s.id)} className="p-2 rounded-full hover:bg-destructive/10 text-destructive">
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
              {showInfo === s.id && (
                <div className="mt-3 bg-secondary/30 border border-border/20 rounded-xl p-3 text-xs text-muted-foreground">
                  <p className="font-semibold text-foreground mb-1">About {s.server_type}</p>
                  <p>{SERVER_INFO[s.server_type]?.desc || SERVER_INFO.custom.desc}</p>
                  <p className="whitespace-pre-line mt-1 text-muted-foreground/80">{SERVER_INFO[s.server_type]?.help || SERVER_INFO.custom.help}</p>
                </div>
              )}
              {testResults[s.id] && (
                <div className={`mt-3 rounded-xl border p-3 text-xs ${testResults[s.id].ok ? "border-primary/30 bg-primary/10" : "border-destructive/30 bg-destructive/10"}`}>
                  {testResults[s.id].ok ? (
                    <div className="space-y-1 text-foreground">
                      <p className="font-semibold">Connection OK</p>
                      <p><span className="text-muted-foreground">Server:</span> {testResults[s.id].server_name || s.name}</p>
                      <p><span className="text-muted-foreground">Product:</span> {testResults[s.id].product_name || s.server_type}</p>
                      <p><span className="text-muted-foreground">Version:</span> {testResults[s.id].version || "Unknown"}</p>
                      <p className="truncate"><span className="text-muted-foreground">Address:</span> {testResults[s.id].local_address || s.server_url}</p>
                    </div>
                  ) : (
                    <div className="space-y-1 text-foreground">
                      <p className="font-semibold">Connection failed</p>
                      <p>{testResults[s.id].error}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default AdminServers;
