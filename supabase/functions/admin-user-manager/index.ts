import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const authHeader = req.headers.get("Authorization");

    if (!authHeader) {
      return json({ error: "Missing authorization" }, 401);
    }

    const authClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const adminClient = createClient(supabaseUrl, serviceRoleKey);
    const { data: authData, error: authError } = await authClient.auth.getUser();

    if (authError || !authData.user) {
      return json({ error: "Unauthorized" }, 401);
    }

    const { data: adminRole } = await adminClient
      .from("user_roles")
      .select("id")
      .eq("user_id", authData.user.id)
      .eq("role", "admin")
      .maybeSingle();

    if (!adminRole) {
      return json({ error: "Forbidden" }, 403);
    }

    const payload = await req.json();
    const { action } = payload;

    if (action === "create_user") {
      const { email, password, displayName, isAdmin } = payload;
      if (!email || !password) {
        return json({ error: "Email and password are required" }, 400);
      }

      const { data: createdUser, error: createError } = await adminClient.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { display_name: displayName || email.split("@")[0] },
      });

      if (createError || !createdUser.user) {
        return json({ error: createError?.message || "Could not create user" }, 400);
      }

      await adminClient.from("profiles").upsert({
        user_id: createdUser.user.id,
        email,
        display_name: displayName || email.split("@")[0],
      });

      if (isAdmin) {
        await adminClient.from("user_roles").upsert({ user_id: createdUser.user.id, role: "admin" }, { onConflict: "user_id,role" });
      }

      return json({ ok: true, user_id: createdUser.user.id });
    }

    if (action === "update_profile") {
      const { userId, displayName, email } = payload;
      if (!userId) return json({ error: "Missing userId" }, 400);

      await adminClient.from("profiles").update({
        display_name: displayName || null,
        email: email || null,
      }).eq("user_id", userId);

      if (email) {
        const { error } = await adminClient.auth.admin.updateUserById(userId, { email });
        if (error) {
          return json({ error: error.message }, 400);
        }
      }

      return json({ ok: true });
    }

    if (action === "set_admin") {
      const { userId, makeAdmin } = payload;
      if (!userId) return json({ error: "Missing userId" }, 400);

      if (makeAdmin) {
        const { error } = await adminClient.from("user_roles").upsert({ user_id: userId, role: "admin" }, { onConflict: "user_id,role" });
        if (error) return json({ error: error.message }, 400);
      } else {
        const { error } = await adminClient.from("user_roles").delete().eq("user_id", userId).eq("role", "admin");
        if (error) return json({ error: error.message }, 400);
      }

      return json({ ok: true });
    }

    if (action === "delete_user") {
      const { userId } = payload;
      if (!userId) return json({ error: "Missing userId" }, 400);
      if (userId === authData.user.id) return json({ error: "You cannot delete your own account here" }, 400);

      const { data: affiliateRows } = await adminClient.from("affiliates").select("id").eq("user_id", userId);
      const affiliateIds = (affiliateRows || []).map((row: { id: string }) => row.id);

      if (affiliateIds.length > 0) {
        await adminClient.from("affiliate_earnings").delete().in("affiliate_id", affiliateIds);
        await adminClient.from("referrals").delete().in("affiliate_id", affiliateIds);
        await adminClient.from("affiliates").delete().in("id", affiliateIds);
      }

      await adminClient.from("referrals").delete().eq("referred_user_id", userId);
      await adminClient.from("subscriptions").delete().eq("user_id", userId);
      await adminClient.from("payment_submissions").delete().eq("user_id", userId);
      await adminClient.from("watchlist").delete().eq("user_id", userId);
      await adminClient.from("notifications").delete().eq("user_id", userId);
      await adminClient.from("user_roles").delete().eq("user_id", userId);
      await adminClient.from("profiles").delete().eq("user_id", userId);

      const { error } = await adminClient.auth.admin.deleteUser(userId);
      if (error) {
        return json({ error: error.message }, 400);
      }

      return json({ ok: true });
    }

    return json({ error: "Unsupported action" }, 400);
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : "Unexpected error" }, 500);
  }
});