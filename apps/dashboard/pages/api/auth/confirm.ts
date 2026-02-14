import { createSupabaseClient } from "@/util/supabase/component";
import type { NextApiRequest, NextApiResponse } from "next";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { token_hash, type } = req.query;

  if (token_hash && type) {
    const supabase = createSupabaseClient();
    const { error } = await supabase.auth.verifyOtp({
      type: type as any,
      token_hash: token_hash as string,
    });

    if (error) {
      return res.redirect("/auth/login?error=" + error.message);
    }
  }

  res.redirect("/");
}

