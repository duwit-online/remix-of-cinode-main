import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Shield, Trash2, Edit2, Search, UserPlus, X, Crown, Users } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface UserWithRole {
  user_id: string;
  email: string;
  display_name: string;
  avatar_url: string | null;
  role: string | null;
  created_at: string;
  has_subscription: boolean;
  is_affiliate: boolean;
}

const AdminUsers = () => {
  const { user } = useAuth();
  const [creatingUser, setCreatingUser] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [search, setSearch] = useState("");
  const [filterRole, setFilterRole] = useState<"all" | "admin" | "user" | "premium" | "affiliate">("all");
  const [editingUser, setEditingUser] = useState<UserWithRole | null>(null);
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [createName, setCreateName] = useState("");
  const [createEmail, setCreateEmail] = useState("");
  const [createPassword, setCreatePassword] = useState("");
  const [createAdmin, setCreateAdmin] = useState(false);

  const { data: users = [], refetch } = useQuery({
    queryKey: ["admin-users-broad"],
    queryFn: async () => {
      const [{ data: profiles }, { data: roles }, { data: subs }, { data: affiliates }] = await Promise.all([
        supabase.from("profiles").select("*"),
        supabase.from("user_roles").select("*"),
        supabase.from("subscriptions").select("user_id, status, expires_at").eq("status", "active"),
        supabase.from("affiliates").select("user_id, is_active"),
      ]);

      const subUserIds = new Set(
        ((subs as any[]) || [])
          .filter((subscription: any) => new Date(subscription.expires_at) > new Date())
          .map((subscription: any) => subscription.user_id)
      );

      const affiliateUserIds = new Set(((affiliates as any[]) || []).filter((affiliate: any) => affiliate.is_active).map((affiliate: any) => affiliate.user_id));

      return ((profiles as any[]) || []).map((profile: any) => ({
        user_id: profile.user_id,
        email: profile.email || "N/A",
        display_name: profile.display_name || "Unknown",
        avatar_url: profile.avatar_url,
        role: ((roles as any[]) || []).find((role: any) => role.user_id === profile.user_id)?.role || "user",
        created_at: profile.created_at,
        has_subscription: subUserIds.has(profile.user_id),
        is_affiliate: affiliateUserIds.has(profile.user_id),
      }));
    },
  });

  const handleToggleAdmin = async (userId: string, currentRole: string) => {
    const { error } = await supabase.functions.invoke("admin-user-manager", {
      body: { action: "set_admin", userId, makeAdmin: currentRole !== "admin" },
    });

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return;
    }

    toast({ title: currentRole === "admin" ? "Admin removed" : "Admin granted" });
    refetch();
  };

  const handleEditSave = async () => {
    if (!editingUser) return;

    const { error } = await supabase.functions.invoke("admin-user-manager", {
      body: {
        action: "update_profile",
        userId: editingUser.user_id,
        displayName: editName,
        email: editEmail,
      },
    });

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return;
    }

    toast({ title: "User updated" });
    setEditingUser(null);
    refetch();
  };

  const handleCreateUser = async () => {
    setCreatingUser(true);
    const { error } = await supabase.functions.invoke("admin-user-manager", {
      body: {
        action: "create_user",
        email: createEmail,
        password: createPassword,
        displayName: createName,
        isAdmin: createAdmin,
      },
    });

    setCreatingUser(false);

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return;
    }

    toast({ title: "User created" });
    setShowCreate(false);
    setCreateName("");
    setCreateEmail("");
    setCreatePassword("");
    setCreateAdmin(false);
    refetch();
  };

  const handleDeleteUser = async (userId: string) => {
    if (!confirm("Delete this user's profile? This cannot be undone.")) return;

    const { error } = await supabase.functions.invoke("admin-user-manager", {
      body: { action: "delete_user", userId },
    });

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return;
    }

    toast({ title: "User profile removed" });
    refetch();
  };

  const filtered = useMemo(() => users.filter(u => {
    const matchesSearch = u.display_name.toLowerCase().includes(search.toLowerCase()) || u.email.toLowerCase().includes(search.toLowerCase());
    const matchesRole =
      filterRole === "all" ||
      (filterRole === "admin" && u.role === "admin") ||
      (filterRole === "premium" && u.has_subscription) ||
      (filterRole === "affiliate" && u.is_affiliate) ||
      (filterRole === "user" && u.role !== "admin");
    return matchesSearch && matchesRole;
  }), [users, search, filterRole]);

  const stats = {
    total: users.length,
    admins: users.filter((current) => current.role === "admin").length,
    premium: users.filter((current) => current.has_subscription).length,
    affiliates: users.filter((current) => current.is_affiliate).length,
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 flex-1">
          {[
            { label: "Users", value: stats.total },
            { label: "Admins", value: stats.admins },
            { label: "Premium", value: stats.premium },
            { label: "Affiliates", value: stats.affiliates },
          ].map((item) => (
            <div key={item.label} className="glass rounded-xl border border-border/30 p-4">
              <p className="text-xs text-muted-foreground">{item.label}</p>
              <p className="text-xl font-display font-black">{item.value}</p>
            </div>
          ))}
        </div>
        <button onClick={() => setShowCreate(true)} className="shrink-0 inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-medium text-primary-foreground">
          <UserPlus size={16} /> Add User
        </button>
      </div>

      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search users..." className="w-full bg-secondary/50 border border-border/30 rounded-xl pl-9 pr-4 py-2 text-sm outline-none focus:border-primary/50" />
        </div>
        <div className="flex gap-2">
          {(["all", "admin", "user", "premium", "affiliate"] as const).map(f => (
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
              {u.has_subscription && <span className="px-2 py-0.5 rounded-md bg-secondary text-[10px] font-bold inline-flex items-center gap-1"><Crown size={10} /> PREMIUM</span>}
              {u.is_affiliate && <span className="px-2 py-0.5 rounded-md bg-secondary text-[10px] font-bold inline-flex items-center gap-1"><Users size={10} /> AFFILIATE</span>}
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

      {showCreate && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4" onClick={() => setShowCreate(false)}>
          <div className="glass rounded-2xl p-6 border border-border/30 max-w-sm w-full" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-semibold">Create User</h3>
              <button onClick={() => setShowCreate(false)}><X size={16} /></button>
            </div>
            <div className="space-y-3">
              <input value={createName} onChange={(e) => setCreateName(e.target.value)} placeholder="Display name" className="w-full bg-secondary/50 border border-border/30 rounded-xl px-4 py-2.5 text-sm outline-none" />
              <input value={createEmail} onChange={(e) => setCreateEmail(e.target.value)} placeholder="Email" className="w-full bg-secondary/50 border border-border/30 rounded-xl px-4 py-2.5 text-sm outline-none" />
              <input type="password" value={createPassword} onChange={(e) => setCreatePassword(e.target.value)} placeholder="Password" className="w-full bg-secondary/50 border border-border/30 rounded-xl px-4 py-2.5 text-sm outline-none" />
              <label className="flex items-center gap-2 text-sm text-muted-foreground">
                <input type="checkbox" checked={createAdmin} onChange={(e) => setCreateAdmin(e.target.checked)} /> Create as admin
              </label>
              <div className="flex gap-2">
                <button onClick={() => setShowCreate(false)} className="flex-1 py-2 rounded-xl bg-secondary text-sm">Cancel</button>
                <button onClick={handleCreateUser} disabled={creatingUser || !createEmail || !createPassword} className="flex-1 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium disabled:opacity-50">{creatingUser ? "Creating..." : "Create"}</button>
              </div>
            </div>
          </div>
        </div>
      )}

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
