const encoder = new TextEncoder();
const PASSWORD_ITERATIONS = 120_000;

function toBase64Url(bytes: Uint8Array) {
  let binary = "";
  bytes.forEach((byte) => { binary += String.fromCharCode(byte); });
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

export async function hashOpaqueToken(token: string) {
  const digest = await crypto.subtle.digest("SHA-256", encoder.encode(token));
  return toBase64Url(new Uint8Array(digest));
}

export async function hashPassword(password: string, salt = crypto.getRandomValues(new Uint8Array(16))) {
  const key = await crypto.subtle.importKey("raw", encoder.encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits({ name:"PBKDF2", salt, iterations:PASSWORD_ITERATIONS, hash:"SHA-256" }, key, 256);
  return `pbkdf2$${PASSWORD_ITERATIONS}$${toBase64Url(salt)}$${toBase64Url(new Uint8Array(bits))}`;
}

export async function verifyPassword(password: string, stored: string) {
  try {
    const [scheme, iterations, encodedSalt, encodedExpected] = stored.split("$");
    if (scheme !== "pbkdf2" || iterations !== String(PASSWORD_ITERATIONS) || !encodedSalt || !encodedExpected) return false;
    const actual = fromBase64Url((await hashPassword(password, fromBase64Url(encodedSalt))).split("$")[3]);
    const expected = fromBase64Url(encodedExpected);
    if (actual.length !== expected.length) return false;
    let difference = 0;
    for (let index = 0; index < actual.length; index += 1) difference |= actual[index] ^ expected[index];
    return difference === 0;
  } catch {
    return false;
  }
}

export async function signSession(userId: string, secret: string) {
  const payload = toBase64Url(encoder.encode(JSON.stringify({ userId, exp: Date.now() + 1000 * 60 * 60 * 24 * 30 })));
  const key = await crypto.subtle.importKey("raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(payload));
  return `${payload}.${toBase64Url(new Uint8Array(signature))}`;
}

function fromBase64Url(value: string) {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(value.length / 4) * 4, "=");
  const binary = atob(normalized);
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

export async function verifySession(token: string | undefined, secret: string) {
  try {
    if (!token) return null;
    const [payload, encodedSignature] = token.split(".");
    if (!payload || !encodedSignature) return null;
    const key = await crypto.subtle.importKey("raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["verify"]);
    const valid = await crypto.subtle.verify("HMAC", key, fromBase64Url(encodedSignature), encoder.encode(payload));
    if (!valid) return null;
    const parsed = JSON.parse(new TextDecoder().decode(fromBase64Url(payload))) as { userId?: string; exp?: number };
    return parsed.userId && parsed.exp && parsed.exp > Date.now() ? parsed.userId : null;
  } catch { return null; }
}
