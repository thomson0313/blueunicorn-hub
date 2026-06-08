import { appOriginFromRequest, brandLogoUrl, buildBlunicornEmailShell, escapeHtml } from "./email-layout";

type PasswordResetEmailInput = {
  name: string;
  resetLink: string;
  logoUrl: string;
};

export { appOriginFromRequest, brandLogoUrl };

export function buildPasswordResetEmail({ name, resetLink, logoUrl }: PasswordResetEmailInput): {
  subject: string;
  text: string;
  html: string;
} {
  const subject = "Reset your Blunicorn password";

  const text = [
    `Hi ${name},`,
    "",
    "We received a request to reset your Blunicorn password.",
    "",
    `Reset your password using this link (expires in 1 hour):`,
    resetLink,
    "",
    "If you did not request this, you can ignore this email.",
  ].join("\n");

  const bodyHtml = `
    <p style="margin:0 0 8px;font-size:16px;color:#0f172a;">Hi ${escapeHtml(name)},</p>
    <p style="margin:0 0 24px;font-size:15px;line-height:1.6;color:#475569;">
      We received a request to reset your password. Click the button below to choose a new one.
    </p>
    <table role="presentation" cellspacing="0" cellpadding="0" style="margin:0 auto 24px;">
      <tr>
        <td align="center" style="border-radius:12px;background:#3390ec;">
          <a href="${escapeHtml(resetLink)}" style="display:inline-block;padding:14px 28px;font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:12px;">
            Reset password
          </a>
        </td>
      </tr>
    </table>
    <p style="margin:0 0 12px;font-size:13px;color:#64748b;line-height:1.5;text-align:center;">
      Or copy this link into your browser:<br />
      <a href="${escapeHtml(resetLink)}" style="color:#2481cc;word-break:break-all;">${escapeHtml(resetLink)}</a>
    </p>
    <p style="margin:0;font-size:14px;color:#64748b;text-align:center;">
      This link expires in <strong style="color:#334155;">1 hour</strong>.
    </p>
    <p style="margin:16px 0 0;font-size:13px;color:#94a3b8;text-align:center;line-height:1.5;">
      If you did not request this, you can safely ignore this email.
    </p>`;

  const html = buildBlunicornEmailShell({
    logoUrl,
    subject,
    bodyHtml,
    footerLabel: "Password reset",
  });

  return { subject, text, html };
}
