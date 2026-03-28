// Supabase client — auth and database access.
// Related: src/auth.js, src/stats.js
// Uses the publishable anon key — safe to expose in frontend code. RLS enforces data security.

import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

const SUPABASE_URL = 'https://akhizydlqrfeeevwyflp.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_964QZxNkLOeIOB7bvQezbQ_voyHo1Pc';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
