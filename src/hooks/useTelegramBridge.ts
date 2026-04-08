import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useTelegramBridge(
  tmdbId: number,
  mediaType: string,
  season?: number,
  episode?: number
) {
  return useQuery({
    queryKey: ["telegramBridge", tmdbId, mediaType, season, episode],
    queryFn: async () => {
      try {
        const { data, error } = await supabase.functions.invoke("telegram-bridge", {
          body: { tmdb_id: tmdbId, media_type: mediaType, season, episode },
        });

        if (error || data?.status !== "success") return null;
        return data as { stream_url: string; file_name: string; cached: boolean };
      } catch {
        return null;
      }
    },
    retry: false,
    staleTime: 5 * 60_000,
  });
}
