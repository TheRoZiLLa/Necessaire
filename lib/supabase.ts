import { createClient, SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

let clientInstance: SupabaseClient | null = null;

export function normalizeSupabaseUrl(rawUrl?: string): string {
  if (!rawUrl) return "";
  let cleaned = rawUrl.trim();

  // If user pasted dashboard URL: https://supabase.com/dashboard/project/<ref>
  const dashboardMatch = cleaned.match(/supabase\.com\/dashboard\/project\/([a-z0-9_-]+)/i);
  if (dashboardMatch && dashboardMatch[1]) {
    return `https://${dashboardMatch[1]}.supabase.co`;
  }

  // Remove trailing slashes and common API endpoint suffixes
  cleaned = cleaned
    .replace(/\/rest\/v1\/?$/i, "")
    .replace(/\/auth\/v1\/?$/i, "")
    .replace(/\/+$/, "");

  return cleaned;
}

export const isSupabaseConfigured = (): boolean => {
  const url = normalizeSupabaseUrl(process.env.NEXT_PUBLIC_SUPABASE_URL);
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  return Boolean(
    url &&
    key &&
    url.startsWith("http") &&
    !url.includes("your-project")
  );
};

export const getSupabaseClient = (): SupabaseClient | null => {
  if (!isSupabaseConfigured()) {
    return null;
  }
  const url = normalizeSupabaseUrl(process.env.NEXT_PUBLIC_SUPABASE_URL);
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!.trim();
  if (!clientInstance) {
    clientInstance = createClient(url, key);
  }
  return clientInstance;
};
