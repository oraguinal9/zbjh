"use client";

import { createBrowserClient } from "@supabase/ssr";

const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// Auto-refresh session token every 25 minutes to prevent expiry during long writing sessions
let refreshTimer: ReturnType<typeof setInterval> | null = null;

export function startTokenRefresh() {
  if (refreshTimer) return;
  refreshTimer = setInterval(async () => {
    const { data } = await supabase.auth.refreshSession();
    if (data.session?.access_token) {
      localStorage.setItem("sb-token", data.session.access_token);
      document.cookie = `sb-token=${data.session.access_token}; path=/; max-age=86400; SameSite=Lax`;
    }
  }, 25 * 60 * 1000);
}

export function stopTokenRefresh() {
  if (refreshTimer) { clearInterval(refreshTimer); refreshTimer = null; }
}

// Auto-start on import (Next.js module cache ensures single instance)
if (typeof window !== "undefined") startTokenRefresh();

export async function signIn(email: string, password: string) {
  return supabase.auth.signInWithPassword({ email, password });
}

export async function signUp(email: string, password: string) {
  return supabase.auth.signUp({ email, password });
}

export async function signOut() {
  localStorage.removeItem("sb-token");
  document.cookie = "sb-token=; path=/; max-age=0";
  return supabase.auth.signOut();
}

export async function resetPassword(email: string) {
  return supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/auth/update-password`,
  });
}

export async function updatePassword(password: string) {
  return supabase.auth.updateUser({ password });
}

// Save token after login for API auth + server component cookie
export async function saveSession() {
  const { data } = await supabase.auth.getSession();
  if (data.session?.access_token) {
    const token = data.session.access_token;
    localStorage.setItem("sb-token", token);
    document.cookie = `sb-token=${token}; path=/; max-age=86400; SameSite=Lax`;
  }
  return data.session;
}

// Get stored token for API calls
export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("sb-token");
}

// Fetch wrapper that adds auth header
export async function authFetch(url: string, options?: RequestInit): Promise<Response> {
  const token = getToken();
  const headers: Record<string, string> = {};
  if (options?.headers) {
    if (options.headers instanceof Headers) {
      options.headers.forEach((v, k) => { headers[k] = v; });
    } else if (Array.isArray(options.headers)) {
      options.headers.forEach(([k, v]) => { headers[k] = v; });
    } else {
      Object.assign(headers, options.headers);
    }
  }
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(url, { ...options, headers });
  if (res.status === 401) {
    try {
      const { data } = await supabase.auth.refreshSession();
      if (data.session?.access_token) {
        localStorage.setItem("sb-token", data.session.access_token);
        document.cookie = `sb-token=${data.session.access_token}; path=/; max-age=86400; SameSite=Lax`;
        headers["Authorization"] = `Bearer ${data.session.access_token}`;
        const retry = await fetch(url, { ...options, headers });
        if (retry.ok) return retry;
      }
    } catch {
      // Network error during refresh — don't log out, just return the original 401
      return res;
    }
    // Refresh failed because session is truly expired
    localStorage.removeItem("sb-token");
    if (typeof window !== "undefined") {
      const returnUrl = encodeURIComponent(window.location.pathname + window.location.search);
      window.location.href = `/login?return=${returnUrl}`;
    }
  }
  return res;
}
