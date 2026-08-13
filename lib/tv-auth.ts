export const tvCookieName = "showteam_tv";
export const tvCookieMaxAge = 400 * 24 * 60 * 60;

function randomSecret(): string {
  return Buffer.from(crypto.getRandomValues(new Uint8Array(32))).toString("base64url");
}

export async function hashPairingSecret(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export async function createTvToken(database: D1Database, name: string): Promise<string> {
  const id = crypto.randomUUID();
  const secret = randomSecret();
  await database.prepare("INSERT INTO tv_devices (id, token_hash, name, created_at) VALUES (?, ?, ?, ?)")
    .bind(id, await hashPairingSecret(secret), name, Date.now()).run();
  return `${id}.${secret}`;
}

export async function verifyTvToken(database: D1Database, token: string | undefined): Promise<boolean> {
  if (!token) return false;
  const [id, secret, extra] = token.split(".");
  if (extra || !/^[0-9a-f-]{36}$/.test(id) || !/^[A-Za-z0-9_-]{43}$/.test(secret)) return false;
  const device = await database.prepare("SELECT token_hash FROM tv_devices WHERE id = ?").bind(id).first<{ token_hash: string }>();
  return Boolean(device && device.token_hash === await hashPairingSecret(secret));
}

export function tvCookie(token: string): string {
  return `${tvCookieName}=${token}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${tvCookieMaxAge}`;
}
