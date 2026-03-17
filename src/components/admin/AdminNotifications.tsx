import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Send, Bell } from "lucide-react";
import { toast } from "@/hooks/use-toast";

const AdminNotifications = () => {
  const { user } = useAuth();
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [type, setType] = useState("info");
  const [sending, setSending] = useState(false);
  const [sentNotifications, setSentNotifications] = useState<any[]>([]);

  useEffect(() => { fetchSent(); }, []);

  const fetchSent = async () => {
    const { data } = await supabase
      .from("notifications")
      .select("*")
      .eq("created_by", user?.id || "")
      .order("created_at", { ascending: false })
      .limit(20);
    setSentNotifications((data as any[]) || []);
  };

  const handleSendToAll = async () => {
    if (!title || !message) return;
    setSending(true);

    // Get all user IDs
    const { data: profiles } = await supabase.from("profiles").select("user_id");
    if (profiles) {
      const notifications = profiles.map((p: any) => ({
        title,
        message,
        type,
        target: "all",
        user_id: p.user_id,
        created_by: user?.id,
      }));
      const { error } = await supabase.from("notifications").insert(notifications as any);
      if (!error) {
        toast({ title: "Notification sent", description: `Sent to ${profiles.length} users` });
        setTitle("");
        setMessage("");
        fetchSent();
      } else {
        toast({ title: "Error", description: error.message, variant: "destructive" });
      }
    }
    setSending(false);
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">Send push notifications to all users.</p>

      <div className="glass rounded-2xl p-5 border border-primary/30 space-y-3">
        <h3 className="font-display font-bold text-sm">New Notification</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Title *</label>
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="New release!" className="w-full bg-secondary/50 border border-border/30 rounded-xl px-3 py-2 text-sm outline-none focus:border-primary/50" />
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Type</label>
            <select value={type} onChange={(e) => setType(e.target.value)} className="w-full bg-secondary/50 border border-border/30 rounded-xl px-3 py-2 text-sm outline-none">
              <option value="info">Info</option>
              <option value="promo">Promo</option>
              <option value="update">Update</option>
              <option value="warning">Warning</option>
            </select>
          </div>
          <div className="sm:col-span-2">
            <label className="text-xs text-muted-foreground mb-1 block">Message *</label>
            <textarea value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Check out our latest additions..." rows={3} className="w-full bg-secondary/50 border border-border/30 rounded-xl px-3 py-2 text-sm outline-none focus:border-primary/50 resize-none" />
          </div>
        </div>
        <button onClick={handleSendToAll} disabled={sending || !title || !message} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium disabled:opacity-50">
          <Send size={14} /> {sending ? "Sending..." : "Send to All Users"}
        </button>
      </div>

      {sentNotifications.length > 0 && (
        <div className="space-y-2">
          <h3 className="font-display font-bold text-sm">Recently Sent</h3>
          {sentNotifications.slice(0, 10).map((n) => (
            <div key={n.id} className="glass rounded-2xl p-3 border border-border/30">
              <div className="flex items-center gap-2 mb-1">
                <Bell size={12} className="text-primary" />
                <p className="text-sm font-medium">{n.title}</p>
                <span className="px-2 py-0.5 rounded-md bg-secondary text-[10px] text-muted-foreground">{n.type}</span>
              </div>
              <p className="text-xs text-muted-foreground">{n.message}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AdminNotifications;
