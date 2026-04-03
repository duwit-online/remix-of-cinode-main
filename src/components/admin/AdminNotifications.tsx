import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Send, Bell, Mail, User, Users, RotateCcw, Trash2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";

const buildNotificationGroupKey = (item: any) => `${item.title}__${item.message}__${item.type}__${item.target}__${item.created_at}__${item.created_by || "system"}`;

const AdminNotifications = () => {
  const { user } = useAuth();
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [type, setType] = useState("info");
  const [target, setTarget] = useState<"all" | "single">("all");
  const [targetEmail, setTargetEmail] = useState("");
  const [sendEmail, setSendEmail] = useState(false);
  const [sending, setSending] = useState(false);
  const [sentNotifications, setSentNotifications] = useState<any[]>([]);

  // Email config
  const [emailProvider, setEmailProvider] = useState("resend");
  const [emailApiKey, setEmailApiKey] = useState("");
  const [fromEmail, setFromEmail] = useState("noreply@example.com");
  const [fromName, setFromName] = useState("Cinode");
  const [smtpHost, setSmtpHost] = useState("");
  const [smtpPort, setSmtpPort] = useState("587");
  const [smtpUser, setSmtpUser] = useState("");
  const [smtpPass, setSmtpPass] = useState("");
  const [showEmailConfig, setShowEmailConfig] = useState(false);
  const [savingConfig, setSavingConfig] = useState(false);

  useEffect(() => {
    fetchSent();
    fetchEmailConfig();
  }, []);

  const fetchSent = async () => {
    const { data } = await supabase
      .from("notifications")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100);

    const grouped = new Map<string, any>();
    ((data as any[]) || []).forEach((item: any) => {
      const key = buildNotificationGroupKey(item);
      if (!grouped.has(key)) {
        grouped.set(key, { ...item, delivery_count: 0 });
      }
      grouped.get(key).delivery_count += 1;
    });

    setSentNotifications(Array.from(grouped.values()).slice(0, 12));
  };

  const fetchEmailConfig = async () => {
    const { data } = await supabase
      .from("email_config")
      .select("*")
      .limit(1)
      .maybeSingle();
    if (data) {
      setEmailProvider((data as any).provider || "resend");
      setEmailApiKey((data as any).api_key_encrypted || "");
      setFromEmail((data as any).from_email || "noreply@example.com");
      setFromName((data as any).from_name || "Cinode");
      setSmtpHost((data as any).smtp_host || "");
      setSmtpPort(String((data as any).smtp_port || 587));
      setSmtpUser((data as any).smtp_user || "");
      setSmtpPass((data as any).smtp_pass_encrypted || "");
    }
  };

  const saveEmailConfig = async () => {
    setSavingConfig(true);
    // Upsert the config
    const { data: existing } = await supabase.from("email_config").select("id").limit(1).maybeSingle();
    const payload: any = {
      provider: emailProvider,
      api_key_encrypted: emailApiKey,
      from_email: fromEmail,
      from_name: fromName,
      smtp_host: smtpHost || null,
      smtp_port: parseInt(smtpPort) || 587,
      smtp_user: smtpUser || null,
      smtp_pass_encrypted: smtpPass || null,
      updated_by: user?.id,
    };

    let error;
    if (existing) {
      ({ error } = await supabase.from("email_config").update(payload).eq("id", (existing as any).id));
    } else {
      ({ error } = await supabase.from("email_config").insert(payload));
    }

    if (!error) {
      toast({ title: "Email config saved" });
      setShowEmailConfig(false);
    } else {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
    setSavingConfig(false);
  };

  const handleSend = async () => {
    if (!title || !message) return;
    setSending(true);

    if (target === "all") {
      const { data: profiles } = await supabase.from("profiles").select("user_id, email");
      if (profiles) {
        const notifications = profiles.map((p: any) => ({
          title, message, type, target: "all",
          user_id: p.user_id, created_by: user?.id,
        }));
        const { error } = await supabase.from("notifications").insert(notifications as any);
        if (!error) {
          toast({ title: "Notification sent", description: `Sent to ${profiles.length} users` });

          // Send emails if enabled
          if (sendEmail) {
            const emails = profiles.map((p: any) => p.email).filter(Boolean);
            if (emails.length > 0) {
              try {
                await supabase.functions.invoke("send-email", {
                  body: { to: emails, subject: title, html: `<h2>${title}</h2><p>${message}</p>` },
                });
                toast({ title: "Emails sent", description: `Sent to ${emails.length} addresses` });
              } catch {
                toast({ title: "Email send failed", variant: "destructive" });
              }
            }
          }
          setTitle(""); setMessage(""); fetchSent();
        } else {
          toast({ title: "Error", description: error.message, variant: "destructive" });
        }
      }
    } else {
      // Single user by email
      const { data: profile } = await supabase.from("profiles").select("user_id, email").eq("email", targetEmail).maybeSingle();
      if (profile) {
        const { error } = await supabase.from("notifications").insert({
          title, message, type, target: "single",
          user_id: (profile as any).user_id, target_user_id: (profile as any).user_id,
          created_by: user?.id,
        } as any);
        if (!error) {
          toast({ title: "Notification sent to user" });
          if (sendEmail && (profile as any).email) {
            try {
              await supabase.functions.invoke("send-email", {
                body: { to: [(profile as any).email], subject: title, html: `<h2>${title}</h2><p>${message}</p>` },
              });
            } catch {}
          }
          setTitle(""); setMessage(""); setTargetEmail(""); fetchSent();
        }
      } else {
        toast({ title: "User not found", variant: "destructive" });
      }
    }
    setSending(false);
  };

  const resendNotification = async (notification: any) => {
    setTitle(notification.title);
    setMessage(notification.message);
    setType(notification.type);
    setTarget(notification.target === "single" ? "single" : "all");

    if (notification.target === "single" && notification.target_user_id) {
      const { data: profile } = await supabase.from("profiles").select("email").eq("user_id", notification.target_user_id).maybeSingle();
      setTargetEmail((profile as any)?.email || "");
    }

    await new Promise((resolve) => setTimeout(resolve, 0));

    if (notification.target === "all") {
      const { data: profiles } = await supabase.from("profiles").select("user_id");
      if (profiles?.length) {
        const rows = profiles.map((profile: any) => ({
          title: notification.title,
          message: notification.message,
          type: notification.type,
          target: "all",
          user_id: profile.user_id,
          created_by: user?.id,
        }));
        const { error } = await supabase.from("notifications").insert(rows as any);
        if (error) {
          toast({ title: "Error", description: error.message, variant: "destructive" });
          return;
        }
      }
    } else if (notification.target_user_id) {
      const { error } = await supabase.from("notifications").insert({
        title: notification.title,
        message: notification.message,
        type: notification.type,
        target: "single",
        user_id: notification.target_user_id,
        target_user_id: notification.target_user_id,
        created_by: user?.id,
      } as any);
      if (error) {
        toast({ title: "Error", description: error.message, variant: "destructive" });
        return;
      }
    }

    toast({ title: "Notification resent" });
    fetchSent();
  };

  const deleteNotificationGroup = async (notification: any) => {
    const { error } = await supabase
      .from("notifications")
      .delete()
      .eq("title", notification.title)
      .eq("message", notification.message)
      .eq("type", notification.type)
      .eq("target", notification.target)
      .eq("created_at", notification.created_at);

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return;
    }

    toast({ title: "Notification deleted" });
    fetchSent();
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-muted-foreground">Send in-app & email notifications.</p>
        <button onClick={() => setShowEmailConfig(!showEmailConfig)} className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-secondary/50 text-sm text-muted-foreground hover:bg-secondary">
          <Mail size={14} /> Email Config
        </button>
      </div>

      {/* Email Config Panel */}
      {showEmailConfig && (
        <div className="glass rounded-2xl p-5 border border-accent/30 space-y-3">
          <h3 className="font-display font-bold text-sm">Email Configuration</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Provider</label>
              <select value={emailProvider} onChange={(e) => setEmailProvider(e.target.value)} className="w-full bg-secondary/50 border border-border/30 rounded-xl px-3 py-2 text-sm outline-none">
                <option value="resend">Resend</option>
                <option value="smtp">Private SMTP</option>
              </select>
            </div>
            {emailProvider === "resend" ? (
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Resend API Key</label>
                <input type="password" value={emailApiKey} onChange={(e) => setEmailApiKey(e.target.value)} placeholder="re_..." className="w-full bg-secondary/50 border border-border/30 rounded-xl px-3 py-2 text-sm outline-none focus:border-primary/50" />
              </div>
            ) : (
              <>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">SMTP Host</label>
                  <input value={smtpHost} onChange={(e) => setSmtpHost(e.target.value)} placeholder="smtp.example.com" className="w-full bg-secondary/50 border border-border/30 rounded-xl px-3 py-2 text-sm outline-none focus:border-primary/50" />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">SMTP Port</label>
                  <input value={smtpPort} onChange={(e) => setSmtpPort(e.target.value)} className="w-full bg-secondary/50 border border-border/30 rounded-xl px-3 py-2 text-sm outline-none focus:border-primary/50" />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">SMTP User</label>
                  <input value={smtpUser} onChange={(e) => setSmtpUser(e.target.value)} className="w-full bg-secondary/50 border border-border/30 rounded-xl px-3 py-2 text-sm outline-none focus:border-primary/50" />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">SMTP Password</label>
                  <input type="password" value={smtpPass} onChange={(e) => setSmtpPass(e.target.value)} className="w-full bg-secondary/50 border border-border/30 rounded-xl px-3 py-2 text-sm outline-none focus:border-primary/50" />
                </div>
              </>
            )}
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">From Email</label>
              <input value={fromEmail} onChange={(e) => setFromEmail(e.target.value)} className="w-full bg-secondary/50 border border-border/30 rounded-xl px-3 py-2 text-sm outline-none focus:border-primary/50" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">From Name</label>
              <input value={fromName} onChange={(e) => setFromName(e.target.value)} className="w-full bg-secondary/50 border border-border/30 rounded-xl px-3 py-2 text-sm outline-none focus:border-primary/50" />
            </div>
          </div>
          <button onClick={saveEmailConfig} disabled={savingConfig} className="px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium disabled:opacity-50">
            {savingConfig ? "Saving..." : "Save Config"}
          </button>
        </div>
      )}

      {/* Notification Form */}
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
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Target</label>
            <div className="flex gap-2">
              <button onClick={() => setTarget("all")} className={`flex items-center gap-1 px-3 py-2 rounded-xl text-sm ${target === "all" ? "bg-primary text-primary-foreground" : "bg-secondary/50 text-muted-foreground"}`}>
                <Users size={14} /> All Users
              </button>
              <button onClick={() => setTarget("single")} className={`flex items-center gap-1 px-3 py-2 rounded-xl text-sm ${target === "single" ? "bg-primary text-primary-foreground" : "bg-secondary/50 text-muted-foreground"}`}>
                <User size={14} /> Single
              </button>
            </div>
          </div>
          {target === "single" && (
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">User Email</label>
              <input value={targetEmail} onChange={(e) => setTargetEmail(e.target.value)} placeholder="user@example.com" className="w-full bg-secondary/50 border border-border/30 rounded-xl px-3 py-2 text-sm outline-none focus:border-primary/50" />
            </div>
          )}
          <div className="sm:col-span-2">
            <label className="text-xs text-muted-foreground mb-1 block">Message *</label>
            <textarea value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Check out our latest additions..." rows={3} className="w-full bg-secondary/50 border border-border/30 rounded-xl px-3 py-2 text-sm outline-none focus:border-primary/50 resize-none" />
          </div>
          <div className="sm:col-span-2 flex items-center gap-2">
            <input type="checkbox" id="sendEmail" checked={sendEmail} onChange={(e) => setSendEmail(e.target.checked)} className="rounded" />
            <label htmlFor="sendEmail" className="text-sm text-muted-foreground">Also send as email</label>
          </div>
        </div>
        <button onClick={handleSend} disabled={sending || !title || !message} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium disabled:opacity-50">
          <Send size={14} /> {sending ? "Sending..." : target === "all" ? "Send to All Users" : "Send to User"}
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
                <span className="px-2 py-0.5 rounded-md bg-secondary text-[10px] text-muted-foreground">{n.target}</span>
                <span className="px-2 py-0.5 rounded-md bg-secondary text-[10px] text-muted-foreground">{n.delivery_count} sent</span>
              </div>
              <p className="text-xs text-muted-foreground">{n.message}</p>
              <div className="flex gap-2 mt-3">
                <button onClick={() => resendNotification(n)} className="inline-flex items-center gap-1 rounded-xl bg-secondary/50 px-3 py-1.5 text-xs font-medium">
                  <RotateCcw size={12} /> Resend
                </button>
                <button onClick={() => deleteNotificationGroup(n)} className="inline-flex items-center gap-1 rounded-xl bg-destructive/10 px-3 py-1.5 text-xs font-medium text-destructive">
                  <Trash2 size={12} /> Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AdminNotifications;
