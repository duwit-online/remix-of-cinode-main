import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface JellyfinResult {
  stream_url: string | null;
  download_url?: string | null;
  server_name?: string;
  item_name?: string;
  error?: string;
}

export const useJellyfinStream = (
  tmdbId: number,
  mediaType: "movie" | "tv",
  season?: number,
  episode?: number
) => {
  return useQuery<JellyfinResult>({
    queryKey: ["jellyfin-stream", tmdbId, mediaType, season, episode],
    queryFn: async () => {
      try {
        const { data, error } = await supabase.functions.invoke("jellyfin-proxy", {
          body: { tmdb_id: tmdbId, media_type: mediaType, season, episode },
        });

        if (error) {
          return { stream_url: null, download_url: null, error: error.message };
        }

        return (data as JellyfinResult) ?? { stream_url: null, download_url: null };
      } catch (error) {
        return { stream_url: null, download_url: null, error: error instanceof Error ? error.message : "Jellyfin unavailable" };
      }
    },
    enabled: !!tmdbId,
    staleTime: 5 * 60_000,
    retry: false,
  });
};
