import { AsyncLocalStorage } from "node:async_hooks";

// Next.js expects globalThis.AsyncLocalStorage to exist before it is imported.
// When running a custom server through tsx/node this global is not set up by
// Next's own bootstrap, so we provide it here. This module MUST be imported
// before "next".
const g = globalThis as unknown as { AsyncLocalStorage?: unknown };
if (!g.AsyncLocalStorage) {
  g.AsyncLocalStorage = AsyncLocalStorage;
}

export {};
