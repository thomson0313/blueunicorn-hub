"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { RequiredLabel } from "@/components/RequiredLabel";
import { PasswordInput } from "@/components/PasswordInput";
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
  const [step, setStep] = useState<"credentials" | "2fa">("credentials");
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [pendingToken, setPendingToken] = useState("");
  const [totpCode, setTotpCode] = useState("");
  const [trustDevice, setTrustDevice] = useState(true);
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
          : reason === "session_expired"
            ? "Your session has expired. Please sign in again."
            : "";

  async function onSubmitCredentials(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          identifier,
          password,
          userAgent: navigator.userAgent,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Login failed");

      if (data.requires2fa) {
        setPendingToken(data.pendingToken);
        setStep("2fa");
        setInfo(data.message || "Enter your authenticator code.");
        return;
      }

      router.push(params.get("next") || "/dashboard");
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  async function onSubmit2fa(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login/2fa", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pendingToken,
          code: totpCode,
          trustDevice,
          userAgent: navigator.userAgent,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Verification failed");
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
          {step === "credentials" ? (
            <>
              <h2 className="text-xl font-bold text-slate-900">Sign in</h2>
              <p className="text-slate-500 text-sm mt-1 mb-6">Use your email or username to continue.</p>
              <form onSubmit={onSubmitCredentials} className="space-y-4">
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
                  <PasswordInput
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className={inputClass}
                    placeholder="Your password"
                    autoComplete="current-password"
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
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={() => {
                  setStep("credentials");
                  setTotpCode("");
                  setError("");
                  setInfo("");
                }}
                className="text-sm text-brand-600 hover:underline mb-4 cursor-pointer"
              >
                &larr; Back
              </button>
              <h2 className="text-xl font-bold text-slate-900">Two-factor authentication</h2>
              <p className="text-slate-500 text-sm mt-1 mb-6">
                Enter the 6-digit code from your authenticator app.
              </p>
              <form onSubmit={onSubmit2fa} className="space-y-4">
                <div>
                  <RequiredLabel>Authenticator code</RequiredLabel>
                  <input
                    type="text"
                    inputMode="numeric"
                    required
                    maxLength={6}
                    value={totpCode}
                    onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, ""))}
                    className={`${inputClass} text-center text-lg tracking-widest`}
                    placeholder="000000"
                    autoFocus
                  />
                </div>
                <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={trustDevice}
                    onChange={(e) => setTrustDevice(e.target.checked)}
                    className="rounded border-slate-300 text-brand-500 focus:ring-brand-500"
                  />
                  Trust this device
                </label>
                {info && (
                  <p className="text-sm text-brand-700 bg-brand-50 border border-brand-100 rounded-lg px-3 py-2">
                    {info}
                  </p>
                )}
                {error && <p className="text-sm text-red-600">{error}</p>}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-brand-500 hover:bg-brand-600 disabled:opacity-60 text-white font-semibold rounded-xl py-3 transition shadow-sm cursor-pointer"
                >
                  {loading ? "Verifying..." : "Continue"}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
