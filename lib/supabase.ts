/**
 * Nécessaire - Supabase Client Placeholder
 *
 * NOTE: Phase 1 does not connect to Supabase.
 * Realtime and database connectivity will be integrated in Phase 2.
 */

export const isSupabaseConfigured = (): boolean => {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
};
