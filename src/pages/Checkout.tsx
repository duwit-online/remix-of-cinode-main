import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { Upload, ArrowLeft, CheckCircle, Clock, Copy } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { usePaymentMethods } from "@/hooks/useSubscription";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const Checkout = () => {
  const [params] = useSearchParams();
  const plan = params.get("plan") || "monthly";
  const amount = plan === "yearly" ? 5000 : 500;
  const { user } = useAuth();
  const navigate = useNavigate();
  const { data: methods } = usePaymentMethods();
  const [transRef, setTransRef] = useState("");
  const [senderName, setSenderName] = useState("");
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const copyText = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied!");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setLoading(true);

    let proofUrl = "";
    if (proofFile) {
      const ext = proofFile.name.split(".").pop();
      const path = `${user.id}/${Date.now()}.${ext}`;
      const { error } = await supabase.storage
        .from("payment-proofs")
        .upload(path, proofFile);
      if (!error) {
        const { data: urlData } = supabase.storage.from("payment-proofs").getPublicUrl(path);
        proofUrl = urlData.publicUrl;
      }
    }

    const { error } = await supabase.from("payment_submissions").insert({
      user_id: user.id,
      plan_type: plan,
      amount,
      proof_image_url: proofUrl,
      transaction_ref: transRef,
      sender_name: senderName,
    });

    if (error) {
      toast.error("Failed to submit: " + error.message);
    } else {
      setSubmitted(true);
    }
    setLoading(false);
  };

  if (!user) {
    navigate("/auth");
    return null;
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-background pt-20 pb-24 px-4 flex items-center justify-center">
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="text-center max-w-sm">
          <Clock size={48} className="text-yellow-500 mx-auto mb-4" />
          <h1 className="text-xl font-bold mb-2">Payment Submitted!</h1>
          <p className="text-muted-foreground text-sm mb-4">
            Your payment is pending verification. You'll be upgraded once approved by admin.
          </p>
          <div className="inline-flex items-center gap-2 bg-yellow-500/10 text-yellow-500 px-4 py-2 rounded-xl text-sm font-medium">
            <Clock size={14} /> Pending Verification
          </div>
          <button onClick={() => navigate("/")} className="block w-full mt-6 py-3 rounded-xl bg-secondary text-foreground font-medium">
            Back to Home
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pt-20 pb-24 px-4">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-md mx-auto">
        <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-muted-foreground text-sm mb-4 hover:text-foreground">
          <ArrowLeft size={16} /> Back
        </button>

        <h1 className="text-xl font-bold mb-1">Complete Payment</h1>
        <p className="text-muted-foreground text-sm mb-6">
          {plan === "yearly" ? "Yearly Plan" : "Monthly Plan"} — <span className="text-primary font-semibold">₦{amount.toLocaleString()}</span>
        </p>

        {/* Payment Details */}
        <div className="glass rounded-2xl p-4 mb-6 border border-border/30 space-y-3">
          <h3 className="font-semibold text-sm">Send Payment To:</h3>
          {methods?.bank_name && (
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Bank Name</p>
                <p className="text-sm font-medium">{methods.bank_name}</p>
              </div>
              <button onClick={() => copyText(methods.bank_name)} className="p-1.5 rounded-lg hover:bg-secondary"><Copy size={14} /></button>
            </div>
          )}
          {methods?.account_name && (
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Account Name</p>
                <p className="text-sm font-medium">{methods.account_name}</p>
              </div>
              <button onClick={() => copyText(methods.account_name)} className="p-1.5 rounded-lg hover:bg-secondary"><Copy size={14} /></button>
            </div>
          )}
          {methods?.account_number && (
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Account Number</p>
                <p className="text-sm font-medium">{methods.account_number}</p>
              </div>
              <button onClick={() => copyText(methods.account_number)} className="p-1.5 rounded-lg hover:bg-secondary"><Copy size={14} /></button>
            </div>
          )}
          {methods?.crypto_wallet && (
            <div>
              <p className="text-xs text-muted-foreground">Crypto Wallet</p>
              <p className="text-sm font-medium break-all">{methods.crypto_wallet}</p>
            </div>
          )}
          {methods?.other_methods && (
            <div>
              <p className="text-xs text-muted-foreground">Other</p>
              <p className="text-sm">{methods.other_methods}</p>
            </div>
          )}
          {!methods?.bank_name && !methods?.account_number && (
            <p className="text-sm text-muted-foreground">Payment details not yet configured by admin.</p>
          )}
        </div>

        {/* Upload Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-1 block">Sender Name</label>
            <input
              value={senderName}
              onChange={(e) => setSenderName(e.target.value)}
              placeholder="Name on your account"
              className="w-full bg-secondary/50 border border-border/30 rounded-xl px-4 py-3 text-sm outline-none focus:border-primary/50"
              required
            />
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">Transaction Reference</label>
            <input
              value={transRef}
              onChange={(e) => setTransRef(e.target.value)}
              placeholder="e.g. TXN123456"
              className="w-full bg-secondary/50 border border-border/30 rounded-xl px-4 py-3 text-sm outline-none focus:border-primary/50"
              required
            />
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">Payment Proof (Screenshot)</label>
            <label className="flex items-center gap-3 p-4 rounded-xl border-2 border-dashed border-border/50 cursor-pointer hover:border-primary/50 transition-all">
              <Upload size={20} className="text-muted-foreground" />
              <span className="text-sm text-muted-foreground">
                {proofFile ? proofFile.name : "Tap to upload screenshot"}
              </span>
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => setProofFile(e.target.files?.[0] || null)}
              />
            </label>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl bg-primary text-primary-foreground font-semibold hover:brightness-110 transition-all disabled:opacity-50"
          >
            {loading ? "Submitting..." : "Submit Payment"} <CheckCircle size={16} />
          </button>
        </form>
      </motion.div>
    </div>
  );
};

export default Checkout;
