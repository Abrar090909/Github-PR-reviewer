import "server-only"; // prevents service-role key from leaking into client bundles
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL || "https://placeholder.supabase.co";
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "placeholder-service-key";

/**
 * Server-side Supabase client with service role key.
 * Use for all server-side database operations.
 * NEVER expose to the browser.
 */
export const db = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false },
});

export default db;
