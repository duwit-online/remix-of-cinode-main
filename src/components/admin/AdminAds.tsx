import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Plus, Trash2, Megaphone, ToggleLeft, ToggleRight, Copy, Edit2, X, Check } from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "@/hooks/use-toast";

const adTypes = ["banner", "inline", "pre_roll", "mid_roll", "popup", "adsterra"];
const placements = ["homepage", "watch_page", "search", "movies", "tv", "global"];

const AdminAds = () => {
  const { user } = useAuth();
  const [ads, setAds] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingAd, setEditingAd] = useState<any>(null);
  const [form, setForm] = useState({
    name: "", ad_type: "banner", placement: "homepage",
    image_url: "", video_url: "", link_url: "", content_html: "", priority: "0",
    start_date: "", end_date: "",
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => { fetchAds(); }, []);

  const fetchAds = async () => {
    const { data } = await supabase.from("ads").select("*").order("created_at", { ascending: false });
    setAds((data as any[]) || []);
  };

  const resetForm = () => {
    setForm({ name: "", ad_type: "banner", placement: "homepage", image_url: "", video_url: "", link_url: "", content_html: "", priority: "0", start_date: "", end_date: "" });
    setEditingAd(null);
  };

  const handleSave = async () => {
    if (!form.name) return;
    setSaving(true);
    const payload: any = {
      name: form.name,
      ad_type: form.ad_type,
      placement: form.placement,
      image_url: form.image_url || null,
      video_url: form.video_url || null,
      link_url: form.link_url || null,
      content_html: form.content_html || null,
      priority: parseInt(form.priority) || 0,
      start_date: form.start_date || null,
      end_date: form.end_date || null,
    };

    let error;
    if (editingAd) {
      ({ error } = await supabase.from("ads").update(payload).eq("id", editingAd.id));
    } else {
      payload.created_by = user?.id;
      ({ error } = await supabase.from("ads").insert(payload));
    }

    if (!error) {
      toast({ title: editingAd ? "Ad updated" : "Ad created" });
      setShowForm(false);
      resetForm();
      fetchAds();
    } else {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
    setSaving(false);
  };

  const startEdit = (ad: any) => {
    setEditingAd(ad);
    setForm({
      name: ad.name, ad_type: ad.ad_type, placement: ad.placement,
      image_url: ad.image_url || "", video_url: ad.video_url || "",
      link_url: ad.link_url || "", content_html: ad.content_html || "",
      priority: String(ad.priority),
      start_date: ad.start_date ? ad.start_date.slice(0, 16) : "",
      end_date: ad.end_date ? ad.end_date.slice(0, 16) : "",
    });
    setShowForm(true);
  };

  const cloneAd = async (ad: any) => {
    await supabase.from("ads").insert({
      name: `${ad.name} (Copy)`, ad_type: ad.ad_type, placement: ad.placement,
      image_url: ad.image_url, video_url: ad.video_url, link_url: ad.link_url,
      content_html: ad.content_html, priority: ad.priority,
      start_date: ad.start_date, end_date: ad.end_date,
      created_by: user?.id, is_active: false,
    } as any);
    toast({ title: "Ad cloned" });
    fetchAds();
  };

  const toggleActive = async (ad: any) => {
    await supabase.from("ads").update({ is_active: !ad.is_active } as any).eq("id", ad.id);
    fetchAds();
  };

  const handleDelete = async (id: string) => {
    await supabase.from("ads").delete().eq("id", id);
    fetchAds();
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-muted-foreground">Manage banners, inline, pre-roll, mid-roll, popup, and Adsterra ads.</p>
        <button onClick={() => { resetForm(); setShowForm(true); }} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium">
          <Plus size={16} /> Add Ad
        </button>
      </div>

      {showForm && (
        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="glass rounded-2xl p-5 border border-primary/30 space-y-3">
          <h3 className="font-display font-bold text-sm">{editingAd ? "Edit Ad" : "New Ad"}</h3>

          {form.ad_type === "adsterra" && (
            <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-3 text-xs text-blue-300">
              💡 Paste your Adsterra code snippet in the "Custom HTML" field below. It will render exactly as provided.
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Name *</label>
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Holiday Banner" className="w-full bg-secondary/50 border border-border/30 rounded-xl px-3 py-2 text-sm outline-none focus:border-primary/50" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Type</label>
              <select value={form.ad_type} onChange={(e) => setForm({ ...form, ad_type: e.target.value })} className="w-full bg-secondary/50 border border-border/30 rounded-xl px-3 py-2 text-sm outline-none">
                {adTypes.map((t) => <option key={t} value={t}>{t === "adsterra" ? "ADSTERRA" : t.replace("_", " ").toUpperCase()}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Placement</label>
              <select value={form.placement} onChange={(e) => setForm({ ...form, placement: e.target.value })} className="w-full bg-secondary/50 border border-border/30 rounded-xl px-3 py-2 text-sm outline-none">
                {placements.map((p) => <option key={p} value={p}>{p.replace("_", " ").toUpperCase()}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Priority</label>
              <input type="number" value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })} className="w-full bg-secondary/50 border border-border/30 rounded-xl px-3 py-2 text-sm outline-none focus:border-primary/50" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Start Date</label>
              <input type="datetime-local" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} className="w-full bg-secondary/50 border border-border/30 rounded-xl px-3 py-2 text-sm outline-none focus:border-primary/50" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">End Date</label>
              <input type="datetime-local" value={form.end_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })} className="w-full bg-secondary/50 border border-border/30 rounded-xl px-3 py-2 text-sm outline-none focus:border-primary/50" />
            </div>
            {form.ad_type !== "adsterra" && (
              <>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Image URL</label>
                  <input value={form.image_url} onChange={(e) => setForm({ ...form, image_url: e.target.value })} placeholder="https://..." className="w-full bg-secondary/50 border border-border/30 rounded-xl px-3 py-2 text-sm outline-none focus:border-primary/50" />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Video URL</label>
                  <input value={form.video_url} onChange={(e) => setForm({ ...form, video_url: e.target.value })} placeholder="https://..." className="w-full bg-secondary/50 border border-border/30 rounded-xl px-3 py-2 text-sm outline-none focus:border-primary/50" />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Link URL</label>
                  <input value={form.link_url} onChange={(e) => setForm({ ...form, link_url: e.target.value })} placeholder="https://..." className="w-full bg-secondary/50 border border-border/30 rounded-xl px-3 py-2 text-sm outline-none focus:border-primary/50" />
                </div>
              </>
            )}
            <div className="sm:col-span-2">
              <label className="text-xs text-muted-foreground mb-1 block">
                {form.ad_type === "adsterra" ? "Adsterra Code Snippet *" : "Custom HTML"}
              </label>
              <textarea value={form.content_html} onChange={(e) => setForm({ ...form, content_html: e.target.value })} placeholder={form.ad_type === "adsterra" ? "<script>...</script>" : "<div>...</div>"} rows={4} className="w-full bg-secondary/50 border border-border/30 rounded-xl px-3 py-2 text-sm outline-none focus:border-primary/50 resize-none font-mono" />
            </div>
          </div>
          <div className="flex gap-2 justify-end">
            <button onClick={() => { setShowForm(false); resetForm(); }} className="px-4 py-2 rounded-xl text-sm text-muted-foreground hover:bg-secondary/50">Cancel</button>
            <button onClick={handleSave} disabled={saving || !form.name} className="px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium disabled:opacity-50">
              {saving ? "Saving..." : editingAd ? "Update" : "Save"}
            </button>
          </div>
        </motion.div>
      )}

      <div className="space-y-2">
        {ads.length === 0 ? (
          <div className="glass rounded-2xl p-8 border border-border/30 text-center">
            <Megaphone size={32} className="mx-auto text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">No ads configured yet.</p>
          </div>
        ) : (
          ads.map((ad) => (
            <div key={ad.id} className="glass rounded-2xl p-4 border border-border/30 flex items-center justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase ${ad.is_active ? "bg-accent/20 text-accent" : "bg-muted text-muted-foreground"}`}>
                    {ad.ad_type.replace("_", " ")}
                  </span>
                  <span className="text-xs text-muted-foreground">{ad.placement}</span>
                  <span className="text-xs text-muted-foreground">P:{ad.priority}</span>
                </div>
                <p className="text-sm font-medium">{ad.name}</p>
                <p className="text-xs text-muted-foreground">👁 {ad.impressions} · 👆 {ad.clicks}</p>
                {ad.image_url && <img src={ad.image_url} alt="" className="mt-2 w-full max-w-xs h-12 object-cover rounded-lg" />}
              </div>
              <div className="flex items-center gap-1">
                <button onClick={() => startEdit(ad)} className="p-2 rounded-full hover:bg-secondary/50 text-muted-foreground" title="Edit"><Edit2 size={14} /></button>
                <button onClick={() => cloneAd(ad)} className="p-2 rounded-full hover:bg-secondary/50 text-muted-foreground" title="Clone"><Copy size={14} /></button>
                <button onClick={() => toggleActive(ad)} className="p-2 rounded-full hover:bg-secondary/50">
                  {ad.is_active ? <ToggleRight size={18} className="text-accent" /> : <ToggleLeft size={18} className="text-muted-foreground" />}
                </button>
                <button onClick={() => handleDelete(ad.id)} className="p-2 rounded-full hover:bg-destructive/10 text-destructive"><Trash2 size={16} /></button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default AdminAds;
