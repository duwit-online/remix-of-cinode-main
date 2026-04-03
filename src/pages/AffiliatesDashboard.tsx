import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Copy, Users, DollarSign, TrendingUp, ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const AffiliatesDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const { data: affiliate } = useQuery({
    queryKey: ["my-affiliate", user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data } = await supabase
        .from("affiliates")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();
      return data;
    },
    enabled: !!user,
  });

  const { data: referrals } = useQuery({
    queryKey: ["my-referrals", affiliate?.id],
    queryFn: async () => {
      if (!affiliate) return [];
      const { data: referralRows } = await supabase.from("referrals").select("*").eq("affiliate_id", affiliate.id).order("created_at", { ascending: false });
      const referredUserIds = [...new Set(((referralRows as any[]) || []).map((row: any) => row.referred_user_id))];
      const { data: profiles } = referredUserIds.length ? await supabase.from("profiles").select("user_id, display_name, email, created_at").in("user_id", referredUserIds) : { data: [] };
      const { data: subscriptions } = referredUserIds.length ? await supabase.from("subscriptions").select("user_id, status, expires_at").in("user_id", referredUserIds).eq("status", "active") : { data: [] };
      const profilesByUserId = new Map((profiles || []).map((profile: any) => [profile.user_id, profile]));
      const paidUserIds = new Set(((subscriptions as any[]) || []).filter((sub: any) => new Date(sub.expires_at) > new Date()).map((sub: any) => sub.user_id));

      return ((referralRows as any[]) || []).map((row: any) => ({
        ...row,
        profile: profilesByUserId.get(row.referred_user_id) || null,
        isPaid: paidUserIds.has(row.referred_user_id),
      }));
    },
    enabled: !!affiliate,
  });

  const { data: earnings } = useQuery({
    queryKey: ["my-earnings", affiliate?.id],
    queryFn: async () => {
      if (!affiliate) return [];
      const { data } = await supabase
        .from("affiliate_earnings")
        .select("*")
        .eq("affiliate_id", affiliate.id)
        .order("created_at", { ascending: false });
      return (data as any[]) || [];
    },
    enabled: !!affiliate,
  });

  if (!user) {
    navigate("/auth");
    return null;
  }

  if (!affiliate) {
    return (
      <div className="min-h-screen bg-background pt-20 pb-24 px-4 flex items-center justify-center">
        <div className="text-center">
          <Users size={48} className="text-muted-foreground mx-auto mb-4" />
          <h1 className="text-xl font-bold mb-2">Not an Affiliate</h1>
          <p className="text-muted-foreground text-sm">Contact admin to become a marketer.</p>
        </div>
      </div>
    );
  }

  const totalEarnings = earnings?.reduce((s, e) => s + Number(e.amount), 0) || 0;
  const paidEarnings = earnings?.filter((e) => e.status === "paid").reduce((s, e) => s + Number(e.amount), 0) || 0;
  const pendingEarnings = totalEarnings - paidEarnings;

  const stats = [
    { label: "Referred Users", value: referrals?.length || 0, icon: Users, color: "text-blue-400" },
    { label: "Total Earnings", value: `₦${totalEarnings.toLocaleString()}`, icon: DollarSign, color: "text-green-400" },
    { label: "Pending", value: `₦${pendingEarnings.toLocaleString()}`, icon: TrendingUp, color: "text-yellow-400" },
  ];

  return (
    <div className="min-h-screen bg-background pt-20 pb-24 px-4">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-2xl mx-auto">
        <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-muted-foreground text-sm mb-4">
          <ArrowLeft size={16} /> Back
        </button>
        <h1 className="text-xl font-bold mb-4">Affiliate Dashboard</h1>

        {/* Referral Code */}
        <div className="glass rounded-2xl p-4 border border-border/30 mb-4">
          <p className="text-xs text-muted-foreground mb-1">Your Referral Code</p>
          <div className="flex items-center gap-3">
            <span className="text-lg font-mono font-bold text-primary">{affiliate.referral_code}</span>
            <button
              onClick={() => { navigator.clipboard.writeText(affiliate.referral_code); toast.success("Copied!"); }}
              className="p-2 rounded-lg bg-secondary hover:bg-secondary/80"
            >
              <Copy size={14} />
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          {stats.map((s, i) => (
            <div key={i} className="glass rounded-xl p-3 border border-border/30 text-center">
              <s.icon size={20} className={`${s.color} mx-auto mb-1`} />
              <p className="text-lg font-bold">{s.value}</p>
              <p className="text-xs text-muted-foreground">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Referred Users Table */}
        <h2 className="font-semibold text-sm mb-2">Referred Users</h2>
        <div className="glass rounded-2xl border border-border/30 overflow-hidden mb-6">
          {referrals && referrals.length > 0 ? (
            <div className="divide-y divide-border/20">
              {referrals.map((r: any) => (
                <div key={r.id} className="p-3 flex items-center justify-between">
                  <div>
                      <p className="text-sm font-medium">{r.profile?.display_name || "User"}</p>
                      <p className="text-xs text-muted-foreground">{r.profile?.email}</p>
                  </div>
                    <div className="text-right">
                      <span className={`text-[10px] rounded-full px-2 py-0.5 ${r.isPaid ? "bg-primary/20 text-primary" : "bg-secondary text-muted-foreground"}`}>{r.isPaid ? "Paid" : "Free"}</span>
                      <p className="text-xs text-muted-foreground mt-1">{new Date(r.created_at).toLocaleDateString()}</p>
                    </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="p-4 text-sm text-muted-foreground text-center">No referrals yet</p>
          )}
        </div>

        {/* Earnings */}
        <h2 className="font-semibold text-sm mb-2">Earnings History</h2>
        <div className="glass rounded-2xl border border-border/30 overflow-hidden">
          {earnings && earnings.length > 0 ? (
            <div className="divide-y divide-border/20">
              {earnings.map((e: any) => (
                <div key={e.id} className="p-3 flex items-center justify-between">
                  <span className="text-sm">₦{Number(e.amount).toLocaleString()}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    e.status === "paid" ? "bg-green-500/20 text-green-400" : "bg-yellow-500/20 text-yellow-400"
                  }`}>{e.status}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="p-4 text-sm text-muted-foreground text-center">No earnings yet</p>
          )}
        </div>
      </motion.div>
    </div>
  );
};

export default AffiliatesDashboard;
