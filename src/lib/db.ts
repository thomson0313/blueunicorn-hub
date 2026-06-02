import { ensureAdminSeed } from "./seed";
import { ensureDefaultMemberFields } from "./repo";
import { getSupabase } from "./supabase";

/** Validates Supabase config and seeds the built-in admin account. */
export async function connectDB(): Promise<void> {
  getSupabase();
  await ensureDefaultMemberFields();
  await ensureAdminSeed();
}
