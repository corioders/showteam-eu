import { BarChart3, BedDouble, CalendarDays, ExternalLink, Monitor, PartyPopper, UsersRound } from "lucide-react";
import Link from "next/link";

import { EditorProvider } from "@/components/editor/editor-provider";
import { EditorToolbar } from "@/components/editor/editor-toolbar";
import { SiteHeader } from "@/components/site-header";

const tools = [
	{ href: "/a/kalendarz", label: "Kalendarz", icon: CalendarDays },
	{ href: "/a/zgloszenia", label: "Zgłoszenia", icon: UsersRound },
	{ href: "/a/imprezy", label: "Imprezy", icon: PartyPopper },
	{ href: "/a/noclegi", label: "Noclegi", icon: BedDouble },
	{ href: "/a/statystyki", label: "Statystyki", icon: BarChart3 },
	{ href: "/a/telewizory", label: "Telewizory", icon: Monitor },
] as const;

export function AdminWorkspace({ active, children }: { active: (typeof tools)[number]["href"]; children: React.ReactNode }) {
	return (
		<EditorProvider>
			<SiteHeader />
			<div className="admin-workspace min-h-dvh pt-20">
				<div className="border-white/10 border-b bg-neutral-950">
					<div className="site-container flex min-w-0 items-center gap-2 overflow-x-auto py-3">
						<Link
							href="/"
							className="mr-2 inline-flex min-h-10 shrink-0 items-center gap-2 border border-white/15 px-3 font-bold text-xs uppercase hover:border-orange-500"
						>
							<ExternalLink className="size-4" /> Strona
						</Link>
						{tools.map(({ href, label, icon: Icon }) => (
							<Link
								key={href}
								href={href}
								aria-current={active === href ? "page" : undefined}
								className="inline-flex min-h-10 shrink-0 items-center gap-2 border border-white/15 px-3 font-bold text-xs uppercase hover:border-orange-500 aria-[current=page]:border-orange-500 aria-[current=page]:bg-orange-500 aria-[current=page]:text-black"
							>
								<Icon className="size-4" />
								{label}
							</Link>
						))}
					</div>
				</div>
				<div className="admin-workspace__content">{children}</div>
			</div>
			<EditorToolbar />
		</EditorProvider>
	);
}
