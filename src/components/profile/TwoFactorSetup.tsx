"use client";

import { useEffect, useState } from "react";
import { useApp } from "@/components/AppProvider";
import { ActionButton } from "@/components/ActionButton";

type SetupData = {
  secret: string;
  otpauthUri: string;
  qrCodeUrl: string;
};

export function TwoFactorSetup() {
  const { setTotpEnabled } = useApp();
  const [enabled, setEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [setup, setSetup] = useState<SetupData | null>(null);
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [busy, setBusy] = useState(false);

  async function loadStatus() {
    const res = await fetch("/api/auth/2fa/status");
    const data = await res.json();
    if (res.ok) {
      setEnabled(!!data.enabled);
      if (data.enabled) setTotpEnabled(true);
    }
    setLoading(false);
  }

  useEffect(() => {
    void loadStatus();
  }, []);

  async function startSetup() {
    setBusy(true);
    setError("");
    setSuccess("");
    try {
      const res = await fetch("/api/auth/2fa/setup", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not start setup");
      setSetup(data);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function confirmSetup(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/auth/2fa/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Invalid code");
      setEnabled(true);
      setTotpEnabled(true);
      setSetup(null);
      setCode("");
      setSuccess(data.message || "Two-factor authentication enabled.");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 animate-pulse h-32" />
    );
  }

  if (enabled) {
    return (
      <section id="two-factor" className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 scroll-mt-24">
        <h2 className="font-semibold text-slate-900">Two-factor authentication</h2>
        <p className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2 mt-3">
          2FA is enabled with your authenticator app. You will be asked for a code when signing in from a new device.
        </p>
      </section>
    );
  }

  return (
    <section id="two-factor" className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4 scroll-mt-24">
      <div>
        <h2 className="font-semibold text-slate-900">Two-factor authentication</h2>
        <p className="text-sm text-slate-500 mt-1">
          Add an extra layer of security using Google Authenticator or any TOTP app.
        </p>
      </div>

      {!setup ? (
        <ActionButton type="button" onClick={() => void startSetup()} loading={busy} loadingText="Preparing...">
          Set up authenticator app
        </ActionButton>
      ) : (
        <div className="space-y-4">
          <ol className="text-sm text-slate-600 space-y-2 list-decimal list-inside">
            <li>Install Google Authenticator (or similar) on your phone.</li>
            <li>Scan the QR code below or enter the secret manually.</li>
            <li>Enter the 6-digit code to confirm.</li>
          </ol>
          <div className="flex flex-col sm:flex-row gap-4 items-start">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={setup.qrCodeUrl} alt="Authenticator QR code" width={200} height={200} className="rounded-xl border border-slate-200" />
            <div className="text-xs text-slate-500 break-all bg-slate-50 border border-slate-200 rounded-lg p-3 flex-1">
              <p className="font-medium text-slate-700 mb-1">Manual entry key</p>
              <code className="text-slate-800">{setup.secret}</code>
            </div>
          </div>
          <form onSubmit={confirmSetup} className="space-y-3 max-w-xs">
            <label className="block text-sm font-medium text-slate-700">Authenticator code</label>
            <input
              type="text"
              inputMode="numeric"
              maxLength={6}
              required
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
              className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-center text-lg tracking-widest focus:outline-none focus:ring-2 focus:ring-brand-500"
              placeholder="000000"
            />
            <ActionButton type="submit" loading={busy} loadingText="Verifying...">
              Enable 2FA
            </ActionButton>
          </form>
        </div>
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}
      {success && <p className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2">{success}</p>}
    </section>
  );
}
