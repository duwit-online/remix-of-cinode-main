import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { Eye, EyeOff, Mail, Lock, User, ArrowRight } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

const Auth = () => {
  const [searchParams] = useSearchParams();
  const [isLogin, setIsLogin] = useState(searchParams.get("mode") !== "signup");
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [forgotMode, setForgotMode] = useState(false);
  const navigate = useNavigate();
  const { signIn, signUp } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    if (forgotMode) {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) setError(error.message);
      else setSuccess("Password reset link sent to your email. Check your inbox.");
      setLoading(false);
      return;
    }

    if (isLogin) {
      const { error } = await signIn(email, password);
      if (error) {
        setError(error.message);
      } else {
        if (!rememberMe) {
          // Session will still work but won't persist on close
          sessionStorage.setItem("cinode_no_persist", "1");
        }
        navigate("/app");
      }
    } else {
      const { error } = await signUp(email, password, name);
      if (error) {
        setError(error.message);
      } else {
        navigate("/app");
      }
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-display font-black text-gradient mb-2">CINODE</h1>
          <p className="text-muted-foreground text-sm">
            {forgotMode
              ? "Enter your email to reset your password."
              : isLogin
              ? "Welcome back! Sign in to continue."
              : "Create your account to get started."}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="glass rounded-3xl p-6 border border-border/30 space-y-4">
          {error && (
            <div className="bg-destructive/10 border border-destructive/30 rounded-xl px-4 py-2 text-sm text-destructive">{error}</div>
          )}
          {success && (
            <div className="bg-primary/10 border border-primary/30 rounded-xl px-4 py-2 text-sm text-primary">{success}</div>
          )}

          {!isLogin && !forgotMode && (
            <div className="relative">
              <User size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Full name" className="w-full bg-secondary/50 border border-border/30 rounded-xl pl-11 pr-4 py-3 text-sm outline-none focus:border-primary/50" required />
            </div>
          )}

          <div className="relative">
            <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email address" className="w-full bg-secondary/50 border border-border/30 rounded-xl pl-11 pr-4 py-3 text-sm outline-none focus:border-primary/50" required />
          </div>

          {!forgotMode && (
            <div className="relative">
              <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input type={showPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" className="w-full bg-secondary/50 border border-border/30 rounded-xl pl-11 pr-11 py-3 text-sm outline-none focus:border-primary/50" required />
              <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          )}

          {isLogin && !forgotMode && (
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={() => setRememberMe(!rememberMe)}
                  className="w-4 h-4 rounded border-border accent-primary"
                />
                <span className="text-xs text-muted-foreground">Remember me</span>
              </label>
              <button
                type="button"
                onClick={() => { setForgotMode(true); setError(""); setSuccess(""); }}
                className="text-xs text-primary hover:underline"
              >
                Forgot password?
              </button>
            </div>
          )}

          <button type="submit" disabled={loading} className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:brightness-110 transition-all glow-primary disabled:opacity-50">
            {loading ? "Please wait..." : forgotMode ? "Send Reset Link" : isLogin ? "Sign In" : "Create Account"}
            <ArrowRight size={16} />
          </button>
        </form>

        <p className="text-center text-sm text-muted-foreground mt-4">
          {forgotMode ? (
            <button onClick={() => { setForgotMode(false); setError(""); setSuccess(""); }} className="text-primary font-semibold hover:underline">
              Back to Sign In
            </button>
          ) : (
            <>
              {isLogin ? "Don't have an account?" : "Already have an account?"}{" "}
              <button onClick={() => { setIsLogin(!isLogin); setError(""); setSuccess(""); }} className="text-primary font-semibold hover:underline">
                {isLogin ? "Sign Up" : "Sign In"}
              </button>
            </>
          )}
        </p>
      </motion.div>
    </div>
  );
};

export default Auth;
