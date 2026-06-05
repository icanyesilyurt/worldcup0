const SUPABASE_URL = 'https://nylnzkycvpzyvraslznx.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_Wr9bXiQSkNExIDeaq13e9g_Rc-ftogP';

window.supabaseClient = null;

if (
  window.supabase &&
  SUPABASE_URL !== 'SUPABASE_URL' &&
  SUPABASE_ANON_KEY !== 'SUPABASE_ANON_KEY'
) {
  window.supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
}

