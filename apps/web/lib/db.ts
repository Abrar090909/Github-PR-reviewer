import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL || "https://placeholder.supabase.co";
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "placeholder-service-key";
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder-anon-key";
const publicUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co";

/**
 * Server-side Supabase client with service role key.
 * Use for all server-side database operations.
 * NEVER expose to the browser.
 */
export const db = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false },
});

/**
 * Public Supabase client for browser use (anon key only).
 * Use for client components that need read-only data.
 */
export const publicDb = createClient(publicUrl, anonKey);

export default db;
