import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { tmdb_id, media_type, season, episode } = await req.json();

    if (!tmdb_id || !media_type) {
      return new Response(JSON.stringify({ error: "tmdb_id and media_type are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Get all enabled streaming servers ordered by priority
    const { data: servers, error: srvErr } = await supabase
      .from("streaming_servers")
      .select("*")
      .eq("is_enabled", true)
      .eq("server_type", "jellyfin")
      .order("priority", { ascending: false });

    if (srvErr || !servers || servers.length === 0) {
      return new Response(JSON.stringify({ error: "No enabled Jellyfin servers found", stream_url: null }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Try each server in priority order
    for (const server of servers) {
      try {
        const baseUrl = server.server_url.replace(/\/$/, "");
        const apiKey = server.api_key_encrypted; // stored as plain text, protected by RLS

        // Search for item by TMDB provider ID
        const searchUrl = `${baseUrl}/Items?api_key=${apiKey}&Recursive=true&HasTmdbId=true&AnyProviderIdEquals=Tmdb.${tmdb_id}&IncludeItemTypes=${media_type === "movie" ? "Movie" : "Series"}&Fields=ProviderIds,MediaSources,Path`;

        const searchRes = await fetch(searchUrl);
        if (!searchRes.ok) continue;

        const searchData = await searchRes.json();
        const items = searchData.Items || [];

        if (items.length === 0) continue;

        let targetItem = items[0];

        // For TV shows, find the specific episode
        if (media_type === "tv" && season && episode) {
          const episodeUrl = `${baseUrl}/Shows/${targetItem.Id}/Episodes?api_key=${apiKey}&Season=${season}&Fields=MediaSources,Path`;
          const epRes = await fetch(episodeUrl);
          if (!epRes.ok) continue;

          const epData = await epRes.json();
          const ep = (epData.Items || []).find((e: any) => e.IndexNumber === episode);
          if (!ep) continue;
          targetItem = ep;
        }

        // Build the direct stream URL
        const itemId = targetItem.Id;
        const streamUrl = `${baseUrl}/Videos/${itemId}/stream?api_key=${apiKey}&Static=true`;

        return new Response(JSON.stringify({
          stream_url: streamUrl,
          server_name: server.name,
          item_name: targetItem.Name,
          item_id: itemId,
          media_sources: targetItem.MediaSources || [],
        }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      } catch (e) {
        console.error(`Server ${server.name} failed:`, e);
        continue;
      }
    }

    // No server had the content
    return new Response(JSON.stringify({ stream_url: null, error: "Content not found on any server" }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("jellyfin-proxy error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
