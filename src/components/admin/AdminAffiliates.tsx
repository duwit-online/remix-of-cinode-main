import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Users, Plus, Trash2, Copy, Edit2, Search } from "lucide-react";

const AdminAffiliates = () => {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [selectedUserId, setSelectedUserId] = useState("");
  const [customCode, setCustomCode] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editCode, setEditCode] = useState("");
  const [search, setSearch] = useState("");

  const { data: data } = useQuery({
    queryKey: ["admin-affiliates"],
    queryFn: async () => {
      const [{ data: affiliates }, { data: profiles }, { data: referrals }, { data: earnings }, { data: subscriptions }] = await Promise.all([
        supabase.from("affiliates").select("*").order("created_at", { ascending: false }),
        supabase.from("profiles").select("user_id, display_name, email, created_at"),
        supabase.from("referrals").select("*"),
        supabase.from("affiliate_earnings").select("*"),
        supabase.from("subscriptions").select("user_id, status, expires_at").eq("status", "active"),
      ]);

      const profilesByUserId = new Map((profiles || []).map((profile: any) => [profile.user_id, profile]));
      const activePaidUserIds = new Set(
        (subscriptions || [])
          .filter((subscription: any) => new Date(subscription.expires_at) > new Date())
          .map((subscription: any) => subscription.user_id)
      );

      const affiliateCards = ((affiliates as any[]) || []).map((affiliate: any) => {
        const affiliateReferrals = ((referrals as any[]) || [])
          .filter((referral: any) => referral.affiliate_id === affiliate.id)
          .map((referral: any) => {
            const referredProfile = profilesByUserId.get(referral.referred_user_id);
            const isPaid = activePaidUserIds.has(referral.referred_user_id);
            return {
              ...referral,
              profile: referredProfile,
              isPaid,
            };
          })
          .sort((left: any, right: any) => new Date(right.created_at).getTime() - new Date(left.created_at).getTime());

        const affiliateEarnings = ((earnings as any[]) || []).filter((earning: any) => earning.affiliate_id === affiliate.id);
        const totalEarnings = affiliateEarnings.reduce((sum: number, earning: any) => sum + Number(earning.amount), 0);
        const pendingEarnings = affiliateEarnings.filter((earning: any) => earning.status === "pending").reduce((sum: number, earning: any) => sum + Number(earning.amount), 0);

        return {
          ...affiliate,
          profile: profilesByUserId.get(affiliate.user_id) || null,
          referrals: affiliateReferrals,
          stats: {
            referrals: affiliateReferrals.length,
            paidUsers: affiliateReferrals.filter((referral: any) => referral.isPaid).length,
            earnings: totalEarnings,
            pending: pendingEarnings,
          },
        };
      });

      return {
        affiliates: affiliateCards,
        allProfiles: (profiles as any[]) || [],
      };
    },
  });

  const generateCode = () => "CIN" + Math.random().toString(36).substring(2, 8).toUpperCase();

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

  const updateCode = async (id: string) => {
    if (!editCode.trim()) return;
    await supabase.from("affiliates").update({ referral_code: editCode.trim().toUpperCase() }).eq("id", id);
    setEditingId(null);
    setEditCode("");
    toast.success("Code updated");
    qc.invalidateQueries({ queryKey: ["admin-affiliates"] });
  };

  const removeAffiliate = async (id: string) => {
    await supabase.from("affiliates").delete().eq("id", id);
    toast.success("Removed");
    qc.invalidateQueries({ queryKey: ["admin-affiliates"] });
  };

  const affiliates = data?.affiliates || [];
  const allProfiles = data?.allProfiles || [];
  const existingUserIds = new Set(affiliates?.map((a: any) => a.user_id) || []);
  const availableProfiles = allProfiles?.filter((p: any) => !existingUserIds.has(p.user_id)) || [];
  const filteredAffiliates = affiliates.filter((affiliate: any) => {
    const haystack = `${affiliate.profile?.display_name || ""} ${affiliate.profile?.email || ""} ${affiliate.referral_code || ""}`.toLowerCase();
    return haystack.includes(search.toLowerCase());
  });

  const summary = {
    affiliates: affiliates.length,
    signups: affiliates.reduce((sum: number, affiliate: any) => sum + affiliate.stats.referrals, 0),
    paid: affiliates.reduce((sum: number, affiliate: any) => sum + affiliate.stats.paidUsers, 0),
    earnings: affiliates.reduce((sum: number, affiliate: any) => sum + affiliate.stats.earnings, 0),
  };

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-bold flex items-center gap-2"><Users size={20} /> Affiliate Management</h2>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Affiliates", value: summary.affiliates },
          { label: "Signups", value: summary.signups },
          { label: "Paid Users", value: summary.paid },
          { label: "Earnings", value: `₦${summary.earnings.toLocaleString()}` },
        ].map((item) => (
          <div key={item.label} className="glass rounded-xl border border-border/30 p-4">
            <p className="text-xs text-muted-foreground">{item.label}</p>
            <p className="text-xl font-display font-black">{item.value}</p>
          </div>
        ))}
      </div>

      <div className="glass rounded-xl p-4 border border-border/30 space-y-3">
        <h3 className="text-sm font-semibold">Add Marketer</h3>
        <select value={selectedUserId} onChange={(e) => setSelectedUserId(e.target.value)} className="w-full bg-secondary/50 border border-border/30 rounded-xl px-4 py-2.5 text-sm outline-none">
          <option value="">Select user...</option>
          {availableProfiles.map((p: any) => (
            <option key={p.user_id} value={p.user_id}>{p.display_name || p.email} ({p.email})</option>
          ))}
        </select>
        <input value={customCode} onChange={(e) => setCustomCode(e.target.value.toUpperCase())} placeholder="Custom code (auto-generated if empty)" className="w-full bg-secondary/50 border border-border/30 rounded-xl px-4 py-2.5 text-sm outline-none" />
        <button onClick={addAffiliate} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium">
          <Plus size={14} /> Add Affiliate
        </button>
      </div>

      <div className="relative">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search affiliate, email, or code" className="w-full bg-secondary/50 border border-border/30 rounded-xl pl-9 pr-4 py-2.5 text-sm outline-none" />
      </div>

      <div className="space-y-3">
        {filteredAffiliates.map((a: any) => {
          return (
            <div key={a.id} className="glass rounded-xl p-4 border border-border/30">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <p className="text-sm font-medium">{a.profile?.display_name || "User"}</p>
                  <p className="text-xs text-muted-foreground">{a.profile?.email || "No email"}</p>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => toggleActive(a.id, a.is_active)} className={`text-xs px-2 py-0.5 rounded-full ${a.is_active ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"}`}>
                    {a.is_active ? "Active" : "Inactive"}
                  </button>
                  <button onClick={() => removeAffiliate(a.id)} className="p-1 text-red-400 hover:bg-red-500/10 rounded"><Trash2 size={14} /></button>
                </div>
              </div>

              <div className="flex items-center gap-2 mb-2">
                {editingId === a.id ? (
                  <div className="flex items-center gap-2">
                    <input value={editCode} onChange={(e) => setEditCode(e.target.value.toUpperCase())} className="bg-secondary/50 border border-border/30 rounded px-2 py-1 text-xs font-mono w-32" />
                    <button onClick={() => updateCode(a.id)} className="text-xs text-primary">Save</button>
                    <button onClick={() => setEditingId(null)} className="text-xs text-muted-foreground">Cancel</button>
                  </div>
                ) : (
                  <>
                    <span className="text-xs font-mono bg-secondary/50 px-2 py-1 rounded">{a.referral_code}</span>
                    <button onClick={() => { navigator.clipboard.writeText(a.referral_code); toast.success("Copied!"); }}><Copy size={12} className="text-muted-foreground" /></button>
                    <button onClick={() => { setEditingId(a.id); setEditCode(a.referral_code); }}><Edit2 size={12} className="text-muted-foreground" /></button>
                  </>
                )}
              </div>

              <div className="grid grid-cols-4 gap-2 text-xs mb-3">
                <div>Referrals: <span className="font-semibold">{a.stats.referrals}</span></div>
                <div>Paid: <span className="font-semibold">{a.stats.paidUsers}</span></div>
                <div>Earnings: <span className="font-semibold text-green-400">₦{a.stats.earnings.toLocaleString()}</span></div>
                <div>Pending: <span className="font-semibold text-yellow-400">₦{a.stats.pending.toLocaleString()}</span></div>
              </div>

              {a.referrals.length > 0 && (
                <details className="text-xs">
                  <summary className="cursor-pointer text-muted-foreground mb-1">View referred users ({a.referrals.length})</summary>
                  <div className="divide-y divide-border/20 mt-1">
                    {a.referrals.map((r: any) => (
                      <div key={r.id} className="py-2 flex items-center justify-between gap-3">
                        <div>
                          <p className="font-medium">{r.profile?.display_name || r.profile?.email || "User"}</p>
                          <p className="text-muted-foreground">Joined {new Date(r.profile?.created_at || r.created_at).toLocaleDateString()}</p>
                        </div>
                        <span className={`rounded-full px-2 py-0.5 ${r.isPaid ? "bg-primary/20 text-primary" : "bg-secondary text-muted-foreground"}`}>
                          {r.isPaid ? "Paid" : "Free"}
                        </span>
                      </div>
                    ))}
                  </div>
                </details>
              )}

              {a.referrals.length === 0 && <p className="text-xs text-muted-foreground">No referred signups yet.</p>}
            </div>
          );
        })}

        {filteredAffiliates.length === 0 && <p className="text-sm text-muted-foreground text-center py-6">No affiliates found.</p>}
      </div>
    </div>
  );
};

export default AdminAffiliates;
