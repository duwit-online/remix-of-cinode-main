import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export const useSubscription = () => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["subscription", user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data } = await supabase
        .from("subscriptions")
        .select("*")
        .eq("user_id", user.id)
        .eq("status", "active")
        .gte("expires_at", new Date().toISOString())
        .order("expires_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      return data;
    },
    enabled: !!user,
  });
};

export const useIsPremium = () => {
  const { data: sub, isLoading } = useSubscription();
  return { isPremium: !!sub, isLoading };
};

export const usePaymentMethods = () => {
  return useQuery({
    queryKey: ["payment-methods"],
    queryFn: async () => {
      const { data } = await supabase
        .from("app_settings")
        .select("*")
        .eq("key", "payment_methods")
        .maybeSingle();
      return (data?.value as any) || {
        bank_name: "",
        account_name: "",
        account_number: "",
        crypto_wallet: "",
        other_methods: "",
      };
    },
  });
};
