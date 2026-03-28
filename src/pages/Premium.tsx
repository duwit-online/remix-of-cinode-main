import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Crown, Check, ArrowRight, Zap, Ban, Star } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useIsPremium } from "@/hooks/useSubscription";

const plans = [
  { id: "monthly", label: "Monthly", price: "₦500", period: "/month", days: 30 },
  { id: "yearly", label: "Yearly", price: "₦5,000", period: "/year", days: 365, badge: "Save 17%" },
];

const features = [
  { icon: Ban, text: "Remove all ads completely" },
  { icon: Zap, text: "Faster streaming priority" },
  { icon: Star, text: "Early access to new content" },
  { icon: Crown, text: "Premium badge on profile" },
];

const Premium = () => {
  const { user } = useAuth();
  const { isPremium } = useIsPremium();
  const navigate = useNavigate();
  const [selected, setSelected] = useState("monthly");

  if (isPremium) {
    return (
      <div className="min-h-screen bg-background pt-20 pb-24 px-4 flex items-center justify-center">
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="text-center">
          <Crown size={48} className="text-yellow-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold mb-2">You're Premium!</h1>
          <p className="text-muted-foreground">Enjoy all premium features.</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pt-20 pb-24 px-4">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-md mx-auto">
        <div className="text-center mb-8">
          <Crown size={40} className="text-yellow-500 mx-auto mb-3" />
          <h1 className="text-2xl font-bold mb-1">Upgrade to Premium</h1>
          <p className="text-muted-foreground text-sm">Unlock the best experience</p>
        </div>

        <div className="space-y-3 mb-6">
          {plans.map((plan) => (
            <button
              key={plan.id}
              onClick={() => setSelected(plan.id)}
              className={`w-full flex items-center justify-between p-4 rounded-2xl border-2 transition-all ${
                selected === plan.id
                  ? "border-primary bg-primary/10"
                  : "border-border/30 bg-secondary/30"
              }`}
            >
              <div className="text-left">
                <div className="flex items-center gap-2">
                  <span className="font-semibold">{plan.label}</span>
                  {plan.badge && (
                    <span className="text-xs bg-green-500/20 text-green-400 px-2 py-0.5 rounded-full">
                      {plan.badge}
                    </span>
                  )}
                </div>
                <span className="text-muted-foreground text-sm">{plan.price}{plan.period}</span>
              </div>
              <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                selected === plan.id ? "border-primary bg-primary" : "border-muted-foreground"
              }`}>
                {selected === plan.id && <Check size={12} className="text-primary-foreground" />}
              </div>
            </button>
          ))}
        </div>

        <div className="glass rounded-2xl p-4 mb-6 border border-border/30">
          <h3 className="font-semibold text-sm mb-3">What you get:</h3>
          <div className="space-y-2">
            {features.map((f, i) => (
              <div key={i} className="flex items-center gap-3 text-sm">
                <f.icon size={16} className="text-primary shrink-0" />
                <span>{f.text}</span>
              </div>
            ))}
          </div>
        </div>

        <button
          onClick={() => {
            if (!user) { navigate("/auth"); return; }
            navigate(`/checkout?plan=${selected}`);
          }}
          className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl bg-primary text-primary-foreground font-semibold hover:brightness-110 transition-all"
        >
          Continue to Payment <ArrowRight size={16} />
        </button>
      </motion.div>
    </div>
  );
};

export default Premium;
