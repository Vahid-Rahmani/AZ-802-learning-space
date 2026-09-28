/**
 * Deployment-owned delivery hook. Configure RESET_EMAIL_WEBHOOK_URL with a
 * trusted transactional-email worker in production; the application never
 * logs or returns the raw token outside local development.
 */
export async function deliverResetEmail(email: string, token: string) {
  const webhook = process.env.RESET_EMAIL_WEBHOOK_URL;
  const resendKey = process.env.RESEND_API_KEY;
  const from = process.env.RESET_FROM_EMAIL;
  const resetUrl = `${process.env.APP_ORIGIN ?? ""}/?reset_token=${encodeURIComponent(token)}`;
  if (resendKey && from) {
    try {
      const response = await fetch("https://api.resend.com/emails", { method: "POST", headers: { "content-type": "application/json", authorization: `Bearer ${resendKey}` }, body: JSON.stringify({ from, to: [email], subject: "WinCraft password reset", text: `Use this one-time reset token within 30 minutes: ${token}\n\n${resetUrl}` }) });
      return response.ok;
    } catch { return false; }
  }
  if (!webhook) return false;
  try {
    const response = await fetch(webhook, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email, token, expiresInMinutes: 30 }) });
    return response.ok;
  } catch {
    return false;
  }
}
