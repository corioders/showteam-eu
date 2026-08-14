import { getPayload } from "payload";
import config from "@payload-config";

export async function isAdmin(request: Request): Promise<boolean> {
  const payload = await getPayload({ config });
  return Boolean((await payload.auth({ headers: request.headers })).user);
}

export function validSameOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  return !origin || origin === new URL(request.url).origin;
}
