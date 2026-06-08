type SendEmailInput = {
  to: string;
  subject: string;
  text: string;
  html?: string;
};

/** Sends an email via Resend when configured; otherwise logs to the server console. */
export async function sendEmail({ to, subject, text, html }: SendEmailInput): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM || "Blunicorn <onboarding@resend.dev>";

  if (apiKey) {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [to],
        subject,
        text,
        html: html ?? text.replace(/\n/g, "<br>"),
      }),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new Error(`Email delivery failed (${res.status}): ${body}`);
    }
    return;
  }

  console.log(`[email] To: ${to}\nSubject: ${subject}\n\n${text}`);
}
