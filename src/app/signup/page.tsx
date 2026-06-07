"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { RequiredLabel } from "@/components/RequiredLabel";
import type { MemberField } from "@/lib/types";
import { APPROVAL_PENDING_LOGIN_MESSAGE } from "@/lib/user-approval";

export default function SignupPage() {
  const router = useRouter();
  const [fields, setFields] = useState<MemberField[]>([]);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [fieldId, setFieldId] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch("/api/fields")
      .then((r) => r.json())
      .then((d) => setFields(d.fields || []))
      .catch(() => {});
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess("");
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    if (!fieldId) {
      setError("Please select a field");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          email,
          username,
          password,
          confirmPassword,
          fieldId,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Signup failed");
      if (data.pending) {
        setSuccess(data.message || APPROVAL_PENDING_LOGIN_MESSAGE);
        return;
      }
      router.push("/dashboard");
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
    <div className="min-h-screen tg-auth-bg flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center mb-6">
          <Image src="/blunicorn-logo.png" alt="Blunicorn" width={72} height={72} priority style={{ height: "auto" }} />
          <h1 className="text-white text-2xl font-bold mt-4">Blunicorn</h1>
          <p className="text-brand-50/90 text-sm">Company Members Hub</p>
        </div>

        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <h2 className="text-xl font-bold text-slate-900">Create your account</h2>
          <p className="text-slate-500 text-sm mt-1 mb-6">Create your account to become a member of BlueUnicorn</p>
          <form onSubmit={onSubmit} className="space-y-4">
            <div>
              <RequiredLabel>Full name</RequiredLabel>
              <input type="text" required value={name} onChange={(e) => setName(e.target.value)} className={inputClass} placeholder="Jane Doe" />
            </div>
            <div>
              <RequiredLabel>Email</RequiredLabel>
              <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className={inputClass} placeholder="you@company.com" />
            </div>
            <div>
              <RequiredLabel>Username</RequiredLabel>
              <input
                type="text"
                required
                minLength={3}
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className={inputClass}
                placeholder="janedoe"
              />
            </div>
            <div>
              <RequiredLabel>Field</RequiredLabel>
              <select
                required
                value={fieldId}
                onChange={(e) => setFieldId(e.target.value)}
                className={inputClass}
              >
                <option value="">Select a field</option>
                {fields.map((f) => (
                  <option key={f._id} value={f._id}>
                    {f.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <RequiredLabel>Password</RequiredLabel>
              <input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={inputClass}
                placeholder="At least 6 characters"
              />
            </div>
            <div>
              <RequiredLabel>Confirm password</RequiredLabel>
              <input
                type="password"
                required
                minLength={6}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className={inputClass}
                placeholder="Re-enter your password"
              />
            </div>
            {success && (
              <p className="text-sm text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
                {success}
              </p>
            )}
            {error && <p className="text-sm text-red-600">{error}</p>}
            <button
              type="submit"
              disabled={loading || !!success}
              className="w-full bg-brand-500 hover:bg-brand-600 disabled:opacity-60 text-white font-semibold rounded-xl py-3 transition shadow-sm cursor-pointer"
            >
              {loading ? "Creating..." : "Create account"}
            </button>
          </form>
          <p className="text-sm text-slate-500 mt-6 text-center">
            Already have an account?{" "}
            <Link href="/login" className="text-brand-600 font-medium hover:underline">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
