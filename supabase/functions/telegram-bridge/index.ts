import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { tmdb_id, media_type, season, episode, title } = await req.json();

    if (!tmdb_id) {
      return new Response(JSON.stringify({ error: "tmdb_id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    // Check cache first
    let query = supabase
      .from("media_sources")
      .select("*")
      .eq("tmdb_id", tmdb_id)
      .eq("media_type", media_type || "movie")
      .eq("source", "telegram_bridge")
      .eq("is_active", true);

    if (media_type === "tv" && season && episode) {
      query = query.eq("season", season).eq("episode", episode);
    }

    const { data: cached } = await query.maybeSingle();

    if (cached?.stream_url) {
      return new Response(JSON.stringify({ status: "success", stream_url: cached.stream_url, file_name: cached.file_name, cached: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Call Telegram Bridge API
    let searchQuery = `${tmdb_id}`;
    if (media_type === "tv" && season && episode) {
      searchQuery = `${tmdb_id} S${String(season).padStart(2, "0")}E${String(episode).padStart(2, "0")}`;
    }

    const bridgeUrl = `http://163.245.223.36:9090/play?tmdbid=${encodeURIComponent(searchQuery)}`;

    let bridgeRes: Response;

    try {
      bridgeRes = await fetch(bridgeUrl, {
        headers: { "x-api-key": "cinode" },
        signal: AbortSignal.timeout(5000),
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Bridge unavailable";
      return new Response(JSON.stringify({ status: "unavailable", error: message }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!bridgeRes.ok) {
      return new Response(JSON.stringify({ status: "not_found" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const bridgeData = await bridgeRes.json();

    if (bridgeData.status === "success" && bridgeData.stream_url) {
      // Cache to DB
      await supabase.from("media_sources").upsert({
        tmdb_id,
        media_type: media_type || "movie",
        season: media_type === "tv" ? season : null,
        episode: media_type === "tv" ? episode : null,
        title: title || null,
        stream_url: bridgeData.stream_url,
        file_name: bridgeData.file_name || null,
        source: "telegram_bridge",
      }, { onConflict: "tmdb_id,media_type,season,episode,source" });

      return new Response(JSON.stringify({
        status: "success",
        stream_url: bridgeData.stream_url,
        file_name: bridgeData.file_name,
        cached: false,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ status: "not_found" }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ status: "unavailable", error: e instanceof Error ? e.message : "Bridge unavailable" }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
