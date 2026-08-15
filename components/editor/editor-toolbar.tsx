"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { CalendarDays, Eye, EyeOff, Images, LogOut, Settings2, UsersRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useEditor } from "@/components/editor/editor-provider";

const tools = [
  { href: "/a/kalendarz", label: "Kalendarz", icon: CalendarDays },
  { href: "/a/zgloszenia", label: "Zgłoszenia", icon: UsersRound },
  { href: "/galeria", label: "Galeria", icon: Images },
  { href: "/admin/zaawansowane", label: "Zaawansowane", icon: Settings2 },
] as const;

export function EditorToolbar() {
  const { enabled, user, visible, setVisible } = useEditor();
  const pathname = usePathname();
  const router = useRouter();

  if (!enabled) return null;

  async function logout() {
    await fetch("/api/users/logout", { method: "POST", credentials: "same-origin" });
    router.replace("/");
    router.refresh();
  }

  return (
    <aside className="editor-toolbar" aria-label="Narzędzia administratora">
      <div className="editor-toolbar__status">
        <span className="editor-toolbar__dot" aria-hidden="true" />
        <span>Edytujesz stronę</span>
      </div>
      <Button type="button" variant="ghost" size="sm" onClick={() => setVisible(!visible)}>
        {visible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
        <span className="hidden sm:inline">{visible ? "Ukryj przyciski" : "Pokaż przyciski"}</span>
      </Button>
      <Sheet>
        <SheetTrigger asChild><Button type="button" size="sm"><Settings2 className="size-4" /> Narzędzia</Button></SheetTrigger>
        <SheetContent className="sm:left-auto sm:w-[26rem]">
          <div className="flex h-full flex-col px-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] pt-[calc(4rem+env(safe-area-inset-top))]">
            <span className="eyebrow">Panel SHOWteam</span>
            <h2 className="mt-3 font-display text-4xl font-black uppercase">Co chcesz zrobić?</h2>
            <p className="mt-2 text-sm text-white/55">Wybierz narzędzie albo zamknij panel i edytuj bezpośrednio na stronie.</p>
            <nav className="mt-7 grid gap-2" aria-label="Narzędzia administratora">
              {tools.map(({ href, label, icon: Icon }) => <Link key={href} href={href} className={`flex min-h-14 items-center gap-3 border px-4 font-semibold transition-colors hover:border-orange-500 hover:bg-orange-500 hover:text-black ${pathname === href ? "border-orange-500 bg-orange-500 text-black" : "border-white/15"}`}><Icon className="size-5" />{label}</Link>)}
            </nav>
            <div className="mt-auto border-t border-white/10 pt-5">
              <p className="truncate text-xs text-white/45">Zalogowano: {user?.name || user?.email}</p>
              <Button type="button" variant="outline" className="mt-3 w-full" onClick={logout}><LogOut className="size-4" /> Wyloguj się</Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </aside>
  );
}
