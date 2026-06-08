"use client";

import { useEffect } from "react";

/** Fallback when an authenticated page fails — send the user to login instead of a dead end. */
export default function AppError({ error }: { error: Error & { digest?: string } }) {
  useEffect(() => {
    const msg = error?.message?.toLowerCase() ?? "";
    const authRelated =
      msg.includes("unauthorized") ||
      msg.includes("session") ||
      msg.includes("cannot read properties of null");
    if (authRelated) {
      window.location.replace("/login");
    }
  }, [error]);

  return (
    <div className="min-h-[40vh] flex flex-col items-center justify-center px-4 text-center">
      <p className="text-slate-600 text-sm">Something went wrong loading this page.</p>
      <a href="/login" className="mt-3 text-brand-600 font-medium hover:underline">
        Go to sign in
      </a>
    </div>
  );
}
