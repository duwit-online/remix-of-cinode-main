import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Users, Plus, Trash2, Copy } from "lucide-react";

const AdminAffiliates = () => {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [selectedUserId, setSelectedUserId] = useState("");
  const [customCode, setCustomCode] = useState("");

  const { data: affiliates } = useQuery({
    queryKey: ["admin-affiliates"],
    queryFn: async () => {
      const { data } = await supabase.from("affiliates").select("*, profiles:user_id(display_name, email)").order("created_at", { ascending: false });
      return (data as any[]) || [];
    },
  });

  const { data: allProfiles } = useQuery({
    queryKey: ["admin-all-profiles"],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("user_id, display_name, email");
      return (data as any[]) || [];
    },
  });

  // Stats per affiliate
  const { data: stats } = useQuery({
    queryKey: ["admin-affiliate-stats"],
    queryFn: async () => {
      const { data: refs } = await supabase.from("referrals").select("affiliate_id");
      const { data: earns } = await supabase.from("affiliate_earnings").select("affiliate_id, amount");
      const refCounts: Record<string, number> = {};
      const earnTotals: Record<string, number> = {};
      refs?.forEach((r: any) => { refCounts[r.affiliate_id] = (refCounts[r.affiliate_id] || 0) + 1; });
      earns?.forEach((e: any) => { earnTotals[e.affiliate_id] = (earnTotals[e.affiliate_id] || 0) + Number(e.amount); });
      return { refCounts, earnTotals };
    },
  });

  const generateCode = () => {
    return "CIN" + Math.random().toString(36).substring(2, 8).toUpperCase();
  };

  const addAffiliate = async () => {
    if (!selectedUserId) { toast.error("Select a user"); return; }
    const code = customCode || generateCode();
    const { error } = await supabase.from("affiliates").insert({
      user_id: selectedUserId,
      referral_code: code,
      created_by: user?.id,
    });
    if (error) { toast.error(error.message); return; }
    toast.success("Affiliate created!");
    setSelectedUserId("");
    setCustomCode("");
    qc.invalidateQueries({ queryKey: ["admin-affiliates"] });
  };

  const toggleActive = async (id: string, current: boolean) => {
    await supabase.from("affiliates").update({ is_active: !current }).eq("id", id);
    qc.invalidateQueries({ queryKey: ["admin-affiliates"] });
  };

  const removeAffiliate = async (id: string) => {
    await supabase.from("affiliates").delete().eq("id", id);
    toast.success("Removed");
    qc.invalidateQueries({ queryKey: ["admin-affiliates"] });
  };

  const existingUserIds = new Set(affiliates?.map((a: any) => a.user_id) || []);
  const availableProfiles = allProfiles?.filter((p: any) => !existingUserIds.has(p.user_id)) || [];

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-bold flex items-center gap-2"><Users size={20} /> Affiliate Management</h2>

      {/* Add new */}
      <div className="glass rounded-xl p-4 border border-border/30 space-y-3">
        <h3 className="text-sm font-semibold">Add Marketer</h3>
        <select
          value={selectedUserId}
          onChange={(e) => setSelectedUserId(e.target.value)}
          className="w-full bg-secondary/50 border border-border/30 rounded-xl px-4 py-2.5 text-sm outline-none"
        >
          <option value="">Select user...</option>
          {availableProfiles.map((p: any) => (
            <option key={p.user_id} value={p.user_id}>
              {p.display_name || p.email} ({p.email})
            </option>
          ))}
        </select>
        <input
          value={customCode}
          onChange={(e) => setCustomCode(e.target.value.toUpperCase())}
          placeholder="Custom code (auto-generated if empty)"
          className="w-full bg-secondary/50 border border-border/30 rounded-xl px-4 py-2.5 text-sm outline-none"
        />
        <button onClick={addAffiliate} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium">
          <Plus size={14} /> Add Affiliate
        </button>
      </div>

      {/* List */}
      <div className="space-y-3">
        {affiliates?.map((a: any) => (
          <div key={a.id} className="glass rounded-xl p-4 border border-border/30">
            <div className="flex items-start justify-between mb-2">
              <div>
                <p className="text-sm font-medium">{a.profiles?.display_name || "User"}</p>
                <p className="text-xs text-muted-foreground">{a.profiles?.email}</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => toggleActive(a.id, a.is_active)}
                  className={`text-xs px-2 py-0.5 rounded-full ${a.is_active ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"}`}
                >
                  {a.is_active ? "Active" : "Inactive"}
                </button>
                <button onClick={() => removeAffiliate(a.id)} className="p-1 text-red-400 hover:bg-red-500/10 rounded">
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs font-mono bg-secondary/50 px-2 py-1 rounded">{a.referral_code}</span>
              <button onClick={() => { navigator.clipboard.writeText(a.referral_code); toast.success("Copied!"); }}>
                <Copy size={12} className="text-muted-foreground" />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>Referrals: <span className="font-semibold">{stats?.refCounts?.[a.id] || 0}</span></div>
              <div>Earnings: <span className="font-semibold">₦{(stats?.earnTotals?.[a.id] || 0).toLocaleString()}</span></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AdminAffiliates;
