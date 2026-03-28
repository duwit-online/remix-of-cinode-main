import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { usePaymentMethods } from "@/hooks/useSubscription";
import { toast } from "sonner";
import { CreditCard, Save } from "lucide-react";

const AdminPaymentSettings = () => {
  const { user } = useAuth();
  const { data: methods } = usePaymentMethods();
  const [form, setForm] = useState({
    bank_name: "",
    account_name: "",
    account_number: "",
    crypto_wallet: "",
    other_methods: "",
  });

  useEffect(() => {
    if (methods) setForm(methods);
  }, [methods]);

  const save = async () => {
    const { data: existing } = await supabase.from("app_settings").select("id").eq("key", "payment_methods").maybeSingle();
    if (existing) {
      await supabase.from("app_settings").update({ value: form as any, updated_by: user?.id }).eq("id", existing.id);
    } else {
      await supabase.from("app_settings").insert({ key: "payment_methods", value: form as any, updated_by: user?.id });
    }
    toast.success("Payment methods saved!");
  };

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-bold flex items-center gap-2"><CreditCard size={20} /> Payment Settings</h2>
      <div className="glass rounded-xl p-4 border border-border/30 space-y-3">
        {[
          { key: "bank_name", label: "Bank Name", placeholder: "e.g. GTBank" },
          { key: "account_name", label: "Account Name", placeholder: "e.g. John Doe" },
          { key: "account_number", label: "Account Number", placeholder: "e.g. 0123456789" },
          { key: "crypto_wallet", label: "Crypto Wallet (optional)", placeholder: "BTC/USDT address" },
          { key: "other_methods", label: "Other Methods (optional)", placeholder: "PayPal, etc." },
        ].map((f) => (
          <div key={f.key}>
            <label className="text-sm font-medium mb-1 block">{f.label}</label>
            <input
              value={(form as any)[f.key]}
              onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}
              placeholder={f.placeholder}
              className="w-full bg-secondary/50 border border-border/30 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-primary/50"
            />
          </div>
        ))}
        <button onClick={save} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium">
          <Save size={14} /> Save Payment Details
        </button>
      </div>
    </div>
  );
};

export default AdminPaymentSettings;
