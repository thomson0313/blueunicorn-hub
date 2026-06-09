"use client";

import { useState } from "react";
import { useApp } from "@/components/AppProvider";
import { EmailVerificationBar } from "@/components/EmailVerificationBar";
import { EmailVerificationModal } from "@/components/EmailVerificationModal";
import { TwoFactorPromptBar } from "@/components/TwoFactorPromptBar";
import { LockedPlatformSkeleton } from "@/components/skeleton/LockedPlatformSkeleton";

export function EmailVerificationGate({ children }: { children: React.ReactNode }) {
  const { user, emailVerified, totpEnabled, userEmail, setEmailVerified, setUserEmail } = useApp();
  const [modalOpen, setModalOpen] = useState(false);
  const [twoFactorBarDismissed, setTwoFactorBarDismissed] = useState(false);

  return (
    <>
      {!emailVerified && <EmailVerificationBar onVerifyClick={() => setModalOpen(true)} />}
      {emailVerified && !totpEnabled && (
        <TwoFactorPromptBar dismissed={twoFactorBarDismissed} onDismiss={() => setTwoFactorBarDismissed(true)} />
      )}

      {emailVerified ? (
        children
      ) : (
        <LockedPlatformSkeleton isAdmin={user.role === "admin"} />
      )}

      <EmailVerificationModal
        open={modalOpen}
        email={userEmail}
        onClose={() => setModalOpen(false)}
        onVerified={() => setEmailVerified(true)}
        onEmailChange={setUserEmail}
      />
    </>
  );
}
