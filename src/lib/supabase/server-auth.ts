import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * First authenticated server route in this codebase (우선순위 5 Phase 1,
 * docs/TASKS.md) — every other API route trusts the client-supplied body
 * with no identity check. Deliberately lightweight: no @supabase/ssr, no
 * server session/cookie handling — just verifies the bearer token the
 * client already holds via getSupabaseBrowserClient()'s session.
 */
export class AuthError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

/**
 * Verifies the caller is signed in AND has profiles.role === "admin".
 * Returns a Supabase client carrying the caller's token (so subsequent
 * `.from(...)` queries resolve `auth.uid()` correctly under RLS) alongside
 * the verified user — callers use this client to read/write admin-only
 * tables instead of trusting the request body's own claims.
 */
export async function requireAdmin(request: Request): Promise<{ supabase: SupabaseClient; userId: string }> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) throw new AuthError("Supabase가 설정되지 않았습니다.", 500);

  const token = (request.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
  if (!token) throw new AuthError("인증이 필요합니다.", 401);

  const supabase = createClient(url, anonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser(token);
  if (userError || !user) throw new AuthError("인증이 필요합니다.", 401);

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (profileError || profile?.role !== "admin") throw new AuthError("관리자만 접근할 수 있습니다.", 403);

  return { supabase, userId: user.id };
}
