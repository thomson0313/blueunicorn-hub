import { buildBlunicornEmailShell, escapeHtml } from "./email-layout";

type NewLoginEmailInput = {
  name: string;
  deviceLabel: string;
  browser: string;
  os: string;
  ip: string;
  country: string;
  logoUrl: string;
  loginTime: string;
};

export function buildNewLoginEmail({
  name,
  deviceLabel,
  browser,
  os,
  ip,
  country,
  logoUrl,
  loginTime,
}: NewLoginEmailInput): { subject: string; text: string; html: string } {
  const subject = "New sign-in to your Blunicorn account";

  const text = [
    `Hi ${name},`,
    "",
    "We detected a new sign-in to your Blunicorn account.",
    "",
    `Device: ${deviceLabel}`,
    `Browser: ${browser}`,
    `OS: ${os}`,
    `IP address: ${ip}`,
    `Country: ${country}`,
    `Time: ${loginTime}`,
    "",
    "If this was you, no action is needed.",
    "If you do not recognize this activity, change your password immediately.",
  ].join("\n");

  const bodyHtml = `
    <p style="margin:0 0 8px;font-size:16px;color:#0f172a;">Hi ${escapeHtml(name)},</p>
    <p style="margin:0 0 20px;font-size:15px;line-height:1.6;color:#475569;">
      We detected a new sign-in to your Blunicorn account from a device we haven&apos;t seen before.
    </p>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:0 0 20px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;">
      <tr>
        <td style="padding:16px 18px;">
          <p style="margin:0 0 10px;font-size:13px;color:#64748b;font-weight:600;text-transform:uppercase;letter-spacing:0.04em;">Sign-in details</p>
          <p style="margin:0 0 6px;font-size:14px;color:#334155;"><strong>Device:</strong> ${escapeHtml(deviceLabel)}</p>
          <p style="margin:0 0 6px;font-size:14px;color:#334155;"><strong>Browser:</strong> ${escapeHtml(browser)}</p>
          <p style="margin:0 0 6px;font-size:14px;color:#334155;"><strong>OS:</strong> ${escapeHtml(os)}</p>
          <p style="margin:0 0 6px;font-size:14px;color:#334155;"><strong>IP address:</strong> ${escapeHtml(ip)}</p>
          <p style="margin:0 0 6px;font-size:14px;color:#334155;"><strong>Country:</strong> ${escapeHtml(country)}</p>
          <p style="margin:0;font-size:14px;color:#334155;"><strong>Time:</strong> ${escapeHtml(loginTime)}</p>
        </td>
      </tr>
    </table>
    <p style="margin:0;font-size:13px;color:#94a3b8;line-height:1.5;">
      If this was you, no action is needed. If you do not recognize this activity, change your password immediately.
    </p>`;

  const html = buildBlunicornEmailShell({
    logoUrl,
    subject,
    bodyHtml,
    footerLabel: "Security alert",
  });

  return { subject, text, html };
}
