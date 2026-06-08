export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function appOriginFromRequest(req?: Request): string {
  if (process.env.NEXT_PUBLIC_APP_URL) return process.env.NEXT_PUBLIC_APP_URL.replace(/\/$/, "");
  if (req) return new URL(req.url).origin;
  return "http://localhost:3000";
}

export function brandLogoUrl(origin: string): string {
  return `${origin.replace(/\/$/, "")}/blunicorn-logo.png`;
}

type BlunicornEmailShellInput = {
  logoUrl: string;
  subject: string;
  bodyHtml: string;
  footerLabel: string;
};

export function buildBlunicornEmailShell({
  logoUrl,
  subject,
  bodyHtml,
  footerLabel,
}: BlunicornEmailShellInput): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(subject)}</title>
</head>
<body style="margin:0;padding:0;background:#e8f2fc;font-family:'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#e8f2fc;padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:520px;">
          <tr>
            <td style="background:linear-gradient(135deg,#4aa9f0 0%,#3390ec 55%,#1c6bb0 100%);border-radius:16px 16px 0 0;padding:28px 24px;text-align:center;">
              <img src="${logoUrl}" alt="Blunicorn" width="64" height="64" style="display:block;margin:0 auto 12px;border-radius:12px;" />
              <div style="font-size:22px;font-weight:700;color:#ffffff;letter-spacing:-0.02em;">Blunicorn</div>
              <div style="font-size:13px;color:rgba(255,255,255,0.9);margin-top:4px;">Company Members Hub</div>
            </td>
          </tr>
          <tr>
            <td style="background:#ffffff;padding:32px 28px;border-left:1px solid #d2ecff;border-right:1px solid #d2ecff;">
              ${bodyHtml}
            </td>
          </tr>
          <tr>
            <td style="background:#f8fafc;border:1px solid #d2ecff;border-top:none;border-radius:0 0 16px 16px;padding:18px 24px;text-align:center;">
              <p style="margin:0;font-size:12px;color:#94a3b8;">&copy; Blunicorn &middot; ${escapeHtml(footerLabel)}</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}
