import { ensureAdminSeed } from "./seed";
import { getSupabase } from "./supabase";

/** Validates Supabase config and seeds the built-in admin account. */
export async function connectDB(): Promise<void> {
  getSupabase();
  await ensureAdminSeed();
}
