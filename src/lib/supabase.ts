import { createBrowserClient as _createBrowserClient } from '@supabase/ssr'
import type { Database } from './database.types'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

/**
 * Browser client — use in Client Components ("use client").
 * Call once per component; do NOT recreate inside hooks on every render.
 */
export function createBrowserClient() {
  return _createBrowserClient<Database>(supabaseUrl, supabaseAnonKey)
}
