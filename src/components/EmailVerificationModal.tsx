"use client";

import { useEffect, useRef, useState } from "react";

type EmailVerificationModalProps = {
  open: boolean;
  email: string;
  onClose: () => void;
  onVerified: () => void;
  onEmailChange: (email: string) => void;
};

export function EmailVerificationModal({
  open,
  email,
  onClose,
  onVerified,
  onEmailChange,
}: EmailVerificationModalProps) {
  const [digits, setDigits] = useState<string[]>(Array(6).fill(""));
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [success, setSuccess] = useState("");
  const [sending, setSending] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [codeSent, setCodeSent] = useState(false);
  const [showEmailForm, setShowEmailForm] = useState(false);
  const [newEmail, setNewEmail] = useState(email);
  const [updatingEmail, setUpdatingEmail] = useState(false);
  const [inputWarning, setInputWarning] = useState(false);
  const inputRefs = useRef<Array<HTMLInputElement | null>>([]);
  const openedRef = useRef(false);

  useEffect(() => {
    setNewEmail(email);
  }, [email]);

  useEffect(() => {
    if (!open) {
      openedRef.current = false;
      setDigits(Array(6).fill(""));
      setError("");
      setInfo("");
      setSuccess("");
      setCodeSent(false);
      setShowEmailForm(false);
      setInputWarning(false);
      return;
    }
    if (!openedRef.current) {
      openedRef.current = true;
      void sendCode();
    }
  }, [open]);

  async function sendCode() {
    setSending(true);
    setError("");
    setSuccess("");
    try {
      const res = await fetch("/api/auth/email-verification/send", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not send verification code");
      if (data.verified) {
        setSuccess("Your email is already verified.");
        onVerified();
        return;
      }
      setCodeSent(true);
      setInputWarning(true);
      setInfo(data.message || `A code was sent to ${email}.`);
      if (data.devCode) {
        setInfo(`${data.message} (Dev code: ${data.devCode})`);
      }
      inputRefs.current[0]?.focus();
    } catch (err) {
      setError((err as Error).message);
      setInputWarning(true);
    } finally {
      setSending(false);
    }
  }

  async function updateEmail(e: React.FormEvent) {
    e.preventDefault();
    setUpdatingEmail(true);
    setError("");
    setSuccess("");
    try {
      const res = await fetch("/api/auth/email-verification/email", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: newEmail.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not update email");

      onEmailChange(data.email || newEmail.trim().toLowerCase());
      setShowEmailForm(false);
      setDigits(Array(6).fill(""));
      setCodeSent(false);
      setInfo(data.message || "Email updated. Sending a new code...");
      setInputWarning(true);
      await sendCode();
    } catch (err) {
      setError((err as Error).message);
      setInputWarning(true);
    } finally {
      setUpdatingEmail(false);
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
      setInputWarning(true);
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
      setSuccess("Email verified successfully. You can close this window.");
      setInputWarning(false);
      onVerified();
    } catch (err) {
      setError((err as Error).message);
      setInputWarning(true);
    } finally {
      setConfirming(false);
    }
  }

  const digitInputClass = (hasError: boolean) =>
    `w-11 h-12 text-center text-lg font-semibold rounded-xl border focus:outline-none focus:ring-2 transition ${
      hasError
        ? "border-amber-500 bg-amber-50 focus:ring-amber-300 text-amber-950"
        : "border-slate-300 focus:ring-brand-500"
    }`;

  const emailInputClass = (hasError: boolean) =>
    `w-full rounded-xl border px-4 py-2.5 text-sm focus:outline-none focus:ring-2 transition ${
      hasError
        ? "border-amber-500 bg-amber-50 focus:ring-amber-300 text-amber-950"
        : "border-slate-300 focus:ring-brand-500"
    }`;

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" aria-hidden />
      <div className="relative w-full max-w-md rounded-2xl bg-white shadow-2xl p-6">
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 flex items-center justify-center cursor-pointer"
          aria-label="Close"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>

        <h2 className="text-xl font-bold text-slate-900 pr-8">Verify your email</h2>
        <p className="text-sm text-slate-500 mt-1">
          Enter the 6-digit code sent to{" "}
          <span className="font-medium text-slate-700">{email}</span>.
        </p>

        <p className="mt-4 text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
          Check your inbox and spam folder. The code expires in 15 minutes.
        </p>

        {showEmailForm ? (
          <form onSubmit={updateEmail} className="mt-4 space-y-3">
            <label className="block text-sm font-medium text-slate-700">New email address</label>
            <input
              type="email"
              required
              value={newEmail}
              onChange={(e) => {
                setNewEmail(e.target.value);
                setError("");
              }}
              className={emailInputClass(!!error)}
              placeholder="you@company.com"
            />
            {error && <p className="text-sm text-amber-700 font-medium">{error}</p>}
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={updatingEmail}
                className="flex-1 bg-brand-500 hover:bg-brand-600 disabled:opacity-60 text-white font-semibold rounded-xl py-2.5 transition cursor-pointer text-sm"
              >
                {updatingEmail ? "Updating..." : "Update & resend code"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowEmailForm(false);
                  setNewEmail(email);
                  setError("");
                }}
                className="px-4 text-sm text-slate-600 hover:underline cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </form>
        ) : (
          <button
            type="button"
            onClick={() => {
              setShowEmailForm(true);
              setNewEmail(email);
              setError("");
            }}
            className="mt-3 text-sm text-brand-600 hover:underline cursor-pointer"
          >
            Wrong email? Change it
          </button>
        )}

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
                disabled={!codeSent || sending || confirming || !!success}
                onChange={(e) => updateDigit(index, e.target.value)}
                onKeyDown={(e) => onKeyDown(index, e)}
                className={digitInputClass(!!error || inputWarning)}
                aria-label={`Digit ${index + 1}`}
              />
            ))}
          </div>

          {info && !success && (
            <p className="text-sm text-brand-700 bg-brand-50 border border-brand-100 rounded-lg px-3 py-2">
              {info}
            </p>
          )}
          {error && !showEmailForm && (
            <p className="text-sm text-amber-700 font-medium bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
              {error}
            </p>
          )}
          {success && (
            <p className="text-sm text-green-700 font-medium bg-green-50 border border-green-200 rounded-lg px-3 py-2">
              {success}
            </p>
          )}

          {!success && (
            <button
              type="submit"
              disabled={!codeSent || sending || confirming}
              className="w-full bg-brand-500 hover:bg-brand-600 disabled:opacity-60 text-white font-semibold rounded-xl py-3 transition cursor-pointer"
            >
              {confirming ? "Verifying..." : "Confirm code"}
            </button>
          )}
        </form>

        {!success && (
          <button
            type="button"
            onClick={() => void sendCode()}
            disabled={sending || showEmailForm}
            className="mt-4 w-full text-sm text-brand-600 hover:underline disabled:opacity-60 cursor-pointer"
          >
            {sending ? "Sending..." : "Resend code"}
          </button>
        )}
      </div>
    </div>
  );
}
