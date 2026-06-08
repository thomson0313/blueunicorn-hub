"use client";

import { useState } from "react";
import { useApp } from "@/components/AppProvider";
import { EmailVerificationBar } from "@/components/EmailVerificationBar";
import { EmailVerificationModal } from "@/components/EmailVerificationModal";
import { LockedPlatformSkeleton } from "@/components/skeleton/LockedPlatformSkeleton";

export function EmailVerificationGate({ children }: { children: React.ReactNode }) {
  const { user, emailVerified, userEmail, setEmailVerified } = useApp();
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <>
      {!emailVerified && <EmailVerificationBar onVerifyClick={() => setModalOpen(true)} />}

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
      />
    </>
  );
}
