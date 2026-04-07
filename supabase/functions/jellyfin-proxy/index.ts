import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, range",
  "Access-Control-Expose-Headers": "Content-Range, Content-Length, Accept-Ranges",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, serviceRoleKey);

  try {
    const url = new URL(req.url);

    // MODE 1: Streaming proxy — GET /jellyfin-proxy?stream=1&server_id=X&item_id=Y
    if (req.method === "GET" && url.searchParams.get("stream") === "1") {
      const serverId = url.searchParams.get("server_id");
      const itemId = url.searchParams.get("item_id");

      if (!serverId || !itemId) {
        return new Response(JSON.stringify({ error: "server_id and item_id required" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: server } = await supabase
        .from("streaming_servers")
        .select("*")
        .eq("id", serverId)
        .eq("is_enabled", true)
        .single();

      if (!server) {
        return new Response(JSON.stringify({ error: "Server not found" }), {
          status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const baseUrl = server.server_url.replace(/\/$/, "");
      const apiKey = server.api_key_encrypted;

      // Try HLS first, then direct stream
      const streamUrls = [
        `${baseUrl}/Videos/${itemId}/stream?api_key=${apiKey}&Static=true`,
      ];

      for (const targetUrl of streamUrls) {
        try {
          const fetchHeaders: Record<string, string> = {};
          const rangeHeader = req.headers.get("range");
          if (rangeHeader) fetchHeaders["Range"] = rangeHeader;

          const upstream = await fetch(targetUrl, {
            headers: fetchHeaders,
            redirect: "follow",
          });

          if (!upstream.ok && upstream.status !== 206) continue;

          const responseHeaders: Record<string, string> = { ...corsHeaders };

          // Forward important headers
          const forwardHeaders = [
            "content-type", "content-length", "content-range",
            "accept-ranges", "content-disposition",
          ];
          for (const h of forwardHeaders) {
            const v = upstream.headers.get(h);
            if (v) responseHeaders[h] = v;
          }

          if (!responseHeaders["accept-ranges"]) {
            responseHeaders["Accept-Ranges"] = "bytes";
          }

          return new Response(upstream.body, {
            status: upstream.status,
            headers: responseHeaders,
          });
        } catch (e) {
          console.error("Stream proxy error:", e);
          continue;
        }
      }

      return new Response(JSON.stringify({ error: "Failed to stream" }), {
        status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // MODE 2: Search — POST with { tmdb_id, media_type, season, episode }
    const { tmdb_id, media_type, season, episode } = await req.json();

    if (!tmdb_id || !media_type) {
      return new Response(JSON.stringify({ error: "tmdb_id and media_type are required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: servers, error: srvErr } = await supabase
      .from("streaming_servers")
      .select("*")
      .eq("is_enabled", true)
      .eq("server_type", "jellyfin")
      .order("priority", { ascending: false });

    if (srvErr || !servers || servers.length === 0) {
      return new Response(JSON.stringify({ error: "No enabled Jellyfin servers found", stream_url: null }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    for (const server of servers) {
      try {
        const baseUrl = server.server_url.replace(/\/$/, "");
        const apiKey = server.api_key_encrypted;

        // Search for item by TMDB provider ID — try multiple formats
        const searchVariants = [
          `${baseUrl}/Items?api_key=${apiKey}&Recursive=true&AnyProviderIdEquals=Tmdb.${tmdb_id}&IncludeItemTypes=${media_type === "movie" ? "Movie" : "Series"}&Fields=ProviderIds,MediaSources,Path`,
          `${baseUrl}/Items?api_key=${apiKey}&Recursive=true&AnyProviderIdEquals=tmdb.${tmdb_id}&IncludeItemTypes=${media_type === "movie" ? "Movie" : "Series"}&Fields=ProviderIds,MediaSources,Path`,
        ];

        let items: any[] = [];
        for (const searchUrl of searchVariants) {
          try {
            const searchRes = await fetch(searchUrl);
            if (!searchRes.ok) continue;
            const searchData = await searchRes.json();
            items = searchData.Items || [];
            if (items.length > 0) break;
          } catch { continue; }
        }

        // Also try searching by name as last resort
        if (items.length === 0) {
          // Could add name-based search here later
          continue;
        }

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

        const itemId = targetItem.Id;

        // Return the proxy URL instead of direct Jellyfin URL
        const proxyStreamUrl = `${supabaseUrl}/functions/v1/jellyfin-proxy?stream=1&server_id=${server.id}&item_id=${itemId}`;

        return new Response(JSON.stringify({
          stream_url: proxyStreamUrl,
          server_name: server.name,
          item_name: targetItem.Name,
          item_id: itemId,
          server_id: server.id,
          media_sources: targetItem.MediaSources || [],
        }), {
          status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      } catch (e) {
        console.error(`Server ${server.name} failed:`, e);
        continue;
      }
    }

    return new Response(JSON.stringify({ stream_url: null, error: "Content not found on any server" }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("jellyfin-proxy error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
