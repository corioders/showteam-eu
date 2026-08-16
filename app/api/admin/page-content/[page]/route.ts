import { NextResponse } from "next/server";
import { getPayload } from "payload";
import config from "@payload-config";
import { validSameOrigin } from "@/lib/admin-auth";
import { isPageContentName, parsePageContent } from "@/lib/page-content-schema";

export async function PUT(request: Request, { params }: { params: Promise<{ page: string }> }) {
  if (!validSameOrigin(request)) return NextResponse.json({ message: "Ta operacja została zablokowana. Odśwież stronę i spróbuj ponownie." }, { status: 403 });
  const payload = await getPayload({ config });
  const { user } = await payload.auth({ headers: request.headers });
  if (!user) return NextResponse.json({ message: "Sesja wygasła. Zaloguj się ponownie w /admin." }, { status: 401 });
  const { page } = await params;
  if (!isPageContentName(page)) return NextResponse.json({ message: "Nieznana strona." }, { status: 404 });
  const parsed = parsePageContent(page, await request.json().catch(() => null));
  if (!parsed.data) return NextResponse.json({ message: "Sprawdź zaznaczone informacje.", errors: parsed.errors }, { status: 400 });

  try {
    const existing = await payload.find({ collection: "page-content", where: { page: { equals: page } }, limit: 1, depth: 0, overrideAccess: false, user });
    if (existing.docs[0]) await payload.update({ collection: "page-content", id: existing.docs[0].id, data: { content: parsed.data }, overrideAccess: false, user });
    else await payload.create({ collection: "page-content", data: { page, content: parsed.data }, overrideAccess: false, user });
    return NextResponse.json({ message: "Zmiany są już widoczne na stronie." });
  } catch (error) {
    payload.logger.error({ err: error, msg: "Inline page content update failed" });
    return NextResponse.json({ message: "Nie udało się zapisać zmian. Treść nadal jest w formularzu." }, { status: 500 });
  }
}
