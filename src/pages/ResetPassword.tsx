import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Lock, ArrowRight, Eye, EyeOff } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const ResetPassword = () => {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    // Check if this is a recovery flow
    const hash = window.location.hash;
    if (!hash.includes("type=recovery")) {
      // Still allow the page — user may have already been auto-logged in
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (password.length < 6) { setError("Password must be at least 6 characters."); return; }
    if (password !== confirm) { setError("Passwords do not match."); return; }
    setLoading(true);

    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      setError(error.message);
    } else {
      setSuccess(true);
      setTimeout(() => navigate("/app"), 2000);
    }
    setLoading(false);
  };

  if (success) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center">
          <h1 className="text-2xl font-display font-bold text-primary mb-2">Password Updated!</h1>
          <p className="text-muted-foreground text-sm">Redirecting you to the app...</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-display font-black text-gradient mb-2">CINODE</h1>
          <p className="text-muted-foreground text-sm">Set your new password below.</p>
        </div>

        <form onSubmit={handleSubmit} className="glass rounded-3xl p-6 border border-border/30 space-y-4">
          {error && (
            <div className="bg-destructive/10 border border-destructive/30 rounded-xl px-4 py-2 text-sm text-destructive">{error}</div>
          )}

          <div className="relative">
            <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input type={showPw ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="New password" className="w-full bg-secondary/50 border border-border/30 rounded-xl pl-11 pr-11 py-3 text-sm outline-none focus:border-primary/50" required />
            <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
              {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>

          <div className="relative">
            <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input type={showPw ? "text" : "password"} value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder="Confirm new password" className="w-full bg-secondary/50 border border-border/30 rounded-xl pl-11 pr-4 py-3 text-sm outline-none focus:border-primary/50" required />
          </div>

          <button type="submit" disabled={loading} className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:brightness-110 transition-all glow-primary disabled:opacity-50">
            {loading ? "Updating..." : "Update Password"}
            <ArrowRight size={16} />
          </button>
        </form>
      </motion.div>
    </div>
  );
};

export default ResetPassword;
