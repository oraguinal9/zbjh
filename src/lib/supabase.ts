import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import { cookies, headers } from "next/headers";

const _supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const _supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
if (!_supabaseUrl) throw new Error("缺少环境变量: NEXT_PUBLIC_SUPABASE_URL，请在 .env.local 中配置");
if (!_supabaseAnonKey) throw new Error("缺少环境变量: NEXT_PUBLIC_SUPABASE_ANON_KEY，请在 .env.local 中配置");
const supabaseUrl: string = _supabaseUrl;
const supabaseAnonKey: string = _supabaseAnonKey;

// Client-side (browser) Supabase client
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Get current user from server request (for API routes)
// Uses cookie or Authorization header
export async function getCurrentUser() {
  let accessToken: string | null = null;

  // 1. Try simple sb-token cookie (set by saveSession)
  try {
    const cookieStore = await cookies();
    const simpleCookie = cookieStore.get("sb-token");
    if (simpleCookie?.value) {
      accessToken = simpleCookie.value;
    }
  } catch {}

  // 2. Try Supabase auth cookie (set by @supabase/ssr)
  if (!accessToken) {
    try {
      const cookieStore = await cookies();
      const projectRef = new URL(supabaseUrl).hostname.split(".")[0];
      const cookieName = `sb-${projectRef}-auth-token`;
      const authCookie = cookieStore.get(cookieName);
      if (authCookie) {
        const parsed = JSON.parse(authCookie.value);
        accessToken = parsed.access_token || null;
      }
    } catch {}
  }

  // 3. Fallback: Authorization header
  if (!accessToken) {
    try {
      const headersList = await headers();
      const authHeader = headersList.get("authorization");
      if (authHeader?.startsWith("Bearer ")) {
        accessToken = authHeader.slice(7);
      }
    } catch {}
  }

  if (!accessToken) return null;

  // Validate token with Supabase
  const { data } = await supabase.auth.getUser(accessToken);
  return data.user;
}
