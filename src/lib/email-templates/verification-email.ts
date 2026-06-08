import { brandLogoUrl, buildBlunicornEmailShell, escapeHtml } from "./email-layout";

export { appOriginFromRequest, brandLogoUrl as verificationLogoUrl } from "./email-layout";

type VerificationEmailInput = {
  name: string;
  code: string;
  logoUrl: string;
};

export function buildVerificationEmail({ name, code, logoUrl }: VerificationEmailInput): {
  subject: string;
  text: string;
  html: string;
} {
  const subject = "Your Blunicorn verification code";
  const digits = code.split("");

  const text = [
    `Hi ${name},`,
    "",
    `Your Blunicorn email verification code is: ${code}`,
    "",
    "This code expires in 15 minutes.",
    "",
    "If you did not request this, you can ignore this email.",
  ].join("\n");

  const digitCells = digits
    .map(
      (d) =>
        `<td align="center" style="padding:0 4px;">
          <div style="width:44px;height:52px;line-height:52px;background:#f0f7ff;border:2px solid #3390ec;border-radius:10px;font-size:24px;font-weight:700;color:#1c6bb0;font-family:'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">${d}</div>
        </td>`
    )
    .join("");

  const bodyHtml = `
    <p style="margin:0 0 8px;font-size:16px;color:#0f172a;">Hi ${escapeHtml(name)},</p>
    <p style="margin:0 0 24px;font-size:15px;line-height:1.6;color:#475569;">
      Use the verification code below to confirm your email address and get started on Blunicorn.
    </p>
    <table role="presentation" cellspacing="0" cellpadding="0" style="margin:0 auto 24px;">
      <tr>${digitCells}</tr>
    </table>
    <p style="margin:0 0 8px;font-size:14px;color:#64748b;text-align:center;">
      This code expires in <strong style="color:#334155;">15 minutes</strong>.
    </p>
    <p style="margin:0;font-size:13px;color:#94a3b8;text-align:center;line-height:1.5;">
      If you did not request this, you can safely ignore this email.
    </p>`;

  const html = buildBlunicornEmailShell({
    logoUrl,
    subject,
    bodyHtml,
    footerLabel: "Email verification",
  });

  return { subject, text, html };
}
