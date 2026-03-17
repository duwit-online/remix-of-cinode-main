import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export const useWatchlist = () => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["watchlist", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data } = await supabase
        .from("watchlist")
        .select("*")
        .eq("user_id", user.id)
        .order("added_at", { ascending: false });
      return (data as any[]) || [];
    },
    enabled: !!user,
  });
};

export const useIsInWatchlist = (tmdbId: number, mediaType: string) => {
  const { data: watchlist } = useWatchlist();
  return watchlist?.some((w: any) => w.tmdb_id === tmdbId && w.media_type === mediaType) || false;
};

export const useToggleWatchlist = () => {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ tmdbId, mediaType, title, posterPath, isInList }: {
      tmdbId: number; mediaType: string; title: string; posterPath: string; isInList: boolean;
    }) => {
      if (!user) throw new Error("Not authenticated");
      if (isInList) {
        await supabase.from("watchlist").delete().eq("user_id", user.id).eq("tmdb_id", tmdbId).eq("media_type", mediaType);
      } else {
        await supabase.from("watchlist").insert({ user_id: user.id, tmdb_id: tmdbId, media_type: mediaType, title, poster_path: posterPath } as any);
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["watchlist"] }),
  });
};
