import type { Role } from "@/lib/repo";

export type ApprovalStatus = "pending" | "accepted" | "rejected";

export const APPROVAL_PENDING_LOGIN_MESSAGE =
  "Please wait until an admin accept your registeration";

export const APPROVAL_REJECTED_LOGIN_MESSAGE =
  "Your account access has been denied. Please contact an admin.";

export function defaultApprovalForRole(role: Role, isFirstUser = false): ApprovalStatus {
  if (role === "admin" || isFirstUser) return "accepted";
  return "pending";
}

export function canMemberAccessPlatform(approvalStatus: ApprovalStatus): boolean {
  return approvalStatus === "accepted";
}

export function loginBlockMessage(approvalStatus: ApprovalStatus): string {
  if (approvalStatus === "pending") return APPROVAL_PENDING_LOGIN_MESSAGE;
  return APPROVAL_REJECTED_LOGIN_MESSAGE;
}

export const APPROVAL_LABELS: Record<ApprovalStatus, string> = {
  pending: "Pending",
  accepted: "Accepted",
  rejected: "Rejected",
};
