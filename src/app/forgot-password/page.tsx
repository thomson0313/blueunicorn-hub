"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { RequiredLabel } from "@/components/RequiredLabel";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [resetLink, setResetLink] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setMessage("");
    setResetLink("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Request failed");
      setMessage(data.message);
      if (data.resetLink) setResetLink(data.resetLink);
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
        </div>

        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <h2 className="text-xl font-bold text-slate-900">Forgot password</h2>
          <p className="text-slate-500 text-sm mt-1 mb-6">
            Enter the email on your account and we&apos;ll help you reset your password.
          </p>
          <form onSubmit={onSubmit} className="space-y-4">
            <div>
              <RequiredLabel>Email</RequiredLabel>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={inputClass}
                placeholder="you@company.com"
              />
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            {message && (
              <p className="text-sm text-brand-700 bg-brand-50 border border-brand-100 rounded-lg px-3 py-2">
                {message}
              </p>
            )}
            {resetLink && (
              <p className="text-xs text-slate-600 break-all bg-slate-50 p-3 rounded-lg border border-slate-200">
                Dev reset link:{" "}
                <a href={resetLink} className="text-brand-600 hover:underline">
                  {resetLink}
                </a>
              </p>
            )}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-brand-500 hover:bg-brand-600 disabled:opacity-60 text-white font-semibold rounded-xl py-3 transition"
            >
              {loading ? "Sending..." : "Send reset link"}
            </button>
          </form>
          <p className="text-sm text-slate-500 mt-6 text-center">
            <Link href="/login" className="text-brand-600 font-medium hover:underline">
              Back to sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
