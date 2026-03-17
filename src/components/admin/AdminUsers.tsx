import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Shield, Trash2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface UserWithRole {
  user_id: string;
  email: string;
  display_name: string;
  role: string | null;
}

const AdminUsers = () => {
  const { user } = useAuth();
  const [users, setUsers] = useState<UserWithRole[]>([]);

  useEffect(() => { fetchUsers(); }, []);

  const fetchUsers = async () => {
    const { data: profiles } = await supabase.from("profiles").select("*");
    const { data: roles } = await supabase.from("user_roles").select("*");
    if (profiles) {
      setUsers(profiles.map((p: any) => ({
        user_id: p.user_id,
        email: p.email || "N/A",
        display_name: p.display_name || "Unknown",
        role: roles?.find((r: any) => r.user_id === p.user_id)?.role || "user",
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

  return (
    <div className="space-y-2">
      <p className="text-sm text-muted-foreground mb-4">Manage user roles and access.</p>
      {users.map((u) => (
        <div key={u.user_id} className="glass rounded-2xl p-4 border border-border/30 flex items-center justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <p className="text-sm font-medium">{u.display_name}</p>
              {u.role === "admin" && (
                <span className="px-2 py-0.5 rounded-md bg-primary/20 text-primary text-[10px] font-bold">ADMIN</span>
              )}
            </div>
            <p className="text-xs text-muted-foreground">{u.email}</p>
          </div>
          <button
            onClick={() => handleToggleAdmin(u.user_id, u.role || "user")}
            disabled={u.user_id === user?.id}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
              u.role === "admin"
                ? "bg-destructive/10 text-destructive hover:bg-destructive/20"
                : "bg-primary/10 text-primary hover:bg-primary/20"
            } disabled:opacity-30`}
          >
            {u.role === "admin" ? "Remove Admin" : "Make Admin"}
          </button>
        </div>
      ))}
    </div>
  );
};

export default AdminUsers;
