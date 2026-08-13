import { SignJWT, jwtVerify } from "jose";

export const tvCookieName = "showteam_tv";
const secret = new TextEncoder().encode(process.env.PAYLOAD_SECRET || "local-showteam-development-secret-change-me");

export async function createTvToken(): Promise<string> {
  return new SignJWT({ scope: "tv-calendar" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(secret);
}

export async function verifyTvToken(token: string | undefined): Promise<boolean> {
  if (!token) return false;
  try {
    const { payload } = await jwtVerify(token, secret, { algorithms: ["HS256"] });
    return payload.scope === "tv-calendar";
  } catch { return false; }
}

export async function hashPairingSecret(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}
