"use client";

import { useEffect, useRef, useState } from "react";

type EmailVerificationModalProps = {
  open: boolean;
  email: string;
  onClose: () => void;
  onVerified: () => void;
};

export function EmailVerificationModal({
  open,
  email,
  onClose,
  onVerified,
}: EmailVerificationModalProps) {
  const [digits, setDigits] = useState<string[]>(Array(6).fill(""));
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [sending, setSending] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [codeSent, setCodeSent] = useState(false);
  const inputRefs = useRef<Array<HTMLInputElement | null>>([]);

  useEffect(() => {
    if (!open) {
      setDigits(Array(6).fill(""));
      setError("");
      setInfo("");
      setCodeSent(false);
      return;
    }
    void sendCode();
  }, [open]);

  async function sendCode() {
    setSending(true);
    setError("");
    try {
      const res = await fetch("/api/auth/email-verification/send", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not send verification code");
      if (data.verified) {
        onVerified();
        onClose();
        return;
      }
      setCodeSent(true);
      setInfo(data.message || `A code was sent to ${email}.`);
      if (data.devCode) {
        setInfo(`${data.message} (Dev code: ${data.devCode})`);
      }
      inputRefs.current[0]?.focus();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSending(false);
    }
  }

  function updateDigit(index: number, value: string) {
    const digit = value.replace(/\D/g, "").slice(-1);
    const next = [...digits];
    next[index] = digit;
    setDigits(next);
    setError("");
    if (digit && index < 5) inputRefs.current[index + 1]?.focus();
  }

  function onKeyDown(index: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Backspace" && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  }

  function onPaste(e: React.ClipboardEvent) {
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (!pasted) return;
    e.preventDefault();
    const next = Array(6).fill("");
    for (let i = 0; i < pasted.length; i++) next[i] = pasted[i];
    setDigits(next);
    const focusIndex = Math.min(pasted.length, 5);
    inputRefs.current[focusIndex]?.focus();
  }

  async function confirmCode(e: React.FormEvent) {
    e.preventDefault();
    const code = digits.join("");
    if (code.length !== 6) {
      setError("Enter all 6 digits.");
      return;
    }
    setConfirming(true);
    setError("");
    try {
      const res = await fetch("/api/auth/email-verification/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Verification failed");
      onVerified();
      onClose();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setConfirming(false);
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm"
        aria-label="Close"
        onClick={onClose}
      />
      <div className="relative w-full max-w-md rounded-2xl bg-white shadow-2xl p-6">
        <h2 className="text-xl font-bold text-slate-900">Verify your email</h2>
        <p className="text-sm text-slate-500 mt-1">
          Enter the 6-digit code sent to <span className="font-medium text-slate-700">{email}</span>.
        </p>

        <form onSubmit={confirmCode} className="mt-6 space-y-4">
          <div className="flex justify-center gap-2" onPaste={onPaste}>
            {digits.map((digit, index) => (
              <input
                key={index}
                ref={(el) => {
                  inputRefs.current[index] = el;
                }}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                disabled={!codeSent || sending || confirming}
                onChange={(e) => updateDigit(index, e.target.value)}
                onKeyDown={(e) => onKeyDown(index, e)}
                className="w-11 h-12 text-center text-lg font-semibold rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-brand-500"
                aria-label={`Digit ${index + 1}`}
              />
            ))}
          </div>

          {info && <p className="text-sm text-brand-700 bg-brand-50 border border-brand-100 rounded-lg px-3 py-2">{info}</p>}
          {error && <p className="text-sm text-red-600">{error}</p>}

          <button
            type="submit"
            disabled={!codeSent || sending || confirming}
            className="w-full bg-brand-500 hover:bg-brand-600 disabled:opacity-60 text-white font-semibold rounded-xl py-3 transition cursor-pointer"
          >
            {confirming ? "Verifying..." : "Confirm code"}
          </button>
        </form>

        <button
          type="button"
          onClick={() => void sendCode()}
          disabled={sending}
          className="mt-4 w-full text-sm text-brand-600 hover:underline disabled:opacity-60 cursor-pointer"
        >
          {sending ? "Sending..." : "Resend code"}
        </button>
      </div>
    </div>
  );
}
