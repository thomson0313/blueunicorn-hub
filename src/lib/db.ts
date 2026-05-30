import { initStore } from "./store";

/**
 * Kept for API compatibility with the previous database layer. The app now uses
 * a local JSON file store (see store.ts / repo.ts), so this just makes sure the
 * data file exists. No external database server is required.
 */
export async function connectDB(): Promise<void> {
  initStore();
}
