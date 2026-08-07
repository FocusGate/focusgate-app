// config.js — same Supabase project the FocusGate web dashboard talks to (values copied
// from the web app's NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY). The anon
// key is a public, RLS-protected key — it's already shipped in the web app's browser
// bundle, so embedding it here doesn't expose anything new. It only ever identifies the
// *project*; every request is still scoped to the signed-in user via Postgres RLS
// policies (`auth.uid() = user_id`) once a personal access token is attached.

export const SUPABASE_URL = "https://itdwtkvnlztwomalawpy.supabase.co";
export const SUPABASE_ANON_KEY = "sb_publishable_EryQfUihnddzqM4FkZ8hSQ_nMPDIxpc";
