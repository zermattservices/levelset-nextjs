import { createSupabaseClient } from "@/util/supabase/component";

export function getSupabaseClient() {
  return createSupabaseClient();
}

