import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Shield, Trash2, Edit2, Search, UserPlus, X } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface UserWithRole {
  user_id: string;
  email: string;
  display_name: string;
  avatar_url: string | null;
  role: string | null;
  created_at: string;
  has_subscription: boolean;
}

const AdminUsers = () => {
  const { user } = useAuth();
  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [search, setSearch] = useState("");
  const [filterRole, setFilterRole] = useState<"all" | "admin" | "user">("all");
  const [editingUser, setEditingUser] = useState<UserWithRole | null>(null);
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");

  useEffect(() => { fetchUsers(); }, []);

  const fetchUsers = async () => {
    const { data: profiles } = await supabase.from("profiles").select("*");
    const { data: roles } = await supabase.from("user_roles").select("*");
    const { data: subs } = await supabase.from("subscriptions").select("user_id, status").eq("status", "active");
    const subUserIds = new Set(subs?.map((s: any) => s.user_id) || []);
    if (profiles) {
      setUsers(profiles.map((p: any) => ({
        user_id: p.user_id,
        email: p.email || "N/A",
        display_name: p.display_name || "Unknown",
        avatar_url: p.avatar_url,
        role: roles?.find((r: any) => r.user_id === p.user_id)?.role || "user",
        created_at: p.created_at,
        has_subscription: subUserIds.has(p.user_id),
      })));
    }
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
    toast({ title: currentRole === "admin" ? "Admin removed" : "Admin granted" });
    fetchUsers();
  };

  const handleEditSave = async () => {
    if (!editingUser) return;
    await supabase.from("profiles").update({
      display_name: editName,
      email: editEmail,
    }).eq("user_id", editingUser.user_id);
    toast({ title: "User updated" });
    setEditingUser(null);
    fetchUsers();
  };

  const handleDeleteUser = async (userId: string) => {
    if (!confirm("Delete this user's profile? This cannot be undone.")) return;
    await supabase.from("user_roles").delete().eq("user_id", userId);
    await supabase.from("watchlist").delete().eq("user_id", userId);
    await supabase.from("profiles").delete().eq("user_id", userId);
    toast({ title: "User profile removed" });
    fetchUsers();
  };

  const filtered = users.filter(u => {
    const matchesSearch = u.display_name.toLowerCase().includes(search.toLowerCase()) || u.email.toLowerCase().includes(search.toLowerCase());
    const matchesRole = filterRole === "all" || u.role === filterRole;
    return matchesSearch && matchesRole;
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search users..." className="w-full bg-secondary/50 border border-border/30 rounded-xl pl-9 pr-4 py-2 text-sm outline-none focus:border-primary/50" />
        </div>
        <div className="flex gap-2">
          {(["all", "admin", "user"] as const).map(f => (
            <button key={f} onClick={() => setFilterRole(f)} className={`px-3 py-2 rounded-xl text-xs font-medium capitalize ${filterRole === f ? "bg-primary text-primary-foreground" : "bg-secondary/50 text-muted-foreground"}`}>{f}</button>
          ))}
        </div>
      </div>

      <p className="text-xs text-muted-foreground">{filtered.length} users found</p>

      {filtered.map((u) => (
        <div key={u.user_id} className="glass rounded-2xl p-4 border border-border/30 flex items-center justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-sm font-medium">{u.display_name}</p>
              {u.role === "admin" && <span className="px-2 py-0.5 rounded-md bg-primary/20 text-primary text-[10px] font-bold">ADMIN</span>}
              {u.has_subscription && <span className="px-2 py-0.5 rounded-md bg-green-500/20 text-green-400 text-[10px] font-bold">PREMIUM</span>}
            </div>
            <p className="text-xs text-muted-foreground">{u.email}</p>
            <p className="text-[10px] text-muted-foreground/60">Joined: {new Date(u.created_at).toLocaleDateString()}</p>
          </div>
          <div className="flex items-center gap-1">
            <button onClick={() => { setEditingUser(u); setEditName(u.display_name); setEditEmail(u.email); }} className="p-2 rounded-full hover:bg-secondary/50 text-muted-foreground"><Edit2 size={14} /></button>
            <button
              onClick={() => handleToggleAdmin(u.user_id, u.role || "user")}
              disabled={u.user_id === user?.id}
              className={`px-2 py-1.5 rounded-xl text-xs font-medium transition-all ${u.role === "admin" ? "bg-destructive/10 text-destructive hover:bg-destructive/20" : "bg-primary/10 text-primary hover:bg-primary/20"} disabled:opacity-30`}
            >
              {u.role === "admin" ? "Revoke" : "Admin"}
            </button>
            <button onClick={() => handleDeleteUser(u.user_id)} disabled={u.user_id === user?.id} className="p-2 rounded-full hover:bg-destructive/10 text-destructive disabled:opacity-30"><Trash2 size={14} /></button>
          </div>
        </div>
      ))}

      {editingUser && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4" onClick={() => setEditingUser(null)}>
          <div className="glass rounded-2xl p-6 border border-border/30 max-w-sm w-full" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-semibold">Edit User</h3>
              <button onClick={() => setEditingUser(null)}><X size={16} /></button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Display Name</label>
                <input value={editName} onChange={e => setEditName(e.target.value)} className="w-full bg-secondary/50 border border-border/30 rounded-xl px-4 py-2.5 text-sm outline-none" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Email</label>
                <input value={editEmail} onChange={e => setEditEmail(e.target.value)} className="w-full bg-secondary/50 border border-border/30 rounded-xl px-4 py-2.5 text-sm outline-none" />
              </div>
              <div className="flex gap-2">
                <button onClick={() => setEditingUser(null)} className="flex-1 py-2 rounded-xl bg-secondary text-sm">Cancel</button>
                <button onClick={handleEditSave} className="flex-1 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium">Save</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminUsers;
