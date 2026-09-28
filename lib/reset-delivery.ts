/**
 * Deployment-owned delivery hook. Configure RESET_EMAIL_WEBHOOK_URL with a
 * trusted transactional-email worker in production; the application never
 * logs or returns the raw token outside local development.
 */
export async function deliverResetEmail(email: string, token: string) {
  const webhook = process.env.RESET_EMAIL_WEBHOOK_URL;
  if (!webhook) return false;
  try {
    const response = await fetch(webhook, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email, token, expiresInMinutes: 30 }) });
    return response.ok;
  } catch {
    return false;
  }
}
