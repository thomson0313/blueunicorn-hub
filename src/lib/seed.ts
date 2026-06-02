import { createUser, findUserByEmailOrUsername } from "./repo";
import { hashPassword } from "./auth";

const ADMIN_USERNAME = process.env.ADMIN_USERNAME || "BlueUnicorn";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "A@kwi1980410";
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "admin@blunicorn.app";
const ADMIN_NAME = process.env.ADMIN_NAME || "Blue Unicorn";

/**
 * Ensure the built-in Blunicorn admin account exists. Runs after DB connect.
 * Idempotent: if the admin already exists it is left untouched.
 */
export async function ensureAdminSeed(): Promise<void> {
  const existing = await findUserByEmailOrUsername(ADMIN_USERNAME);
  if (existing) return;

  const passwordHash = await hashPassword(ADMIN_PASSWORD);
  await createUser({
    name: ADMIN_NAME,
    username: ADMIN_USERNAME,
    email: ADMIN_EMAIL,
    passwordHash,
    role: "admin",
  });
  console.log(`[seed] Created admin account "${ADMIN_USERNAME}"`);
}
