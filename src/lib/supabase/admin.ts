import { createClient } from '@supabase/supabase-js'

// Admin client using service role key — server-side only
// This bypasses RLS and can manage auth users
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}
