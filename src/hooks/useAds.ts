import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const useActiveAds = (placement?: string) => {
  return useQuery({
    queryKey: ["ads", placement],
    queryFn: async () => {
      let query = supabase.from("ads").select("*").eq("is_active", true);
      if (placement) query = query.eq("placement", placement);
      const { data } = await query.order("priority", { ascending: false });
      return (data as any[]) || [];
    },
    staleTime: 60_000,
  });
};

export const useTrackAdClick = () => {
  return async (adId: string) => {
    await supabase.rpc("increment_ad_clicks" as any, { ad_id: adId }).catch(() => {
      // Fallback: just track client-side
    });
  };
};
