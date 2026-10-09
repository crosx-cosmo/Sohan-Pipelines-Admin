import { createClient } from "@supabase/supabase-js";

// Public project URL and publishable key. Safe in the browser:
// every table is protected by row-level security that requires an admin login.
export const SUPABASE_URL = "https://jlfqodfdqkbunqfgffut.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_YFmgzG2dgPYxm-zCpQRUig_MSYh6T5O";

export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    storage: typeof window === "undefined" ? undefined : window.localStorage,
  },
});

export const BRAND_LOGO_URL =
  "https://jlfqodfdqkbunqfgffut.supabase.co/storage/v1/object/public/Plumbing%20Assets/IMG-20260911-WA0003.jpg";

export const AVATAR_BUCKET = "admin-avatars";
