const DEVELOPMENT_SESSION_SECRET = "local-development-session-secret";

export function sessionSecret() {
  const configured = process.env.SESSION_SECRET?.trim();
  if (configured && configured.length >= 32) return configured;
  return process.env.NODE_ENV === "production" ? null : DEVELOPMENT_SESSION_SECRET;
}

export function googleOAuthConfig(requestUrl: string) {
  const clientId = process.env.GOOGLE_CLIENT_ID?.trim();
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET?.trim();
  const configuredRedirect = process.env.GOOGLE_REDIRECT_URI?.trim();
  if (!clientId || !clientSecret || !configuredRedirect) return null;
  try {
    const redirect = new URL(configuredRedirect);
    const request = new URL(requestUrl);
    if (redirect.origin !== request.origin || redirect.pathname !== "/api/auth/google/callback" || redirect.search || redirect.hash) return null;
    if (process.env.NODE_ENV === "production" && redirect.protocol !== "https:") return null;
    return { clientId, clientSecret, redirectUri: redirect.toString() };
  } catch {
    return null;
  }
}
