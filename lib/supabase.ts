import { createClient } from "@supabase/supabase-js"

/**
 * All browser-side access MUST use the public “anon” key.
 * Make sure you copied it from:
 *   Supabase Dashboard → Settings → API → Project API keys → anon public
 */
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ""
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ""

/* ----️ Safety checks ----------------------------------------------------- */
const looksLikeDbUrl = supabaseKey.startsWith("postgres://") || supabaseKey.includes("@")
if (!supabaseUrl || !supabaseKey) {
  throw new Error(
    "Supabase keys are missing. Add NEXT_PUBLIC_SUPABASE_URL & NEXT_PUBLIC_SUPABASE_ANON_KEY to .env.local",
  )
}
if (looksLikeDbUrl) {
  throw new Error(
    "It looks like you pasted the DATABASE URL instead of the anon public key. " +
      "Copy the anon key from Supabase → Settings → API.",
  )
}
/* ----------------------------------------------------------------------- */

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false }, // no auth yet – simpler errors
})
