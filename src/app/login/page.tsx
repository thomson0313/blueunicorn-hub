"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { RequiredLabel } from "@/components/RequiredLabel";
import {
  APPROVAL_PENDING_LOGIN_MESSAGE,
  APPROVAL_REJECTED_LOGIN_MESSAGE,
} from "@/lib/user-approval";

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [loading, setLoading] = useState(false);

  const reason = params.get("reason");
  const reasonMessage =
    reason === "pending"
      ? APPROVAL_PENDING_LOGIN_MESSAGE
      : reason === "rejected"
        ? APPROVAL_REJECTED_LOGIN_MESSAGE
        : reason === "deleted"
          ? "Your account no longer exists. Please contact an admin."
          : "";

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Login failed");
      router.push(params.get("next") || "/dashboard");
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  const inputClass =
    "w-full rounded-xl border border-slate-300 px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent";

  return (
    <div className="min-h-screen tg-auth-bg flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center mb-6">
          <Image src="/blunicorn-logo.png" alt="Blunicorn" width={72} height={72} priority style={{ height: "auto" }} />
          <h1 className="text-white text-2xl font-bold mt-4">Blunicorn</h1>
          <p className="text-brand-50/90 text-sm">Company Members Hub</p>
        </div>

        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <h2 className="text-xl font-bold text-slate-900">Sign in</h2>
          <p className="text-slate-500 text-sm mt-1 mb-6">Use your email or username to continue.</p>
          <form onSubmit={onSubmit} className="space-y-4">
            <div>
              <RequiredLabel>Email or username</RequiredLabel>
              <input
                type="text"
                required
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                className={inputClass}
                placeholder="you@company.com or BlueUnicorn"
              />
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <RequiredLabel>Password</RequiredLabel>
                <Link href="/forgot-password" className="text-sm text-brand-600 hover:underline font-medium">
                  Forgot password?
                </Link>
              </div>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={inputClass}
                placeholder="Your password"
              />
            </div>
            {(reasonMessage || info) && (
              <p className="text-sm text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
                {reasonMessage || info}
              </p>
            )}
            {error && <p className="text-sm text-red-600">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-brand-500 hover:bg-brand-600 disabled:opacity-60 text-white font-semibold rounded-xl py-3 transition shadow-sm cursor-pointer"
            >
              {loading ? "Signing in..." : "Sign in"}
            </button>
          </form>
          <p className="text-sm text-slate-500 mt-6 text-center">
            No account?{" "}
            <Link href="/signup" className="text-brand-600 font-medium hover:underline">
              Create one
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
