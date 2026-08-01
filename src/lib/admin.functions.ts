import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * Bootstrap: the first signed-in user who runs this becomes the mess manager.
 * Once an admin exists, only an existing admin can grant the role to someone else.
 */
export const claimAdminRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { count, error: countError } = await supabaseAdmin
      .from("user_roles")
      .select("id", { count: "exact", head: true })
      .eq("role", "admin");
    if (countError) throw countError;

    if ((count ?? 0) > 0) {
      const { data: isAdmin } = await context.supabase.rpc("has_role", {
        _user_id: context.userId,
        _role: "admin",
      });
      if (!isAdmin) throw new Error("An administrator already exists for this mess.");
      return { granted: false, alreadyAdmin: true };
    }

    const { error } = await supabaseAdmin
      .from("user_roles")
      .insert({ user_id: context.userId, role: "admin" });
    if (error) throw error;
    return { granted: true, alreadyAdmin: false };
  });

/** An existing admin promotes another account by email. */
export const grantAdminByEmail = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { email: string }) => ({ email: String(input.email).trim().toLowerCase() }))
  .handler(async ({ data, context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (!isAdmin) throw new Error("Forbidden");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: profile, error } = await supabaseAdmin
      .from("profiles")
      .select("id")
      .eq("email", data.email)
      .maybeSingle();
    if (error) throw error;
    if (!profile) throw new Error("No account found with that email.");

    const { error: insertError } = await supabaseAdmin
      .from("user_roles")
      .upsert({ user_id: profile.id, role: "admin" }, { onConflict: "user_id,role" });
    if (insertError) throw insertError;
    return { granted: true };
  });
